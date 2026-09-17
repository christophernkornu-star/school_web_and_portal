'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import BackButton from '@/components/ui/back-button'
import { 
  CheckCircle2, 
  XCircle, 
  Save, 
  MessageSquareText, 
  Award, 
  Clock, 
  AlertCircle,
  GraduationCap,
  Sparkles,
  RotateCcw,
  BookOpen,
  Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import { PortalFooter } from '@/components/PortalFooter'

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
          .select('*, students(first_name, last_name, middle_name, student_id)')
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
  }, [quizId, attemptId, supabase])

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

  // Running total across auto-graded MCQ/TF answers + editable short-answer points
  const runningTotal = useMemo(() => {
    return questions.reduce((sum, q) => {
      if (q.question_type === 'short_answer') {
        return sum + (manualPoints[q.id] ?? 0)
      }
      return sum + (answers[q.id]?.points_awarded ?? 0)
    }, 0)
  }, [questions, manualPoints, answers])

  const shortAnswerQuestions = useMemo(() => {
    return questions.filter(q => q.question_type === 'short_answer')
  }, [questions])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 1. Persist each short-answer's points + correctness
      for (const q of shortAnswerQuestions) {
        const awarded = manualPoints[q.id] ?? 0
        const existingAnswer = answers[q.id]
        if (!existingAnswer) continue

        const { error } = await supabase
          .from('student_quiz_answers')
          .update({
            points_awarded: awarded,
            is_correct: awarded >= q.points && q.points > 0
          })
          .eq('id', existingAnswer.id)

        if (error) throw error
      }

      // 2. Recompute attempt score and mark graded
      const { error: attemptUpdateError } = await supabase
        .from('student_quiz_attempts')
        .update({
          score: runningTotal,
          status: 'graded'
        })
        .eq('id', attemptId)

      if (attemptUpdateError) throw attemptUpdateError

      // 3. Push score to gradebook
      const { error: syncError } = await supabase.rpc('sync_scores_to_gradebook', {
        p_quiz_id: quizId
      })
      if (syncError) throw syncError

      toast.success('Grades saved and published to gradebook!')
      router.push(`/teacher/assessments/${quizId}`)

    } catch (error: any) {
      console.error('Error saving grades:', error)
      toast.error(error.message || 'Failed to save grades')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <GradeAttemptSkeleton />
  }

  if (!quiz || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Attempt Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The requested student attempt could not be located.
          </p>
          <BackButton href={`/teacher/assessments/${quizId}`} />
        </div>
      </div>
    )
  }

  const student = attempt.students
  const studentName = `${student?.first_name || ''} ${student?.middle_name ? student.middle_name + ' ' : ''}${student?.last_name || ''}`.trim() || 'Student'
  const isAttemptGraded = attempt.status === 'graded'

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href={`/teacher/assessments/${quizId}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Grading: {studentName}
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  {quiz.title} • {quiz.classes?.name} • {quiz.subjects?.name}
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shrink-0 ${
              isAttemptGraded
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
            }`}>
              {isAttemptGraded ? 'Graded' : 'Needs Grading'}
            </span>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-32 sm:pb-36">
        
        {/* Notice for fully auto-graded assessments */}
        {shortAnswerQuestions.length === 0 && (
          <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-blue-900 dark:text-blue-200 flex items-start gap-3 shadow-2xs">
            <GraduationCap className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              This quiz has no short-answer questions. All multiple-choice and true/false items were auto-evaluated by the system. You may inspect the student&apos;s answers below before pushing scores to the gradebook.
            </p>
          </div>
        )}

        {/* Question Cards Container */}
        <div className="space-y-3.5 sm:space-y-4">
          {questions.map((q, index) => {
            const answer = answers[q.id]

            // 1. Short Answer Question (Manual Grading UI)
            if (q.question_type === 'short_answer') {
              const awarded = manualPoints[q.id] ?? 0

              return (
                <div 
                  key={q.id} 
                  className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 md:p-6 shadow-xs space-y-3.5 sm:space-y-4 hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all"
                >
                  {/* Top Bar: Question Number, Prompt Text & Max Points */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-xl shrink-0 mt-0.5">
                        Q{index + 1}
                      </span>
                      <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                        {q.question_text}
                      </h2>
                    </div>
                    <span className="text-[10px] sm:text-xs font-mono font-bold text-slate-400 shrink-0 whitespace-nowrap bg-slate-50 dark:bg-slate-900/50 px-2 py-0.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      Max {q.points} {q.points === 1 ? 'pt' : 'pts'}
                    </span>
                  </div>

                  {/* Student Answer Bubble */}
                  <div className="flex items-start gap-2.5 sm:gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <MessageSquareText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Student Submission
                      </span>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                        {answer?.text_answer?.trim() || (
                          <span className="italic text-slate-400 font-normal">No answer submitted by student</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Manual Points Input & Scoring Buttons */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        Points Awarded:
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={q.points}
                        value={awarded}
                        onChange={(e) => handlePointsChange(q.id, e.target.value, q.points)}
                        className="w-16 px-2 py-1.5 text-xs sm:text-sm font-mono font-bold text-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                      />
                      <span className="text-xs font-mono text-slate-400">/ {q.points}</span>
                    </div>

                    {/* Quick Mark Presets */}
                    <div className="grid grid-cols-2 sm:flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setManualPoints(prev => ({ ...prev, [q.id]: q.points }))}
                        className="px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/40 text-xs font-bold transition active:scale-95 text-center"
                      >
                        Full Marks ({q.points})
                      </button>
                      <button
                        type="button"
                        onClick={() => setManualPoints(prev => ({ ...prev, [q.id]: 0 }))}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-950/40 text-xs font-bold transition active:scale-95 text-center"
                      >
                        Zero (0)
                      </button>
                    </div>
                  </div>
                </div>
              )
            }

            // 2. Auto-graded Multiple Choice & True/False Card
            const isCorrect = answer?.is_correct
            const selectedOption = q.quiz_options?.find(o => o.id === answer?.selected_option_id)
            const correctOption = q.quiz_options?.find(o => o.is_correct)

            return (
              <div 
                key={q.id} 
                className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 md:p-6 shadow-xs space-y-3 hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all"
              >
                {/* Question Header & Score Pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                    <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-xl shrink-0 mt-0.5">
                      Q{index + 1}
                    </span>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question_text}
                    </h2>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider border shrink-0 ${
                    isCorrect 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
                      : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                  }`}>
                    {isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{answer?.points_awarded ?? 0} / {q.points} Pts</span>
                  </span>
                </div>

                {/* Answer Comparisons */}
                <div className="text-xs space-y-1.5 pl-0 sm:pl-9 pt-0.5">
                  <p className="text-slate-600 dark:text-slate-400">
                    Student Answer: <span className="font-bold text-slate-900 dark:text-white">{selectedOption?.option_text || 'None selected'}</span>
                  </p>
                  {!isCorrect && (
                    <p className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      Correct Answer: <span>{correctOption?.option_text || '---'}</span>
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

      </main>

      {/* Floating Bottom Action Bar (Safe for Mobile & Tablet) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 shadow-xl">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5 flex items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Computed Total Score
            </span>
            <div className="text-lg sm:text-2xl font-black font-mono text-[#003B5C] dark:text-blue-400 truncate">
              {runningTotal} <span className="text-xs font-normal text-slate-400 font-sans">/ {quiz.total_points} Pts</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Save className="w-4 h-4 text-amber-400" />
            )}
            <span>{saving ? 'Publishing...' : 'Save & Publish Grade'}</span>
          </button>
        </div>
      </div>

    </div>
  )
}

function GradeAttemptSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-4 flex-1">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
      </main>
    </div>
  )
}