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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      )
  }

  if (!quiz) return <div className="p-8 text-center">Quiz not found</div>

  const avgScore = attempts.length > 0 
    ? (attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length).toFixed(1)
    : 0

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/assessments" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">{quiz.title}</h1>
                <p className="text-sm text-gray-500">{quiz.classes?.name} • {quiz.subjects?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
                 <Link
                    href={`/teacher/assessments/edit/${quizId}`}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                    Edit
                </Link>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                >
                    <UploadCloud className="w-4 h-4" />
                    <span>{syncing ? 'Syncing...' : 'Push to Gradebook'}</span>
                </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 h-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-full">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Total Attempts</p>
                    <p className="text-2xl font-bold">{attempts.length}</p>
                </div>
            </div>
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                    <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Average Score</p>
                    <p className="text-2xl font-bold">{avgScore} <span className="text-sm text-gray-400 font-normal">/ {quiz.total_points}</span></p>
                </div>
            </div>
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
                    <Clock className="w-6 h-6" />
                </div>
                <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-xl font-bold capitalize">{quiz.status}</p>
                </div>
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Student Results</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Student Name</th>
                            <th className="px-6 py-3">Submitted At</th>
                            <th className="px-6 py-3">Score</th>
                            <th className="px-6 py-3">Percentage</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {attempts.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No attempts recorded yet.
                                </td>
                            </tr>
                        ) : (
                            attempts.map((attempt) => {
                                const percentage = quiz.total_points > 0 
                                    ? ((attempt.score / quiz.total_points) * 100).toFixed(1) 
                                    : '0'
                                    
                                return (
                                    <tr key={attempt.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {attempt.students.last_name} {attempt.students.first_name} {attempt.students.middle_name}
                                        </td>
                                        <td className="px-6 py-3 text-gray-500">
                                            {new Date(attempt.end_time || attempt.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-gray-800">
                                            {attempt.score}
                                        </td>
                                         <td className="px-6 py-3 text-gray-600">
                                            {percentage}%
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                attempt.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {attempt.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button 
                                                onClick={() => handleDeleteAttempt(attempt.id)}
                                                disabled={deletingId === attempt.id}
                                                className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded disabled:opacity-50"
                                                title="Reset Attempt (Allow Retake)"
                                            >
                                                {deletingId === attempt.id ? (
                                                    <span className="animate-spin text-xs">...</span>
                                                ) : (
                                                    <RotateCcw className="w-4 h-4" />
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
