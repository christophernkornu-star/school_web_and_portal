'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Plus, Edit, Trash2, Eye, Calendar, Clock, BookOpen, 
  CheckCircle, AlertCircle, Sparkles, Filter, X, Loader2, Layers, Award
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface QuizItem {
  id: string
  title: string
  category: string
  status: 'draft' | 'published' | 'closed'
  duration_minutes: number | null
  total_points: number | null
  due_date: string | null
  created_at: string
  classes?: { name: string } | null
  subjects?: { name: string } | null
}

export default function AssessmentsPage() {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  
  const [assessments, setAssessments] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [deletingAssessment, setDeletingAssessment] = useState<QuizItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
      if (data) setAssessments(data as QuizItem[])

    } catch (error) {
      console.error('Error fetching assessments:', error)
      toast.error('Failed to load assessments')
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = async () => {
    if (!deletingAssessment) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('online_quizzes')
        .delete()
        .eq('id', deletingAssessment.id)

      if (error) throw error
      
      toast.success('Assessment deleted successfully')
      setAssessments(prev => prev.filter(a => a.id !== deletingAssessment.id))
      setDeletingAssessment(null)
    } catch (error) {
      console.error('Error deleting:', error)
      toast.error('Failed to delete assessment')
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredAssessments = useMemo(() => {
    if (filter === 'All') return assessments
    return assessments.filter(a => (a.category || 'Assignment') === filter)
  }, [assessments, filter])

  // Overview Stats
  const totalCount = assessments.length
  const publishedCount = assessments.filter(a => a.status === 'published').length
  const draftCount = assessments.filter(a => a.status === 'draft').length
  const examCount = assessments.filter(a => a.category === 'Exam').length

  const getCategoryCount = (category: string) => {
    if (category === 'All') return totalCount
    return assessments.filter(a => (a.category || 'Assignment') === category).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-20 border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl" />
                <Skeleton className="h-6 w-36 sm:w-48 rounded-lg" />
              </div>
              <Skeleton className="h-9 sm:h-10 w-28 sm:w-36 rounded-xl" />
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-12 w-full rounded-2xl" />
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/dashboard" className="shrink-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Assessments</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Manage homework, tests, quizzes, and formal examination papers
                </p>
              </div>
            </div>

            <Link
              href="/teacher/assessments/create"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Assessment</span>
              <span className="sm:hidden">Create</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Total Created</span>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 dark:text-white mt-1">{totalCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Published</span>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{publishedCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Drafts</span>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{draftCount}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Major Exams</span>
            <p className="text-xl sm:text-2xl lg:text-3xl font-black text-[#003B5C] dark:text-blue-400 mt-1">{examCount}</p>
          </div>
        </div>

        {/* Scrollable Segmented Filter Tabs */}
        <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="bg-gray-200/70 dark:bg-gray-800/90 p-1.5 rounded-2xl inline-flex items-center gap-1.5 min-w-full sm:min-w-0 shadow-inner">
            {['All', 'Exam', 'Assignment', 'Test'].map((f) => {
              const count = getCategoryCount(f)
              const isActive = filter === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span>{f === 'All' ? 'All Assessments' : `${f}s`}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    isActive 
                      ? 'bg-[#003B5C]/10 dark:bg-blue-400/20 text-[#003B5C] dark:text-blue-200' 
                      : 'bg-gray-300/50 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Assessments Feed */}
        {filteredAssessments.length === 0 ? (
          <div className="text-center py-14 sm:py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 space-y-3">
            <div className="w-14 h-14 bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-950/50 dark:text-blue-300 rounded-2xl flex items-center justify-center mx-auto mb-2">
              <BookOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">No assessments found</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto px-4 leading-relaxed">
              No assessments match the selected category. Create a new assessment paper for your class cohorts.
            </p>
            <Link
              href="/teacher/assessments/create"
              className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Create Assessment</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {filteredAssessments.map((assessment) => (
              <div
                key={assessment.id}
                className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#003B5C]/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                {/* Left Metadata Body */}
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider rounded-full border ${
                        assessment.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : assessment.status === 'closed'
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {assessment.status}
                    </span>

                    <span className="inline-flex px-2 py-0.5 text-[11px] font-bold rounded-md bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/25 dark:text-blue-300 border border-[#003B5C]/20">
                      {assessment.category || 'Assignment'}
                    </span>

                    {assessment.total_points && assessment.total_points > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-600">
                        <Award className="w-3 h-3 text-[#003B5C] dark:text-blue-400" />
                        <span>{assessment.total_points} Pts</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Subject */}
                  <div>
                    <Link
                      href={`/teacher/assessments/${assessment.id}`}
                      className="text-base sm:text-lg font-black text-gray-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors line-clamp-1"
                    >
                      {assessment.title}
                    </Link>
                  </div>

                  {/* Badges and Attributes */}
                  <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-gray-500 dark:text-gray-400 pt-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <BookOpen className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                      <span className="truncate max-w-[140px] sm:max-w-none text-gray-700 dark:text-gray-200">
                        {assessment.subjects?.name || 'Subject Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="text-gray-700 dark:text-gray-200">
                        {assessment.classes?.name || 'Class Unassigned'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>
                        {assessment.due_date 
                          ? new Date(assessment.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'No Deadline'
                        }
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span>{assessment.duration_minutes ? `${assessment.duration_minutes} mins` : 'Untimed'}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Toolbar */}
                <div className="flex items-center justify-end gap-1.5 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-750 shrink-0">
                  <Link
                    href={`/teacher/assessments/${assessment.id}`}
                    className="p-2 sm:px-3 sm:py-2 text-xs font-bold text-[#003B5C] dark:text-blue-400 bg-gray-50 dark:bg-gray-700/50 hover:bg-[#003B5C]/10 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    title="View Assessment"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Preview</span>
                  </Link>

                  <Link
                    href={`/teacher/assessments/edit/${assessment.id}`}
                    className="p-2 sm:px-3 sm:py-2 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition flex items-center gap-1.5 shadow-sm"
                    title="Edit Assessment"
                  >
                    <Edit className="w-4 h-4" />
                    <span className="hidden sm:inline">Edit</span>
                  </Link>

                  <button
                    onClick={() => setDeletingAssessment(assessment)}
                    className="p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 rounded-xl transition shadow-sm"
                    title="Delete Assessment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      {deletingAssessment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Delete Assessment?</h3>
                <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Permanent Action</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">&ldquo;{deletingAssessment.title}&rdquo;</strong>? 
              This will permanently delete questions, student submissions, and automated scoring entries associated with this quiz.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setDeletingAssessment(null)}
                disabled={isDeleting}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}