'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, Eye, Calendar, Clock, BookOpen } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function AssessmentsPage() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetchAssessments()
  }, [])

  const fetchAssessments = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
          return
      }

      const { data, error } = await supabase
        .from('online_quizzes')
        .select(`
            *,
            classes (name),
            subjects (name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
          console.error('Supabase error:', error)
      }
      if (data) setAssessments(data)

    } catch (error) {
      console.error('Error fetching assessments:', error)
      toast.error('Failed to load assessments')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assessment? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('online_quizzes')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Assessment deleted')
      setAssessments(assessments.filter(a => a.id !== id))
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete assessment')
    }
  }

  const filteredAssessments = filter === 'All' 
    ? assessments 
    : assessments.filter(a => (a.category || 'Assignment') === filter)

  // Stats
  const totalCount = assessments.length
  const publishedCount = assessments.filter(a => a.status === 'published').length
  const draftCount = assessments.filter(a => a.status === 'draft').length
  const examCount = assessments.filter(a => a.category === 'Exam').length

  if (loading) {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/teacher/dashboard" className="p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Assessments</h1>
              </div>
            </div>
            <Link
              href="/teacher/assessments/create"
              className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Assessment</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 font-sans">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">Published</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{publishedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">Drafts</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">{draftCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">Exams</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{examCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm mb-6 overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto scrollbar-hide">
            {['All', 'Exam', 'Assignment', 'Test'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 min-w-[100px] px-4 md:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap text-center outline-none focus:bg-gray-50 dark:focus:bg-gray-700 active:bg-gray-100 dark:active:bg-gray-700 ${
                        filter === f 
                        ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-b-2 border-blue-600 dark:border-blue-400' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 border-b-2 border-transparent'
                    }`}
                >
                    {f === 'All' ? 'All Assessments' : f + 's'}
                </button>
            ))}
          </div>
        </div>

        {/* Assessments List */}
        {filteredAssessments.length === 0 ? (
            <div className="text-center py-16 sm:py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mt-6">
                <div className="mx-auto w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No assessments found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto px-4">Get started by creating a new assessment for your students.</p>
                <Link
                    href="/teacher/assessments/create"
                    className="inline-flex items-center gap-2 mt-6 text-blue-600 dark:text-blue-400 font-semibold hover:text-blue-700 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-4 py-2 rounded-lg transition-colors border border-blue-100 dark:border-blue-800"
                >
                    <Plus className="w-5 h-5" /> Create Assessment
                </Link>
            </div>
        ) : (
            <div className="space-y-4 mt-6">
            {filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-5 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <Link href={`/teacher/assessments/${assessment.id}`} className="group flex items-center gap-2 min-w-0 max-w-full cursor-pointer">
                                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{assessment.title}</h3>
                                </Link>
                                <div className="flex items-center gap-2">
                                     <span className="md:hidden px-2 py-0.5 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                       {assessment.category}
                                    </span>
                                    <span className={`flex-shrink-0 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                                    assessment.status === 'published' 
                                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800' 
                                        : assessment.status === 'closed'
                                        ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                                        : 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
                                    }`}>
                                    {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-600 dark:text-gray-400 mt-3">
                                <span className="hidden md:inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                                    {assessment.category}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                                    <BookOpen className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                    <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium">{assessment.subjects?.name || 'Unknown Subject'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                                    <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">C</div>
                                    <span className="font-medium">{assessment.classes?.name || 'Unknown Class'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                    <span>{assessment.due_date ? new Date(assessment.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : 'No Due Date'}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                                    <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                                    <span>{assessment.duration_minutes ? assessment.duration_minutes + ' mins' : 'No Limit'}</span>
                                </div>
                                {assessment.total_points > 0 && (
                                     <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded border border-gray-100 dark:border-gray-700">
                                        <span>{assessment.total_points} Pts</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-t md:border-t-0 border-gray-100 dark:border-gray-700 pt-3 md:pt-0 mt-2 md:mt-0 justify-end md:self-center">
                            <Link 
                                href={`/teacher/assessments/${assessment.id}`}
                                className="flex items-center justify-center w-9 h-9 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg transition-colors border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                                title="View Details"
                            >
                                <Eye className="w-5 h-5" />
                            </Link>
                            <Link 
                                href={`/teacher/assessments/edit/${assessment.id}`}
                                className="flex items-center justify-center w-9 h-9 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
                                title="Edit"
                            >
                                <Edit className="w-5 h-5" />
                            </Link>
                            <button 
                                onClick={() => handleDelete(assessment.id)}
                                className="flex items-center justify-center w-9 h-9 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                                title="Delete"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
            </div>
        )}
      </main>
    </div>
  )
}
