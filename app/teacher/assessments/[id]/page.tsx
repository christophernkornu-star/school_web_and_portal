'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UploadCloud, Users, CheckCircle, Clock, RotateCcw, Trash2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'

export default function QuizDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<any>(null)
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null) // State for delete operation

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // Fetch Quiz
        const { data: quizData, error: quizError } = await supabase
          .from('online_quizzes')
          .select(`
            *,
            classes (name),
            subjects (name)
          `)
          .eq('id', quizId)
          .single()
        
        if (quizError) throw quizError
        setQuiz(quizData)

        // Fetch Attempts
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('student_quiz_attempts')
          .select(`
            *,
            students (
                first_name,
                last_name,
                middle_name
            )
          `)
          .eq('quiz_id', quizId)
          .order('score', { ascending: false })
          
        if (attemptsError) throw attemptsError
        setAttempts(attemptsData || [])

      } catch (error) {
        console.error('Error loading quiz data:', error)
        toast.error('Failed to load quiz details')
      } finally {
        setLoading(false)
      }
    }

    if (quizId) loadData()
  }, [quizId])

  const handleSync = async () => {
    if (!confirm('This will update the main gradebook with these scores. Existing scores for this assessment will be overwritten. Continue?')) {
        return
    }

    try {
        setSyncing(true)
        const { error } = await supabase.rpc('sync_scores_to_gradebook', {
            p_quiz_id: quizId
        })

        if (error) throw error

        toast.success('Scores synced to gradebook successfully!')
    } catch (error: any) {
        console.error('Sync error:', error)
        toast.error(error.message || 'Failed to sync scores')
    } finally {
        setSyncing(false)
    }
  }

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm('Are you sure you want to delete this attempt? This will allow the student to retake the assessment. This action cannot be undone.')) {
        return
    }

    try {
        setDeletingId(attemptId)
        
        // Delete the attempt (Cascades to answers)
        const { error } = await supabase
            .from('student_quiz_attempts')
            .delete()
            .eq('id', attemptId)

        if (error) throw error

        toast.success('Attempt deleted. Student can now retake.')
        // Refresh local state
        setAttempts(attempts.filter(a => a.id !== attemptId))

    } catch (error: any) {
        console.error('Delete error:', error)
        toast.error('Failed to delete attempt')
    } finally {
        setDeletingId(null)
    }
  }

  if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )
  }

  if (!quiz) return <div className="p-8 text-center text-gray-500 dark:text-gray-400">Quiz not found</div>

  const avgScore = attempts.length > 0 
    ? (attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
            <div className="flex items-center space-x-4 min-w-0">
              <Link href="/teacher/assessments" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 flex-shrink-0 transition-colors">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="min-w-0 overflow-hidden">
                <h1 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 truncate leading-tight">{quiz.title}</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{quiz.classes?.name} • {quiz.subjects?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 no-scrollbar">
                 <Link
                    href={`/teacher/assessments/edit/${quizId}`}
                    className="flex-shrink-0 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium whitespace-nowrap transition-colors"
                >
                    Edit
                </Link>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-medium disabled:opacity-50 whitespace-nowrap shadow-sm active:scale-95 transition-all"
                >
                    <UploadCloud className="w-4 h-4" />
                    <span>{syncing ? 'Syncing...' : 'Push to Gradebook'}</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 h-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex-shrink-0">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Total Attempts</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{attempts.length}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex-shrink-0">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Average Score</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{avgScore} <span className="text-sm text-gray-400 dark:text-gray-500 font-normal">/ {quiz.total_points}</span></p>
                </div>
            </div>
             <div className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 transition-colors">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full flex-shrink-0">
                    <Clock className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">Status</p>
                    <p className="text-lg md:text-xl font-bold capitalize text-gray-900 dark:text-white">{quiz.status}</p>
                </div>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">Student Results</h3>
            </div>
            <div className="overflow-x-auto w-full">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium uppercase text-xs tracking-wider">
                        <tr>
                            <th className="px-4 md:px-6 py-3 whitespace-nowrap">Student Name</th>
                            <th className="hidden md:table-cell px-4 md:px-6 py-3 whitespace-nowrap">Submitted At</th>
                            <th className="px-4 md:px-6 py-3 whitespace-nowrap">Score</th>
                            <th className="hidden sm:table-cell px-4 md:px-6 py-3 whitespace-nowrap">Percentage</th>
                            <th className="px-4 md:px-6 py-3 whitespace-nowrap">Status</th>
                            <th className="px-4 md:px-6 py-3 text-right whitespace-nowrap">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {attempts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                       <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                                       <p>No attempts recorded yet.</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            attempts.map((attempt) => {
                                const percentage = quiz.total_points > 0 
                                    ? ((attempt.score / quiz.total_points) * 100).toFixed(1) 
                                    : '0'
                                    
                                return (
                                    <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 md:px-6 py-3 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                            {attempt.students.last_name} {attempt.students.first_name} {attempt.students.middle_name}
                                        </td>
                                        <td className="hidden md:table-cell px-4 md:px-6 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                            {new Date(attempt.end_time || attempt.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-4 md:px-6 py-3 font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                                            {attempt.score}
                                        </td>
                                         <td className="hidden sm:table-cell px-4 md:px-6 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {percentage}%
                                        </td>
                                        <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                attempt.status === 'graded' 
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                                                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {attempt.status}
                                            </span>
                                        </td>
                                        <td className="px-4 md:px-6 py-3 text-right whitespace-nowrap">
                                            <button 
                                                onClick={() => handleDeleteAttempt(attempt.id)}
                                                disabled={deletingId === attempt.id}
                                                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-50 transition-colors"
                                                title="Reset Attempt (Allow Retake)"
                                            >
                                                {deletingId === attempt.id ? (
                                                    <span className="animate-spin text-xs">...</span>
                                                ) : (
                                                    <RotateCcw className="w-5 h-5 md:w-4 md:h-4" />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      </main>
    </div>
  )
}
