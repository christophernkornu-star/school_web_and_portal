import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { 
      attemptId, 
      answers, 
      questions, 
      quizId,
      finalStatus = 'submitted' 
    } = await request.json()

    // 1. Validate Session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!attemptId) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // 2. Fetch True Quiz Data (Security Fix)
    // Don't trust client-provided questions or quizId. Fetch from attempt -> quiz -> questions
    const { data: attemptData, error: attemptError } = await supabase
        .from('student_quiz_attempts')
        .select('quiz_id')
        .eq('id', attemptId)
        .single()

    if (attemptError || !attemptData) {
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    const { data: dbQuestions, error: qError } = await supabase
        .from('quiz_questions')
        .select(`
            id,
            question_type,
            points,
            quiz_options (
                id,
                is_correct
            )
        `)
        .eq('quiz_id', attemptData.quiz_id)

    if (qError || !dbQuestions) {
        throw new Error('Failed to retrieve quiz questions')
    }

    // 3. Prepare Answers & Grade
    let totalScore = 0
    const answerInserts = []

    // Map through DB questions to ensure we grade what is on the server
    for (const q of dbQuestions) {
        const studentAns = answers[q.id]
        let isCorrect = false
        let pointsAwarded = 0

        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
            if (studentAns?.optionId) {
                // Verify against DB options (o.is_correct is boolean)
                // @ts-ignore
                const matchingOption = q.quiz_options?.find(o => o.id === studentAns.optionId)
                
                if (matchingOption && matchingOption.is_correct) {
                    isCorrect = true
                    pointsAwarded = q.points
                    totalScore += q.points
                }
            }
        }

        answerInserts.push({
            attempt_id: attemptId,
            question_id: q.id,
            selected_option_id: studentAns?.optionId || null,
            text_answer: studentAns?.text || null,
            is_correct: isCorrect,
            points_awarded: pointsAwarded
        })
    }

    // 4. Insert Answers
    // Delete previous answers for this attempt (Safe for re-submissions)
    await supabase.from('student_quiz_answers').delete().eq('attempt_id', attemptId)
    
    const { error: ansError } = await supabase
        .from('student_quiz_answers')
        .insert(answerInserts)
    
    if (ansError) throw ansError

    // 5. Update Attempt Status
    // Determine strict status: if short answers exist, force submitted, else graded.
    const hasManualGrading = dbQuestions.some((q: any) => q.question_type === 'short_answer')
    const realStatus = hasManualGrading ? 'submitted' : 'graded'

    const { error: updateError } = await supabase
        .from('student_quiz_attempts')
        .update({
            score: totalScore,
            status: realStatus,
            end_time: new Date().toISOString()
        })
        .eq('id', attemptId)

    if (updateError) throw updateError

    // 6. Trigger Sync if Graded
    if (realStatus === 'graded') {
        await supabase.rpc('sync_scores_to_gradebook', { p_quiz_id: attemptData.quiz_id })
    }

    return NextResponse.json({ success: true, status: realStatus, score: totalScore })

  } catch (error: any) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
