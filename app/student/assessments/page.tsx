'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  Calendar, 
  CheckCircle, 
  Layers, 
  Sparkles, 
  AlertCircle 
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'
import { toast } from 'react-hot-toast'

export default function StudentAssessmentsPage() {
  const supabase = getSupabaseBrowserClient()
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [classAssessments, setClassAssessments] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'class' | 'online'>('class')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        // 1. Get Student Info (Class)
        const { data: studentData } = await supabase
            .from('students')
            .select('id, class_id')
            .eq('profile_id', session.user.id)
            .single()

        if (!studentData?.class_id) {
            setLoading(false)
            return
        }

        // --- FETCH ONLINE QUIZZES ---
        const { data: quizData, error } = await supabase
            .from('online_quizzes')
            .select(`
                *,
                subjects (name),
                teachers (
                    first_name,
                    last_name
                )
            `)
            .eq('class_id', studentData.class_id)
            .eq('status', 'published')
            .order('created_at', { ascending: false })

        if (error) throw error

        // 3. Fetch Student's Attempts
        const { data: attemptsData } = await supabase
            .from('student_quiz_attempts')
            .select('quiz_id, score, status, end_time, created_at')
            .eq('student_id', studentData.id)
            .order('created_at', { ascending: false })

        // Merge attempts into quizzes
        const mergedQuizzes = quizData?.map((q: any) => {
            const relevantAttempts = attemptsData?.filter((a: any) => a.quiz_id === q.id) || []
            let attempt = relevantAttempts.find((a: any) => a.status === 'graded') ||
                          relevantAttempts.find((a: any) => a.status === 'submitted') ||
                          relevantAttempts[0]

            return {
                ...q,
                attempt 
            }
        }) || []

        setQuizzes(mergedQuizzes)

        // --- FETCH CLASSROOM ASSESSMENTS ---
        const { data: terms } = await supabase
            .from('academic_terms')
            .select('id')
            .eq('is_current', true)
            .limit(1)
        
        const termId = terms?.[0]?.id

        if (termId) {
            const { data: assessmentsData, error: assessError } = await supabase
                .from('assessments')
                .select(`
                    id,
                    title,
                    assessment_type,
                    max_score,
                    assessment_date,
                    created_at,
                    class_subject_id,
                    class_subjects!inner (
                        subjects (name)
                    )
                `)
                .eq('class_subjects.class_id', studentData.class_id)
                .eq('term_id', termId)
                .order('created_at', { ascending: false })

            if (assessError) throw assessError

            if (assessmentsData && assessmentsData.length > 0) {
                const assessmentIds = assessmentsData.map((a: any) => a.id)
                
                const { data: scoresData } = await supabase
                    .from('student_scores')
                    .select('assessment_id, score')
                    .eq('student_id', studentData.id)
                    .in('assessment_id', assessmentIds)
                
                const scoresMap = new Map(scoresData?.map((s: any) => [s.assessment_id, s.score]) || [])

                const mergedAssessments = assessmentsData.map((a: any) => ({
                    ...a,
                    my_score: scoresMap.get(a.id),
                    subject_name: a.class_subjects?.subjects?.name || 'Unknown Subject'
                }))

                setClassAssessments(mergedAssessments)
            }
        }

      } catch (error) {
        console.error('Error loading data:', error)
        toast.error('Failed to load assessment records')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [supabase])

  if (loading) {
     return <AssessmentsSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header & Segmented Tab Navigation */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Title & Back Button */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Assessments &amp; Quizzes
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Track classroom assignment grades and complete interactive online quizzes
                </p>
              </div>
            </div>

            {/* Segmented Tab Pill Selector */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setActiveTab('class')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'class'
                    ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Class Assessments ({classAssessments.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('online')}
                className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'online'
                    ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Online Quizzes ({quizzes.length})
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8 space-y-5">
        {activeTab === 'class' ? (
          /* Class Assessments List */
          classAssessments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-16 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6 opacity-40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  No Assessment Records Found
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Your teachers haven&apos;t recorded any classroom exercises or tests for this term yet.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
              {classAssessments.map((assessment) => (
                <div 
                  key={assessment.id} 
                  className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                        {assessment.subject_name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {assessment.assessment_date ? new Date(assessment.assessment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No Date'}
                      </span>
                    </div>
                    
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                      {assessment.title || assessment.assessment_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                      {assessment.assessment_type?.replace('_', ' ') || 'Assessment'}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs sm:text-sm">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">Score Awarded:</span>
                    {assessment.my_score !== undefined ? (
                      <span className="font-mono font-black text-slate-900 dark:text-white text-base">
                        {assessment.my_score} <span className="text-xs font-normal text-slate-400">/ {assessment.max_score}</span>
                      </span>
                    ) : (
                      <span className="font-medium text-amber-600 dark:text-amber-400 italic">Pending Grading</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Online Quizzes List */
          quizzes.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-16 text-center space-y-3 shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <BookOpen className="w-6 h-6 opacity-40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  No Online Quizzes Available
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  There are no active online assessment quizzes published for your class right now.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
              {quizzes.map((quiz) => (
                <div 
                  key={quiz.id} 
                  className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 border border-blue-200/80 dark:border-blue-900/50 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                        {quiz.subjects?.name}
                      </span>

                      {quiz.attempt && (
                        <span className={`inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                          quiz.attempt.status === 'in_progress' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300'
                        }`}>
                          {quiz.attempt.status === 'in_progress' ? (
                            <>In Progress</>
                          ) : (
                            <><CheckCircle className="w-3 h-3 shrink-0" /> Completed</>
                          )}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                      {quiz.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {quiz.description || 'Complete all test items before the deadline.'}
                    </p>
                    
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{quiz.duration_minutes ? `${quiz.duration_minutes} Mins limit` : 'No Time Limit'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Due: {quiz.due_date ? new Date(quiz.due_date).toLocaleDateString('en-GB') : 'No Due Date'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                    {quiz.attempt?.status === 'submitted' || quiz.attempt?.status === 'graded' ? (
                      <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                        <span className="text-xs font-semibold text-slate-500">Score Obtained:</span>
                        <span className="text-base font-mono font-black text-slate-900 dark:text-white">
                          {quiz.attempt.score} <span className="text-xs font-normal text-slate-400">/ {quiz.total_points}</span>
                        </span>
                      </div>
                    ) : (
                      <Link 
                        href={`/student/assessments/take/${quiz.id}`}
                        className={`flex items-center justify-center w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition active:scale-95 shadow-xs ${
                          quiz.attempt?.status === 'in_progress'
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-[#003B5C] hover:bg-[#002a42] text-white'
                        }`}
                      >
                        {quiz.attempt?.status === 'in_progress' ? 'Resume Quiz Session' : 'Start Quiz Now'}
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      <PortalFooter />
    </div>
  )
}

function AssessmentsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <Skeleton className="h-6 w-36 rounded-md" />
          </div>
          <Skeleton className="h-9 w-40 rounded-xl" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-4 flex-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-56 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      </main>
      <PortalFooter />
    </div>
  )
}