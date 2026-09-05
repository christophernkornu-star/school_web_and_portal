'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/components/ui/back-button'
import { CheckCircle2, XCircle, Save, MessageSquareText } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface OptionRow {
  id: string
  option_text: string
  is_correct: boolean
}

interface QuestionRow {
  id: string
  question_text: string
  question_type: 'multiple_choice' | 'true_false' | 'short_answer'
  points: number
  position: number
  quiz_options: OptionRow[]
}

interface AnswerRow {
  id: string
  question_id: string
  selected_option_id: string | null
  text_answer: string | null
  is_correct: boolean
  points_awarded: number
}

export default function GradeAttemptPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const quizId = params.id as string
  const attemptId = params.attemptId as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quiz, setQuiz] = useState<any>(null)
  const [attempt, setAttempt] = useState<any>(null)
  const [questions, setQuestions] = useState<QuestionRow[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerRow>>({})

  // Editable points, keyed by question_id, for short_answer questions only
  const [manualPoints, setManualPoints] = useState<Record<string, number>>({})

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)

        const { data: quizData, error: quizError } = await supabase
          .from('online_quizzes')
          .select('*, classes(name), subjects(name)')
          .eq('id', quizId)
          .single()
        if (quizError) throw quizError
        setQuiz(quizData)

        const { data: attemptData, error: attemptError } = await supabase
          .from('student_quiz_attempts')
          .select('*, students(first_name, last_name, middle_name)')
          .eq('id', attemptId)
          .single()
        if (attemptError) throw attemptError
        setAttempt(attemptData)

        const { data: questionData, error: questionError } = await supabase
          .from('quiz_questions')
          .select('id, question_text, question_type, points, position, quiz_options(id, option_text, is_correct)')
          .eq('quiz_id', quizId)
          .order('position', { ascending: true })
        if (questionError) throw questionError
        setQuestions(questionData || [])

        const { data: answerData, error: answerError } = await supabase
          .from('student_quiz_answers')
          .select('*')
          .eq('attempt_id', attemptId)
        if (answerError) throw answerError

        const answerMap: Record<string, AnswerRow> = {}
        const initialManual: Record<string, number> = {}
        ;(answerData || []).forEach((a: AnswerRow) => {
          answerMap[a.question_id] = a
        })
        ;(questionData || []).forEach((q: QuestionRow) => {
          if (q.question_type === 'short_answer') {
            initialManual[q.id] = answerMap[q.id]?.points_awarded ?? 0
          }
        })
        setAnswers(answerMap)
        setManualPoints(initialManual)

      } catch (error: any) {
        console.error('Error loading attempt:', error)
        toast.error('Failed to load attempt for grading')
      } finally {
        setLoading(false)
      }
    }

    if (quizId && attemptId) loadData()
  }, [quizId, attemptId])

  const handlePointsChange = (questionId: string, value: string, maxPoints: number) => {
    const num = parseInt(value)
    if (value === '') {
      setManualPoints(prev => ({ ...prev, [questionId]: 0 }))
      return
    }
    if (isNaN(num)) return
    const clamped = Math.max(0, Math.min(num, maxPoints))
    setManualPoints(prev => ({ ...prev, [questionId]: clamped }))
  }

  // Running total across auto-graded MCQ/TF answers + the editable short-answer points
  const runningTotal = questions.reduce((sum, q) => {
    if (q.question_type === 'short_answer') {
      return sum + (manualPoints[q.id] ?? 0)
    }
    return sum + (answers[q.id]?.points_awarded ?? 0)
  }, 0)

  const shortAnswerQuestions = questions.filter(q => q.question_type === 'short_answer')

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Persist each short-answer's points + correctness
      for (const q of shortAnswerQuestions) {
        const awarded = manualPoints[q.id] ?? 0
        const existingAnswer = answers[q.id]
        if (!existingAnswer) continue // student never answered this one

        const { error } = await supabase
          .from('student_quiz_answers')
          .update({
            points_awarded: awarded,
            is_correct: awarded >= q.points && q.points > 0
          })
          .eq('id', existingAnswer.id)

        if (error) throw error
      }

      // 2. Recompute the attempt's total score and mark it graded
      const { error: attemptUpdateError } = await supabase
        .from('student_quiz_attempts')
        .update({
          score: runningTotal,
          status: 'graded'
        })
        .eq('id', attemptId)

      if (attemptUpdateError) throw attemptUpdateError

      // 3. Push the finished score into the gradebook
      const { error: syncError } = await supabase.rpc('sync_scores_to_gradebook', {
        p_quiz_id: quizId
      })
      if (syncError) throw syncError

      toast.success('Grades saved and pushed to gradebook!')
      router.push(`/teacher/assessments/${quizId}`)

    } catch (error: any) {
      console.error('Error saving grades:', error)
      toast.error(error.message || 'Failed to save grades')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (!quiz || !attempt) {
    return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Attempt not found</div>
  }

  const student = attempt.students
  const studentName = `${student?.first_name || ''} ${student?.last_name || ''} ${student?.middle_name || ''}`.trim()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-32 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 min-w-0">
              <BackButton href={`/teacher/assessments/${quizId}`} />
              <div className="min-w-0 overflow-hidden">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 truncate leading-tight">{studentName}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{quiz.title} • {quiz.classes?.name} • {quiz.subjects?.name}</p>
              </div>
            </div>
            <span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              attempt.status === 'graded'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}>
              {attempt.status === 'graded' ? 'Graded' : 'Needs Grading'}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-3xl space-y-4">
        {shortAnswerQuestions.length === 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-300">
            This quiz has no short-answer questions — everything below was auto-graded already.
          </div>
        )}

        {questions.map((q, index) => {
          const answer = answers[q.id]

          if (q.question_type === 'short_answer') {
            const awarded = manualPoints[q.id] ?? 0
            return (
              <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm flex-shrink-0">Q{index + 1}</span>
                    <p className="text-gray-900 dark:text-gray-100 font-medium">{q.question_text}</p>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">Max {q.points} pt{q.points !== 1 ? 's' : ''}</span>
                </div>

                <div className="flex items-start gap-2 mb-4 pl-0 sm:pl-9">
                  <MessageSquareText className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                  <p className="text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-gray-700 dark:text-gray-300 flex-1 whitespace-pre-wrap">
                    {answer?.text_answer?.trim() || <span className="italic text-gray-400">No answer submitted</span>}
                  </p>
                </div>

                <div className="flex items-center gap-3 pl-0 sm:pl-9">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Points awarded:</label>
                  <input
                    type="number"
                    min={0}
                    max={q.points}
                    value={awarded}
                    onChange={(e) => handlePointsChange(q.id, e.target.value, q.points)}
                    className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-lg text-center text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">/ {q.points}</span>

                  <button
                    onClick={() => setManualPoints(prev => ({ ...prev, [q.id]: q.points }))}
                    className="ml-auto text-xs font-medium px-3 py-1.5 rounded-lg border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                  >
                    Full Marks
                  </button>
                  <button
                    onClick={() => setManualPoints(prev => ({ ...prev, [q.id]: 0 }))}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Zero
                  </button>
                </div>
              </div>
            )
          }

          // Auto-graded MCQ / True-False — read only
          const isCorrect = answer?.is_correct
          const selectedOption = q.quiz_options?.find(o => o.id === answer?.selected_option_id)
          const correctOption = q.quiz_options?.find(o => o.is_correct)

          return (
            <div key={q.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <span className="font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm flex-shrink-0">Q{index + 1}</span>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{q.question_text}</p>
                </div>
                <span className={`flex-shrink-0 flex items-center gap-1 text-xs font-bold whitespace-nowrap ${isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {answer?.points_awarded ?? 0} / {q.points}
                </span>
              </div>
              <div className="pl-0 sm:pl-9 text-sm space-y-1">
                <p className="text-gray-600 dark:text-gray-400">
                  Student answered: <span className="font-medium text-gray-900 dark:text-gray-100">{selectedOption?.option_text || '—'}</span>
                </p>
                {!isCorrect && (
                  <p className="text-gray-600 dark:text-gray-400">
                    Correct answer: <span className="font-medium text-green-700 dark:text-green-400">{correctOption?.option_text || '—'}</span>
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-30">
        <div className="container mx-auto px-4 md:px-6 py-4 max-w-3xl flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Score</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{runningTotal} <span className="text-sm font-normal text-gray-400">/ {quiz.total_points}</span></p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-medium disabled:opacity-50 shadow-sm active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save & Publish Grade'}
          </button>
        </div>
      </div>
    </div>
  )
}