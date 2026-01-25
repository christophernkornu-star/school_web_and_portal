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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/dashboard" className="text-green-600 hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Assessments</h1>
                <p className="text-xs md:text-sm text-gray-600">Create and manage tests, quizzes, and projects</p>
              </div>
            </div>
            <Link
              href="/teacher/assessments/create"
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs md:text-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden md:inline">Create Assessment</span>
              <span className="md:hidden">New</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs md:text-sm font-medium uppercase">Total</p>
            <p className="text-2xl md:text-3xl font-bold text-gray-800 mt-1">{totalCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs md:text-sm font-medium uppercase">Published</p>
            <p className="text-2xl md:text-3xl font-bold text-green-600 mt-1">{publishedCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs md:text-sm font-medium uppercase">Drafts</p>
            <p className="text-2xl md:text-3xl font-bold text-yellow-600 mt-1">{draftCount}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-gray-500 text-xs md:text-sm font-medium uppercase">Exams</p>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 mt-1">{examCount}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
          <div className="flex overflow-x-auto">
            {['All', 'Exam', 'Assignment', 'Test'].map((f) => (
                <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        filter === f 
                        ? 'border-green-600 text-green-600 bg-green-50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                >
                    {f === 'All' ? 'All Assessments' : f + 's'}
                </button>
            ))}
          </div>
        </div>

        {/* Assessments List */}
        {filteredAssessments.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-sm">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No assessments found</h3>
                <p className="text-gray-500 mt-1">Get started by creating a new assessment.</p>
                <Link
                    href="/teacher/assessments/create"
                    className="inline-flex items-center gap-2 mt-4 text-green-600 font-medium hover:text-green-700"
                >
                    <Plus className="w-4 h-4" /> Create New
                </Link>
            </div>
        ) : (
            <div className="grid gap-4">
            {filteredAssessments.map((assessment) => (
                <div key={assessment.id} className="bg-white rounded-lg shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-800">{assessment.title}</h3>
                        <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                        assessment.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : assessment.status === 'closed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                        {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
                        </span>
                        <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {assessment.category}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-6 text-sm text-gray-600 mt-3">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-gray-400" />
                            <span>{assessment.subjects?.name || 'Unknown Subject'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 text-gray-400 flex items-center justify-center font-bold text-xs border rounded border-gray-300">C</span>
                            <span>{assessment.classes?.name || 'Unknown Class'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{assessment.due_date ? new Date(assessment.due_date).toLocaleDateString() : 'No Due Date'}</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{assessment.duration_minutes ? assessment.duration_minutes + ' mins' : 'No Limit'}</span>
                        </div>
                    </div>
                    </div>

                    <div className="flex items-center gap-2 border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0 justify-end">
                    <Link 
                        href={`/teacher/assessments/${assessment.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors tooltip"
                        title="View Details"
                    >
                        <Eye className="w-5 h-5" />
                    </Link>
                    <Link 
                        href={`/teacher/assessments/edit/${assessment.id}`}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                    >
                        <Edit className="w-5 h-5" />
                    </Link>
                    <button 
                        onClick={() => handleDelete(assessment.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
