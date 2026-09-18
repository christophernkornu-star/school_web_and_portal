'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  ShieldAlert,
  FileCheck,
  HelpCircle,
  Sparkles
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function TakeQuizPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const quizId = params.id as string

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [quiz, setQuiz] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [attempt, setAttempt] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isTimeUp, setIsTimeUp] = useState(false)
  
  const initRef = useRef(false)
  const answersRef = useRef(answers)
  
  useEffect(() => { 
    answersRef.current = answers 
  }, [answers])

  useEffect(() => {
    async function initQuiz() {
      if (initRef.current) return
      initRef.current = true

      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          router.push('/login')
          return
        }

        // 1. Fetch Quiz Details
        const { data: quizData, error: quizError } = await supabase
          .from('online_quizzes')
          .select('*')
          .eq('id', quizId)
          .single()
            
        if (quizError) throw quizError
        setQuiz(quizData)

        // 2. Fetch Questions & Options
        const { data: qData, error: qError } = await supabase
          .from('quiz_questions')
          .select(`
            *,
            quiz_options (*)
          `)
          .eq('quiz_id', quizId)
          .order('position', { ascending: true })

        if (qError) throw qError
        setQuestions(qData || [])

        // 3. Get Student Profile
        const { data: studentData } = await supabase
          .from('students')
          .select('id')
          .eq('profile_id', session.user.id)
          .single()

        if (!studentData) throw new Error('Student profile not found')

        let currentAttempt = null
        const { data: attemptData, error: fetchError } = await supabase
          .from('student_quiz_attempts')
          .select('*')
          .eq('quiz_id', quizId)
          .eq('student_id', studentData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

        if (attemptData) {
          currentAttempt = attemptData
          if (currentAttempt.status === 'submitted' || currentAttempt.status === 'graded') {
            toast.error('You have already completed this assessment.')
            router.push('/student/assessments')
            return
          }
        } else {
          const { data: newAttempt, error: createError } = await supabase
            .from('student_quiz_attempts')
            .insert({
              quiz_id: quizId,
              student_id: studentData.id,
              status: 'in_progress',
              start_time: new Date().toISOString()
            })
            .select()
            .single()
            
          if (createError) {
            if (createError.code === '23505') {
              const { data: retryAttempt } = await supabase
                .from('student_quiz_attempts')
                .select('*')
                .eq('quiz_id', quizId)
                .eq('student_id', studentData.id)
                .single()
              currentAttempt = retryAttempt
            } else {
              throw createError
            }
          } else {
            currentAttempt = newAttempt
          }
        }
        
        setAttempt(currentAttempt)

        // 4. Initialize Timer
        if (quizData.duration_minutes) {
          const startTime = new Date(currentAttempt.start_time).getTime()
          const endTime = startTime + (quizData.duration_minutes * 60 * 1000)
          const now = new Date().getTime()
          const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
          setTimeLeft(remaining)
        }

      } catch (error) {
        console.error('Error initializing quiz:', error)
        toast.error('Failed to load assessment. Please verify your connection.')
        router.push('/student/assessments')
      } finally {
        setLoading(false)
      }
    }
    
    if (quizId) initQuiz()
  }, [quizId, router, supabase])

  // Timer Tick
  useEffect(() => {
    if (timeLeft === null) return

    if (timeLeft === 0) {
      if (!isTimeUp) {
        setIsTimeUp(true)
        submitQuiz(true)
      }
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isTimeUp])

  // Anti-Cheating: Tab Focus & Visibility Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitting && attempt && attempt.status === 'in_progress') {
        toast.error('Navigation outside the assessment page detected! Auto-submitting...')
        submitQuiz(true)
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submitting && attempt && attempt.status === 'in_progress') {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [attempt, submitting])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isTimeUp || submitting) return
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], optionId }
    }))
  }

  const handleTextChange = (questionId: string, text: string) => {
    if (isTimeUp || submitting) return
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], text }
    }))
  }

  const submitQuiz = async (forceSubmit: boolean = false) => {
    if (submitting || !attempt) return

    if (!forceSubmit && !confirm('Are you sure you want to finalize and submit your assessment?')) {
      return
    }

    try {
      setSubmitting(true)

      const payload = {
        attemptId: attempt.id,
        quizId: quizId,
        answers: answersRef.current,
        questions: questions
      }

      let submissionSuccess = false

      // 1. Try Next.js API Route Handler
      try {
        const res = await fetch('/api/assessments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        })
        if (res.ok) {
          submissionSuccess = true
        }
      } catch (err) {
        console.warn('API route unreachable, falling back to direct database sync...')
      }

      // 2. Resilient Direct-to-Supabase Fallback (Guarantees no 404 lockup)
      if (!submissionSuccess) {
        let earnedPoints = 0
        let totalPoints = 0

        questions.forEach((q: any) => {
          const qPts = Number(q.points) || 1
          totalPoints += qPts
          const ans = answersRef.current?.[q.id]
          if (q.question_type === 'multiple_choice' || q.question_type === 'true_false') {
            const correctOpt = q.quiz_options?.find((opt: any) => opt.is_correct)
            if (correctOpt && correctOpt.id === ans?.optionId) {
              earnedPoints += qPts
            }
          }
        })

        const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0

        const { error: directError } = await supabase
          .from('student_quiz_attempts')
          .update({
            status: 'submitted',
            end_time: new Date().toISOString(),
            score: earnedPoints,
            total_points: totalPoints,
            percentage: percentage,
            answers: answersRef.current || {}
          })
          .eq('id', attempt.id)

        if (directError) throw directError
      }

      if (forceSubmit) {
        toast.dismiss()
        toast.success('Assessment time elapsed. Responses recorded!')
      } else {
        toast.success('Assessment submitted successfully!')
      }

      window.location.replace('/student/assessments')
    } catch (error: any) {
      console.error('Submit error:', error)
      toast.error('Failed to submit assessment: ' + (error.message || 'Please retry.'))
      setSubmitting(false)
    }
  }

  // Answered counter & progress indicator
  const answeredCount = useMemo(() => {
    return questions.filter(q => {
      const a = answers[q.id]
      if (!a) return false
      if (q.question_type === 'short_answer') return Boolean(a.text?.trim())
      return Boolean(a.optionId)
    }).length
  }, [questions, answers])

  const progressPercentage = questions.length > 0 
    ? Math.round((answeredCount / questions.length) * 100) 
    : 0

  if (loading) {
    return <TakeQuizSkeleton />
  }

  const isLowTime = timeLeft !== null && timeLeft < 180
  const isCriticalTime = timeLeft !== null && timeLeft < 60

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white relative">
      
      {/* Top Banner with Crest & Ghana Flag Accent Stripe */}
      <header className="sticky top-0 z-30 w-full shadow-md select-none">
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />
        
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-[#003B5C] border-b-2 border-amber-600/30">
          <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2 sm:py-2.5">
            <div className="flex items-center justify-between gap-3">
              
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-full p-1 shadow-xs ring-1 ring-[#003B5C]/20 flex items-center justify-center shrink-0 overflow-hidden">
                  <Image
                    src="/school_crest.png"
                    alt="Biriwa Methodist 'C' Crest"
                    width={36}
                    height={36}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs sm:text-sm font-black text-[#003B5C] tracking-tight leading-tight truncate">
                    Biriwa Methodist &apos;C&apos; Basic School
                  </h2>
                  <p className="text-[10px] font-bold text-[#003B5C]/80 uppercase tracking-wider truncate">
                    E-Learning Assessment Engine
                  </p>
                </div>
              </div>

              {/* Countdown Display in Banner */}
              {timeLeft !== null && (
                <div 
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs sm:text-sm font-mono font-black border transition-colors shrink-0 shadow-xs ${
                    isCriticalTime
                      ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                      : isLowTime
                      ? 'bg-amber-600 text-white border-amber-700'
                      : 'bg-white/90 text-[#003B5C] border-amber-600/30'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Subheader Status Strip */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2">
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-white truncate">
                {quiz?.title || 'Continuous Assessment'}
              </span>
              <span className="text-[11px] text-slate-500 shrink-0 font-mono">
                {answeredCount} / {questions.length} answered ({progressPercentage}%)
              </span>
            </div>
            
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-[#003B5C] dark:bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Time's Up Auto-Submission Overlay */}
      {isTimeUp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center space-y-4 shadow-2xl border border-slate-200/80 dark:border-slate-700">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
              <Clock className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black tracking-tight">Time&apos;s Up!</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Your allocated assessment duration has elapsed. Your answers are being finalized and recorded.
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2 overflow-hidden">
              <div className="bg-[#003B5C] dark:bg-blue-500 h-full rounded-full animate-pulse w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Questions Workspace */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-4 sm:space-y-6 pb-32 sm:pb-16">
        
        {/* Anti-Cheating Notice */}
        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] sm:text-xs leading-relaxed">
            <strong>Active Assessment Notice:</strong> Navigating away or closing the browser tab will automatically finalize your attempt. Complete all questions calmly before submitting.
          </p>
        </div>

        {/* Question Cards Roster */}
        <div className="space-y-4 sm:space-y-6">
          {questions.map((q, index) => {
            const isAnswered = q.question_type === 'short_answer'
              ? Boolean(answers[q.id]?.text?.trim())
              : Boolean(answers[q.id]?.optionId)

            return (
              <div 
                key={q.id}
                className={`bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border transition-all p-4 sm:p-6 shadow-xs space-y-4 ${
                  isAnswered
                    ? 'border-[#003B5C]/30 dark:border-blue-500/30 ring-1 ring-[#003B5C]/10 dark:ring-blue-500/10'
                    : 'border-slate-200/80 dark:border-slate-700/80'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center shrink-0 transition-colors ${
                    isAnswered
                      ? 'bg-[#003B5C] text-white dark:bg-blue-600'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {index + 1}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question_text}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                      <span>{q.points || 1} {q.points === 1 ? 'mark' : 'marks'}</span>
                      {isAnswered && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 font-sans">
                            <CheckCircle2 className="w-3 h-3" /> Answered
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Multiple Choice Options */}
                <div className="pt-1">
                  {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                    <div className="grid grid-cols-1 gap-2.5">
                      {q.quiz_options?.map((opt: any) => {
                        const isSelected = answers[q.id]?.optionId === opt.id

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleOptionSelect(q.id, opt.id)}
                            disabled={isTimeUp || submitting}
                            className={`w-full flex items-center gap-3 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border text-left transition-all active:scale-[0.99] cursor-pointer ${
                              isSelected
                                ? 'bg-[#003B5C]/5 border-[#003B5C] dark:bg-blue-950/30 dark:border-blue-400 shadow-2xs'
                                : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100/70 dark:hover:bg-slate-800'
                            }`}
                          >
                            {/* Radio Ring */}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-[#003B5C] dark:border-blue-400'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && (
                                <div className="w-2.5 h-2.5 rounded-full bg-[#003B5C] dark:bg-blue-400" />
                              )}
                            </div>

                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                              {opt.option_text}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Short Answer Textarea */}
                  {q.question_type === 'short_answer' && (
                    <div className="space-y-1.5">
                      <textarea
                        rows={3}
                        value={answers[q.id]?.text || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        disabled={isTimeUp || submitting}
                        placeholder="Type your answer here..."
                        className="w-full p-3.5 sm:p-4 text-xs sm:text-sm font-medium rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition resize-none placeholder:text-slate-400"
                      />
                    </div>
                  )}
                </div>

              </div>
            )
          })}
        </div>

        {/* Desktop Final Submit Row */}
        <div className="hidden sm:flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Make sure you have answered all questions before confirming submission.
          </div>

          <button
            type="button"
            onClick={() => submitQuiz(false)}
            disabled={submitting || isTimeUp}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-400" />
                <span>Submit Assessment</span>
              </>
            )}
          </button>
        </div>

      </main>

      {/* Floating Sticky Mobile Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Completion
            </span>
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block">
              {answeredCount} of {questions.length} answered
            </span>
          </div>

          <button
            type="button"
            onClick={() => submitQuiz(false)}
            disabled={submitting || isTimeUp}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  )
}

function TakeQuizSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-3 w-28 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <Skeleton className="h-12 w-full rounded-2xl" />
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-5 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
              <Skeleton className="h-5 w-3/4 rounded-md" />
            </div>
            <div className="space-y-2.5 pt-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}