'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clock, Save, CheckCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'

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
  
  // Answers state: { questionId: { optionId: string, text: string } }
  const [answers, setAnswers] = useState<Record<string, any>>({})
  
  // Timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [isTimeUp, setIsTimeUp] = useState(false)
  
  // Ref to prevent double init in Strict Mode
  const initRef = useState(false)
  // Ref to hold answers for async submission
  const answersRef = useRef(answers)
  
  useEffect(() => { 
    answersRef.current = answers 
  }, [answers])

  useEffect(() => {
    async function initQuiz() {
      if (initRef[0]) return // Prevent double firing
      initRef[1](true)

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

        // 3. Check for existing attempt
        // We need student_id. Get from students table using profile_id
        const { data: studentData } = await supabase
            .from('students')
            .select('id')
            .eq('profile_id', session.user.id)
            .single()

        if (!studentData) throw new Error('Student profile not found')

        let currentAttempt = null;
        // Fetch existing attempt (handle duplicates by taking the latest relevant one)
        const { data: attemptData, error: fetchError } = await supabase
            .from('student_quiz_attempts')
            .select('*')
            .eq('quiz_id', quizId)
            .eq('student_id', studentData.id)
            .order('created_at', { ascending: false }) // Get latest
            .limit(1)
            .maybeSingle()

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        if (attemptData) {
            currentAttempt = attemptData
             // Check if submitted
            if (currentAttempt.status === 'submitted' || currentAttempt.status === 'graded') {
                toast.error('You have already completed this assessment.')
                router.push('/student/assessments')
                return
            }
        } else {
            // Start new attempt
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
                // Handle potential race condition (Unique violation)
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

        // Initialize Timer
        if (quizData.duration_minutes) {
            const startTime = new Date(currentAttempt.start_time).getTime()
            const endTime = startTime + (quizData.duration_minutes * 60 * 1000)
            const now = new Date().getTime()
            const remaining = Math.max(0, Math.floor((endTime - now) / 1000))
            setTimeLeft(remaining)
        }

      } catch (error) {
        console.error('Error initializing quiz:', error)
        toast.error('Failed to load quiz')
        router.push('/student/assessments')
      } finally {
        setLoading(false)
      }
    }
    
    if (quizId) initQuiz()
  }, [quizId])

  // Timer Tick
  useEffect(() => {
    if (timeLeft === null) return

    // Immediately handle 0
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
            if (prev <= 0) return 0
            return prev - 1
        })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft]) // Check every second to ensure 0 is caught properly

  // Anti-Cheating: Fullscreen & Focus Tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !submitting && attempt && attempt.status === 'in_progress') {
        toast.error('You left the assessment page! Auto-submitting...')
        submitQuiz(true) // Force submit
      }
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (!submitting && attempt && attempt.status === 'in_progress') {
            e.preventDefault()
            e.returnValue = '' // Chrome requires returnValue to be set
            // We can't blocking submit here reliably, but we can try beacon or verify on next load.
            // Ideally we rely on visibilitychange for tab switching.
            // Closing is hard to intercept for async operations.
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
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (isTimeUp) return; // Strict lock
    setAnswers({
        ...answers,
        [questionId]: { ...answers[questionId], optionId }
    })
  }

  const handleTextChange = (questionId: string, text: string) => {
     if (isTimeUp) return; // Strict lock
    setAnswers({
        ...answers,
        [questionId]: { ...answers[questionId], text }
    })
  }


  const submitQuiz = async (forceSubmit: boolean = false) => {
    // Treat the argument properly
    const isForced = forceSubmit;

    if (submitting) return
    if (!attempt) return

    if (!isForced && !confirm('Are you sure you want to submit your assessment?')) return

    try {
        setSubmitting(true)
        
        // Use the API route which supports keepalive (if we use fetch with keepalive: true)
        // This ensures submission works even if the page is closing
        const payload = {
            attemptId: attempt.id,
            quizId: quizId,
            answers: answersRef.current, // Use Ref to ensure latest answers
            questions: questions
        }

        // We use fetch with keepalive: true for reliability during page unload
        // Note: Payload size limit is 64KB for keepalive. If quiz is huge, this might fail on keepalive.
        // For standard quizzes, it's fine.
        
        const response = await fetch('/api/assessments/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload),
            keepalive: true
        })

        if (!response.ok) {
            throw new Error('Submission failed')
        }

        const result = await response.json()

        if (isForced) {
             toast.dismiss() 
             toast('Assessment submitted.', { icon: 'check' })
        } else {
             toast.success('Assessment submitted successfully!')
        }
        
        // Force redirect (replace avoids back button)
        window.location.replace('/student/assessments')

    } catch (error) {
        console.error('Submit error:', error)
        toast.error('Failed to submit assessment')
        setSubmitting(false)
    }
  }

  if (loading) return <div className="p-8 text-center">Loading Assessment...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20 relative">
      {/* Strict Timeout Overlay */}
      {isTimeUp && (
          <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center text-white backdrop-blur-sm">
             <div className="bg-white text-gray-900 p-8 rounded-2xl shadow-2xl max-w-md text-center">
                 <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                     <Clock className="w-8 h-8" />
                 </div>
                 <h2 className="text-2xl font-bold mb-2">Time's Up!</h2>
                 <p className="text-gray-600 mb-6">Your assessment time has expired. Your answers are being submitted automatically. Please wait...</p>
                 <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 overflow-hidden">
                    <div className="bg-blue-600 h-2.5 rounded-full animate-progress-indeterminate"></div>
                 </div>
             </div>
          </div>
      )}

      {/* Sticky Header with Timer */}
      <div className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <h1 className="text-lg font-bold truncate max-w-[200px] md:max-w-md">{quiz.title}</h1>
            <div className={`flex items-center gap-2 font-mono font-bold text-lg px-3 py-1 rounded ${
                timeLeft !== null && timeLeft < 300 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-800'
            }`}>
                <Clock className="w-5 h-5" />
                {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="space-y-8">
            {questions.map((q, index) => (
                <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex gap-4 mb-4">
                        <span className="flex-shrink-0 w-8 h-8 bg-blue-50 text-blue-600 font-bold rounded-lg flex items-center justify-center">
                            {index + 1}
                        </span>
                        <div className="flex-1">
                            <p className="text-lg font-medium text-gray-800">{q.question_text}</p>
                            <p className="text-xs text-gray-500 mt-1">{q.points} points</p>
                        </div>
                    </div>

                    <div className="pl-12 space-y-3">
                        {/* Options */}
                        {(q.question_type === 'multiple_choice' || q.question_type === 'true_false') && (
                            q.quiz_options.map((opt: any) => (
                                <label 
                                    key={opt.id} 
                                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                        answers[q.id]?.optionId === opt.id 
                                            ? 'border-blue-500 bg-blue-50' 
                                            : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                    }`}
                                >
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                        answers[q.id]?.optionId === opt.id ? 'border-blue-500' : 'border-gray-400'
                                    }`}>
                                        {answers[q.id]?.optionId === opt.id && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
                                    </div>
                                    <span className="text-gray-700">{opt.option_text}</span>
                                    {/* Hidden Radio for accessibility */}
                                    <input 
                                        type="radio" 
                                        name={`q-${q.id}`} 
                                        value={opt.id}
                                        checked={answers[q.id]?.optionId === opt.id}
                                        onChange={() => handleOptionSelect(q.id, opt.id)}
                                        className="hidden"
                                    />
                                </label>
                            ))
                        )}

                        {q.question_type === 'short_answer' && (
                            <textarea
                                value={answers[q.id]?.text || ''}
                                onChange={(e) => handleTextChange(q.id, e.target.value)}
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                rows={3}
                                placeholder="Type your answer here..."
                            />
                        )}
                    </div>
                </div>
            ))}
        </div>

        <div className="mt-8 flex justify-end">
            <button
                onClick={() => submitQuiz(false)}
                disabled={submitting || isTimeUp}
                className="px-8 py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 transform transition-transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
            >
                <CheckCircle className="w-6 h-6" />
                {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
        </div>
      </main>
    </div>
  )
}
