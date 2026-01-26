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
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link href="/teacher/dashboard" className="text-gray-500 hover:text-gray-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Assessments</h1>
              </div>
            </div>
            <Link
              href="/teacher/assessments/create"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm transition-colors shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Assessment</span>
              <span className="sm:hidden">New</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 border-b border-gray-100">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Published</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{publishedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Drafts</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">{draftCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Exams</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{examCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden border border-gray-100">
          <div className="flex overflow-x-auto scrollbar-hide">
            {['All', 'Exam', 'Assignment', 'Test'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`flex-1 min-w-[100px] px-4 md:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap text-center ${
                        filter === f 
                        ? 'text-green-700 bg-green-50 border-b-2 border-green-600' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-b-2 border-transparent'
                    }`}
                >
                    {f === 'All' ? 'All Assessments' : f + 's'}
                </button>
            ))}
          </div>
        </div>

        {/* Assessments List */}
        {filteredAssessments.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No assessments found</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">Get started by creating a new assessment for your students.</p>
                <Link
                    href="/teacher/assessments/create"
                    className="inline-flex items-center gap-2 mt-6 text-green-600 font-semibold hover:text-green-700"
                >
                    <Plus className="w-5 h-5" /> Create Assessment
                </Link>
            </div>
        ) : (
            <div className="space-y-4">
            {filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="bg-white rounded-xl shadow-sm p-4 md:p-5 border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0 max-w-full">
                                    <h3 className="text-base md:text-lg font-semibold text-gray-800 truncate">{assessment.title}</h3>
                                    <span className={`flex-shrink-0 px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                    assessment.status === 'published' 
                                        ? 'bg-green-100 text-green-800' 
                                        : assessment.status === 'closed'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                                    </span>
                                </div>
                                <span className="md:hidden px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                                   {assessment.category}
                                </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-600 mt-2">
                                <span className="hidden md:inline-block px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700 border border-blue-100">
                                    {assessment.category}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="truncate max-w-[150px]">{assessment.subjects?.name || 'Unknown Subject'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="w-3.5 h-3.5 flex items-center justify-center font-bold text-[10px] border rounded border-gray-400 text-gray-500">C</span>
                                    <span>{assessment.classes?.name || 'Unknown Class'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{assessment.due_date ? new Date(assessment.due_date).toLocaleDateString() : 'No Due Date'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                    <span>{assessment.duration_minutes ? assessment.duration_minutes + ' mins' : 'No Limit'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0 justify-end md:self-center">
                            <Link 
                                href={`/teacher/assessments/${assessment.id}`}
                                className="flex items-center justify-center w-8 h-8 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Details"
                            >
                                <Eye className="w-5 h-5" />
                            </Link>
                            <Link 
                                href={`/teacher/assessments/edit/${assessment.id}`}
                                className="flex items-center justify-center w-8 h-8 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit"
                            >
                                <Edit className="w-5 h-5" />
                            </Link>
                            <button 
                                onClick={() => handleDelete(assessment.id)}
                                className="flex items-center justify-center w-8 h-8 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
