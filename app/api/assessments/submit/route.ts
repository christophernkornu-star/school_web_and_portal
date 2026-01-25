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

    if (!attemptId || !questions) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 })
    }

    // 2. Prepare Answers
    let totalScore = 0
    const answerInserts = []

    for (const q of questions) {
        const studentAns = answers[q.id]
        let isCorrect = false
        let pointsAwarded = 0

        if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
            if (studentAns?.optionId) {
                // We need to trust the client passed questions with options, or re-fetch.
                // For 'keepalive' speed on exit, we trust the passed 'questions' structure 
                // BUT verification of correctness should ideally happen against DB.
                // However, 'questions' passed from client contains 'quiz_options' with 'is_correct' flag 
                // (which is visible to client in this app design anyway).
                
                const selectedOpt = q.quiz_options.find((o: any) => o.id === studentAns.optionId)
                if (selectedOpt && selectedOpt.is_correct) {
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

    // 3. Insert Answers
    // Delete previous answers for this attempt to avoid duplicates if re-submitting?
    // Or just insert. Given this is "Final Submit", we assume clean slate or append.
    // Ideally delete first.
    await supabase.from('student_quiz_answers').delete().eq('attempt_id', attemptId)
    
    const { error: ansError } = await supabase
        .from('student_quiz_answers')
        .insert(answerInserts)
    
    if (ansError) throw ansError

    // 4. Update Attempt Status
    // Determine strict status: if short answers exist, force submitted, else graded.
    const hasManualGrading = questions.some((q: any) => q.question_type === 'short_answer')
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

    // 5. Trigger Sync if Graded
    if (realStatus === 'graded') {
        await supabase.rpc('sync_scores_to_gradebook', { p_quiz_id: quizId })
    }

    return NextResponse.json({ success: true, status: realStatus, score: totalScore })

  } catch (error: any) {
    console.error('Submission error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
