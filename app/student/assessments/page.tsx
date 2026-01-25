'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, BookOpen, Clock, Calendar, CheckCircle } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
       <header className="bg-white shadow">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/student/dashboard" className="text-blue-600 hover:text-blue-800">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold text-gray-800">Online Assessments</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {quizzes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                <p className="text-gray-500">No assessments available for your class yet.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {quizzes.map((quiz) => (
                    <div key={quiz.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100 flex flex-col justify-between h-full">
                        <div>
                            <div className="flex justify-between items-start mb-2">
                                <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                                    {quiz.subjects?.name}
                                </span>
                                {quiz.attempt && (
                                    <span className={`flex items-center gap-1 text-xs font-medium ${
                                        quiz.attempt.status === 'in_progress' ? 'text-yellow-600' : 'text-green-600'
                                    }`}>
                                        {quiz.attempt.status === 'in_progress' ? (
                                            <>In Progress</>
                                        ) : (
                                            <><CheckCircle className="w-3 h-3" /> Completed</>
                                        )}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-1">{quiz.title}</h3>
                            <p className="text-sm text-gray-500 mb-4 line-clamp-2">{quiz.description}</p>
                            
                            <div className="space-y-2 text-sm text-gray-600 mb-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span>{quiz.duration_minutes ? `${quiz.duration_minutes} Mins` : 'No Time Limit'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    <span>Due: {quiz.due_date ? new Date(quiz.due_date).toLocaleDateString() : 'No Due Date'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            {quiz.attempt?.status === 'submitted' || quiz.attempt?.status === 'graded' ? (
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-gray-500">Your Score:</span>
                                    <span className="text-xl font-bold text-gray-900">{quiz.attempt.score} <span className="text-sm font-normal text-gray-400">/ {quiz.total_points}</span></span>
                                </div>
                            ) : (
                                <Link 
                                    href={`/student/assessments/take/${quiz.id}`}
                                    className={`block w-full text-center py-2.5 rounded-lg font-medium transition-colors ${
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
