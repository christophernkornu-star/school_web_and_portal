'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

export default function StudentAssessmentsPage() {
  const supabase = getSupabaseBrowserClient()
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadQuizzes() {
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

        // 2. Fetch Quizzes for this class (Published)
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
            .order('created_at', { ascending: false }) // Latest first

        // Merge attempts into quizzes
        const merged = quizData?.map((q: any) => {
            // Find the most relevant attempt (e.g., submitted/graded takes precedence over stale in_progress)
            // Since we sorted by created_at desc, finding the first one gives the LATEST attempt.
            // If we have duplicates, we ideally want the one that is 'submitted' or 'graded' if it exists.
            
            const relevantAttempts = attemptsData?.filter((a: any) => a.quiz_id === q.id) || [];
            
            // Priority: graded > submitted > in_progress
            let attempt = relevantAttempts.find((a: any) => a.status === 'graded') ||
                          relevantAttempts.find((a: any) => a.status === 'submitted') ||
                          relevantAttempts[0]; // Fallback to latest

            return {
                ...q,
                attempt // Attach attempt info
            }
        })

        setQuizzes(merged || [])

      } catch (error) {
        console.error('Error loading quizzes:', error)
      } finally {
        setLoading(false)
      }
    }
    loadQuizzes()
  }, [])

  if (loading) {
     return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
          <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
            <div className="container mx-auto px-4 py-4">
               <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-40 rounded" />
               </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
             <div className="space-y-4">
                 {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border dark:border-gray-700">
                        <div className="flex justify-between items-start mb-4">
                             <div>
                                <Skeleton className="h-6 w-48 mb-2" />
                                <Skeleton className="h-4 w-32" />
                             </div>
                             <Skeleton className="h-8 w-24 rounded-full" />
                        </div>
                        <div className="flex gap-4">
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                 ))}
             </div>
          </main>
      </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
       <header className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center gap-4">
            <BackButton href="/student/dashboard" />
            <h1 className="text-xl font-bold text-gray-800">Online Assessments</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6">
        {quizzes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No Assessments</h3>
                <p className="text-gray-500">No assessments available for your class yet.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                    <div key={quiz.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col justify-between h-full transition-shadow hover:shadow-md">
                        <div>
                            <div className="flex justify-between items-start mb-3">
                                <span className="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                    {quiz.subjects?.name}
                                </span>
                                {quiz.attempt && (
                                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${
                                        quiz.attempt.status === 'in_progress' 
                                            ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' 
                                            : 'bg-green-50 text-green-700 border border-green-100'
                                    }`}>
                                        {quiz.attempt.status === 'in_progress' ? (
                                            <>In Progress</>
                                        ) : (
                                            <><CheckCircle className="w-3.5 h-3.5" /> Completed</>
                                        )}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2 leading-snug">{quiz.title}</h3>
                            <p className="text-sm text-gray-500 mb-5 line-clamp-2">{quiz.description}</p>
                            
                            <div className="space-y-2.5 text-sm text-gray-600 mb-6 bg-gray-50 p-3 rounded-lg">
                                <div className="flex items-center gap-2.5">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{quiz.duration_minutes ? `${quiz.duration_minutes} Mins` : 'No Time Limit'}</span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>Due: {quiz.due_date ? new Date(quiz.due_date).toLocaleDateString('en-GB') : 'No Due Date'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50 mt-auto">
                            {quiz.attempt?.status === 'submitted' || quiz.attempt?.status === 'graded' ? (
                                <div className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                                    <span className="text-sm font-medium text-gray-500">Your Score:</span>
                                    <span className="text-lg font-bold text-gray-900">{quiz.attempt.score} <span className="text-sm font-normal text-gray-400">/ {quiz.total_points}</span></span>
                                </div>
                            ) : (
                                <Link 
                                    href={`/student/assessments/take/${quiz.id}`}
                                    className={`flex items-center justify-center w-full py-3 rounded-lg font-medium transition-colors shadow-sm active:scale-95 transform duration-150 ${
                                        quiz.attempt?.status === 'in_progress'
                                        ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                                >
                                    {quiz.attempt?.status === 'in_progress' ? 'Resume Quiz' : 'Start Quiz'}
                                </Link>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  )
}
