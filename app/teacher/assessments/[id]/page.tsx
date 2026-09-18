'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import BackButton from '@/components/ui/back-button'
import { 
  ArrowLeft, 
  UploadCloud, 
  Users, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Trash2, 
  Search, 
  Filter, 
  Edit3, 
  ChevronRight, 
  GraduationCap, 
  BookOpen, 
  AlertCircle,
  X,
  FileCheck
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function QuizDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const quizId = params.id as string

  const [quiz, setQuiz] = useState<any>(null)
  const [attempts, setAttempts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // 1. Fetch Quiz Details
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

        // 2. Fetch Attempts with Student Profile
        const { data: attemptsData, error: attemptsError } = await supabase
          .from('student_quiz_attempts')
          .select(`
            *,
            students (
              first_name,
              last_name,
              middle_name,
              gender,
              student_id
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
  }, [quizId, supabase])

  const handleSync = async () => {
    if (!confirm('This will update the continuous gradebook with these scores. Existing marks for this assessment will be overwritten. Continue?')) {
      return
    }

    try {
      setSyncing(true)
      const { error } = await supabase.rpc('sync_scores_to_gradebook', {
        p_quiz_id: quizId
      })

      if (error) throw error
      toast.success('Scores pushed to gradebook successfully!')
    } catch (error: any) {
      console.error('Sync error:', error)
      toast.error(error.message || 'Failed to sync scores')
    } finally {
      setSyncing(false)
    }
  }

  const handleUnsync = async () => {
    if (!confirm("This will remove this quiz's scores from the gradebook and restore prior scores. Continue?")) {
      return
    }

    try {
      setReverting(true)
      const { data, error } = await supabase.rpc('unsync_scores_from_gradebook', {
        p_quiz_id: quizId
      })

      if (error) throw error

      if (data === false) {
        toast('Nothing to revert — this quiz was never pushed to the gradebook.', { icon: 'ℹ️' })
      } else {
        toast.success('Reverted. Gradebook restored to previous state.')
      }
    } catch (error: any) {
      console.error('Unsync error:', error)
      toast.error(error.message || 'Failed to revert scores')
    } finally {
      setReverting(false)
    }
  }

  const handleDeleteAttempt = async (attemptId: string) => {
    if (!confirm('Are you sure you want to reset this attempt? This will permanently delete submitted answers and allow the learner to retake.')) {
      return
    }

    try {
      setDeletingId(attemptId)
      const { error } = await supabase
        .from('student_quiz_attempts')
        .delete()
        .eq('id', attemptId)

      if (error) throw error

      toast.success('Attempt reset. Student can now retake.')
      setAttempts(prev => prev.filter(a => a.id !== attemptId))
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error('Failed to reset attempt')
    } finally {
      setDeletingId(null)
    }
  }

  const filteredAttempts = useMemo(() => {
    return attempts.filter((attempt) => {
      const s = attempt.students
      const fullName = `${s?.first_name || ''} ${s?.middle_name || ''} ${s?.last_name || ''} ${s?.student_id || ''}`.toLowerCase()
      
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase())) {
        return false
      }

      if (genderFilter && s?.gender?.toLowerCase() !== genderFilter.toLowerCase()) {
        return false
      }
      
      return true
    })
  }, [attempts, searchQuery, genderFilter])

  const avgScore = useMemo(() => {
    if (attempts.length === 0) return 0
    const total = attempts.reduce((sum, a) => sum + (a.score || 0), 0)
    return (total / attempts.length).toFixed(1)
  }, [attempts])

  const avgPercentage = useMemo(() => {
    if (!quiz?.total_points || attempts.length === 0) return 0
    return Math.round((Number(avgScore) / quiz.total_points) * 100)
  }, [avgScore, quiz])

  if (loading) {
    return <QuizDetailsSkeleton />
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Assessment Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested quiz record could not be located or has been archived.</p>
          <BackButton href="/teacher/assessments" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white pb-12">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            
            {/* Title & Metadata */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/teacher/assessments" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    {quiz.title}
                  </h1>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  <span className="font-bold text-[#003B5C] dark:text-blue-400">{quiz.classes?.name}</span>
                  <span>•</span>
                  <span>{quiz.subjects?.name}</span>
                  <span>•</span>
                  <span>{quiz.total_points} Max Marks</span>
                </div>
              </div>
            </div>

            {/* Actions Cluster */}
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 sm:gap-2.5 w-full md:w-auto shrink-0">
              <Link
                href={`/teacher/assessments/edit/${quizId}`}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition active:scale-95 text-center shadow-2xs"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>Edit</span>
              </Link>

              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 text-center cursor-pointer"
                title="Overwrite gradebook with latest submitted scores"
              >
                <UploadCloud className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">{syncing ? 'Pushing...' : 'Push to Gradebook'}</span>
              </button>

              <button
                type="button"
                onClick={handleUnsync}
                disabled={reverting}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 text-center cursor-pointer shadow-2xs"
                title="Remove quiz scores from main gradebook"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{reverting ? 'Reverting...' : 'Unsync'}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* KPI Strip */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 md:gap-4">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Total Submissions
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                {attempts.length}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Learners attempted</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0 ml-1">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Class Average
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {avgScore}
                <span className="text-xs font-normal text-slate-400 font-sans ml-1">
                  / {quiz.total_points} ({avgPercentage}%)
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Average score</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center shrink-0 ml-1">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Publication Status
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                  quiz.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                }`}>
                  {quiz.status}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                {quiz.duration_minutes ? `${quiz.duration_minutes} mins allowed` : 'Untimed'}
              </p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 flex items-center justify-center shrink-0 ml-1">
              <Clock className="w-5 h-5" />
            </div>
          </div>
        </section>

        {/* Results Roster Section */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          
          {/* Card Header & Filter Bar */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="space-y-0.5">
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <span>Student Submissions &amp; Grades</span>
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Showing {filteredAttempts.length} of {attempts.length} attempts
              </p>
            </div>

            {/* Search & Gender Filter Inputs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="relative sm:w-36">
                <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer appearance-none transition"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Male Only</option>
                  <option value="Female">Female Only</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                </div>
              </div>
            </div>
          </div>

          {/* Records Display */}
          {attempts.length === 0 ? (
            <div className="p-10 sm:p-16 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
                <Users className="w-6 h-6 opacity-35" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">No Attempts Recorded</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Students enrolled in this cohort have not submitted answers for this assessment yet.
                </p>
              </div>
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="p-8 sm:p-12 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                No students match your active filter criteria.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setGenderFilter('')
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline"
              >
                Reset Search Filters
              </button>
            </div>
          ) : (
            <div>
              {/* Mobile Card List (< sm screens) */}
              <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAttempts.map((attempt) => {
                  const s = attempt.students
                  const studentName = `${s?.last_name || ''} ${s?.first_name || ''} ${s?.middle_name || ''}`.trim() || 'Learner'
                  const percentage = quiz.total_points > 0
                    ? Math.round((attempt.score / quiz.total_points) * 100)
                    : 0
                  const isSubmitted = attempt.status === 'submitted'

                  return (
                    <div key={attempt.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {studentName}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 mt-0.5">
                            <span>ID: {s?.student_id || '---'}</span>
                            <span>•</span>
                            <span>{s?.gender || '---'}</span>
                          </div>
                        </div>

                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                          isSubmitted
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                        }`}>
                          {isSubmitted ? 'Needs Grading' : attempt.status}
                        </span>
                      </div>

                      {/* Score & Progress Bar */}
                      <div className="space-y-1.5 bg-slate-50/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between items-baseline text-xs">
                          <span className="text-[11px] font-semibold text-slate-500">Score:</span>
                          <span className="font-mono font-black text-slate-900 dark:text-white">
                            {attempt.score} <span className="text-[10px] font-normal text-slate-400">/ {quiz.total_points} ({percentage}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              percentage >= 70 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-[#003B5C]' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(attempt.end_time || attempt.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          {isSubmitted ? (
                            <Link
                              href={`/teacher/assessments/${quizId}/grade/${attempt.id}`}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow-2xs inline-flex items-center gap-1"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Grade</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/teacher/assessments/${quizId}/grade/${attempt.id}`}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition active:scale-95 inline-flex items-center gap-1"
                            >
                              <span>Review</span>
                            </Link>
                          )}

                          <button 
                            type="button"
                            onClick={() => handleDeleteAttempt(attempt.id)}
                            disabled={deletingId === attempt.id}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition active:scale-95 disabled:opacity-50"
                            title="Reset attempt and allow retake"
                          >
                            <RotateCcw className={`w-4 h-4 ${deletingId === attempt.id ? 'animate-spin' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Desktop Table View (≥ sm screens) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5">Learner Name &amp; ID</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Gender</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center font-mono">Raw Mark</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center font-mono">Percentage</th>
                      <th className="px-3 sm:px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 py-3.5 font-mono text-slate-400 text-right">Submitted</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredAttempts.map((attempt) => {
                      const s = attempt.students
                      const studentName = `${s?.last_name || ''} ${s?.first_name || ''} ${s?.middle_name || ''}`.trim() || 'Learner'
                      const percentage = quiz.total_points > 0 
                        ? ((attempt.score / quiz.total_points) * 100).toFixed(1) 
                        : '0'
                      const isSubmitted = attempt.status === 'submitted'

                      return (
                        <tr key={attempt.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {studentName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {s?.student_id || '---'}
                            </div>
                          </td>

                          <td className="px-3 sm:px-4 py-3.5 text-center text-slate-600 dark:text-slate-300 font-medium">
                            {s?.gender || '---'}
                          </td>

                          <td className="px-3 sm:px-4 py-3.5 text-center font-mono font-black text-slate-900 dark:text-white text-sm">
                            {attempt.score}
                            <span className="text-[11px] font-normal text-slate-400 ml-1 font-sans">
                              / {quiz.total_points}
                            </span>
                          </td>

                          <td className="px-3 sm:px-4 py-3.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {percentage}%
                          </td>

                          <td className="px-3 sm:px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                              isSubmitted
                                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                            }`}>
                              {isSubmitted ? 'Needs Grading' : attempt.status}
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-right text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(attempt.end_time || attempt.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </td>

                          <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isSubmitted ? (
                                <Link
                                  href={`/teacher/assessments/${quizId}/grade/${attempt.id}`}
                                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition active:scale-95 shadow-2xs"
                                >
                                  Grade
                                </Link>
                              ) : (
                                <Link
                                  href={`/teacher/assessments/${quizId}/grade/${attempt.id}`}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition active:scale-95"
                                >
                                  Review
                                </Link>
                              )}

                              <button 
                                type="button"
                                onClick={() => handleDeleteAttempt(attempt.id)}
                                disabled={deletingId === attempt.id}
                                className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition active:scale-95 disabled:opacity-50"
                                title="Reset attempt (Allow retake)"
                              >
                                <RotateCcw className={`w-3.5 h-3.5 ${deletingId === attempt.id ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>

      </main>

    </div>
  )
}

function QuizDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-44 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-4 flex-1">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl col-span-2 sm:col-span-1" />
        </div>
        <Skeleton className="h-80 w-full rounded-2xl sm:rounded-3xl" />
      </main>
    </div>
  )
}