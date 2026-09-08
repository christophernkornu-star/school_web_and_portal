'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Edit2, Save, Trash2, User, X, Check, 
  Search, Filter, BookOpen, Layers, CheckCircle2, 
  ChevronDown, Loader2, Sparkles, AlertCircle
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

export default function ReviewAssessmentDetail() {
  const params = useParams()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<any>(null)
  const [scores, setScores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState('')

  // Edit State
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null)
  const [editScore, setEditScore] = useState<string>('')
  const [savingScore, setSavingScore] = useState(false)

  useEffect(() => {
    loadAssessmentDetails()
  }, [assessmentId])

  const loadAssessmentDetails = async () => {
    try {
      // 1. Get Assessment Info
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('assessments')
        .select(`
          *,
          class_subjects (
            class_id,
            classes (name),
            subjects (name)
          )
        `)
        .eq('id', assessmentId)
        .single()

      if (assessmentError) throw assessmentError
      setAssessment(assessmentData)

      // 2. Get Class Students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', assessmentData.class_subjects?.class_id)
        .eq('status', 'active')
        .order('last_name', { ascending: true })

      if (studentsError) throw studentsError

      // 3. Get Scores
      const { data: scoresData, error: scoresError } = await supabase
        .from('student_scores')
        .select('id, score, student_id')
        .eq('assessment_id', assessmentId)
      
      if (scoresError) throw scoresError

      // 4. Merge Data
      const mergedScores = (studentsData || []).map((student: any) => {
        const scoreRecord = scoresData?.find((s: any) => s.student_id === student.id)
        return {
          id: scoreRecord?.id,
          student_id: student.id,
          score: scoreRecord?.score,
          students: student
        }
      })

      setScores(mergedScores)
    } catch (error) {
      console.error('Error loading assessment details:', error)
      toast.error('Failed to load assessment details')
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (studentId: string, currentScore: number | undefined) => {
    setEditingStudentId(studentId)
    setEditScore(currentScore !== undefined && currentScore !== null ? currentScore.toString() : '')
  }

  const cancelEditing = () => {
    setEditingStudentId(null)
    setEditScore('')
  }

  const saveScore = async (studentId: string) => {
    if (!assessment) return

    const numScore = parseFloat(editScore)
    if (isNaN(numScore) && editScore !== '') {
      toast.error('Please enter a valid number')
      return
    }

    if (!isNaN(numScore) && numScore > assessment.max_score) {
      toast.error(`Score cannot exceed max score of ${assessment.max_score}`)
      return
    }

    if (!isNaN(numScore) && numScore < 0) {
      toast.error('Score cannot be negative')
      return
    }

    setSavingScore(true)
    try {
      const { error } = await supabase
        .from('student_scores')
        .upsert({
          assessment_id: assessmentId,
          student_id: studentId,
          score: editScore === '' ? null : numScore
        }, {
          onConflict: 'assessment_id,student_id'
        })

      if (error) throw error

      toast.success('Score updated successfully')
      
      setScores(scores.map(s => 
        s.student_id === studentId 
          ? { ...s, score: editScore === '' ? undefined : numScore }
          : s
      ))
      setEditingStudentId(null)
    } catch (error: any) {
      console.error('Error saving score:', error)
      toast.error('Failed to save score')
    } finally {
      setSavingScore(false)
    }
  }

  // Filter Logic
  const filteredScores = useMemo(() => {
    return scores.filter((score) => {
      const s = score.students
      const fullName = `${s.first_name || ''} ${s.last_name || ''} ${s.middle_name || ''}`.toLowerCase()
      
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && !s.student_id?.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }

      if (genderFilter && s.gender?.toLowerCase() !== genderFilter.toLowerCase()) {
        return false
      }
      
      return true
    })
  }, [scores, searchQuery, genderFilter])

  // Summary Metrics
  const gradedCount = useMemo(() => {
    return scores.filter(s => s.score !== undefined && s.score !== null).length
  }, [scores])

  const classAverage = useMemo(() => {
    const validScores = scores
      .map(s => s.score)
      .filter((sc): sc is number => sc !== undefined && sc !== null)
    
    if (validScores.length === 0) return 0
    const sum = validScores.reduce((acc, curr) => acc + curr, 0)
    return Math.round((sum / validScores.length) * 10) / 10
  }, [scores])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-xl border border-gray-100 dark:border-gray-700">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Assessment Not Found</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            The requested assessment item could not be retrieved or has been removed.
          </p>
          <div className="pt-2">
            <Link 
              href="/teacher/review-assessments"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow transition"
            >
              Back to Assessments
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/review-assessments" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate">
                    {assessment.title || assessment.assessment_name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300 border border-[#003B5C]/20">
                    {assessment.assessment_type?.replace('_', ' ') || 'Class Work'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                  {assessment.class_subjects?.classes?.name} • {assessment.class_subjects?.subjects?.name} • Maximum: {assessment.max_score} Marks
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* Metric Overview Strip */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Class Cohort</span>
            <p className="text-xs sm:text-base font-bold text-gray-900 dark:text-white mt-1 truncate">
              {assessment.class_subjects?.classes?.name || 'Class'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Graded Ratio</span>
            <p className="text-xs sm:text-base font-bold text-[#003B5C] dark:text-blue-400 mt-1">
              {gradedCount} / {scores.length} <span className="text-[11px] text-gray-400 font-normal hidden sm:inline">students</span>
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Average Score</span>
            <p className="text-xs sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {classAverage} <span className="text-[11px] text-gray-400 font-normal">/ {assessment.max_score}</span>
            </p>
          </div>
        </div>

        {/* Student Marks Table / Cards Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden space-y-0">
          
          {/* Controls Bar: Search & Gender Filter */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5 bg-gray-50/50 dark:bg-gray-850">
            <div className="flex items-center gap-2">
              <h2 className="font-black text-sm sm:text-base text-gray-900 dark:text-white">
                Learner Submissions
              </h2>
              <span className="text-xs font-bold text-gray-400 font-mono">
                ({filteredScores.length})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search student or ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
              </div>

              <div className="relative w-full sm:w-36">
                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="w-full pl-3.5 pr-8 py-2 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="">All Genders</option>
                  <option value="Male">Boys Only</option>
                  <option value="Female">Girls Only</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {filteredScores.length === 0 ? (
            <div className="p-10 sm:p-14 text-center text-xs text-gray-400 space-y-1">
              <p className="font-bold text-gray-700 dark:text-gray-300">No students found matching your criteria</p>
              <p>Adjust your search query or gender filter to inspect marks.</p>
            </div>
          ) : (
            <>
              {/* MOBILE CARD VIEW (< md) */}
              <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                {filteredScores.map((score) => {
                  const hasScore = score.score !== undefined && score.score !== null
                  const percentage = hasScore && assessment.max_score > 0 
                    ? Math.round((score.score / assessment.max_score) * 100) 
                    : 0
                  const isEditing = editingStudentId === score.student_id

                  return (
                    <div key={score.student_id} className="p-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                            {score.students?.first_name?.[0]}{score.students?.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {[score.students?.last_name, score.students?.first_name].filter(Boolean).join(', ')}
                            </h4>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {score.students?.student_id} {score.students?.gender ? `• ${score.students.gender}` : ''}
                            </p>
                          </div>
                        </div>

                        {hasScore ? (
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                            percentage >= 50
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60'
                          }`}>
                            {percentage}%
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-400 dark:bg-gray-800 shrink-0">
                            Ungraded
                          </span>
                        )}
                      </div>

                      {/* Inline Edit or Display */}
                      <div className="bg-gray-50/80 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          Raw Score:
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="number" 
                              value={editScore}
                              onChange={e => setEditScore(e.target.value)}
                              className="w-16 h-8 px-2 text-xs font-mono font-bold text-center border border-[#003B5C] rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none"
                              autoFocus
                              min="0"
                              max={assessment.max_score}
                              step="0.1"
                            />
                            <span className="text-[11px] text-gray-400 font-bold">/ {assessment.max_score}</span>
                            <button 
                              type="button"
                              onClick={() => saveScore(score.student_id)}
                              disabled={savingScore}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              type="button"
                              onClick={cancelEditing}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs sm:text-sm text-gray-800 dark:text-gray-200">
                              {hasScore ? score.score : '—'} <span className="text-xs text-gray-400 font-normal">/ {assessment.max_score}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditing(score.student_id, score.score)}
                              className="p-1.5 text-gray-400 hover:text-[#003B5C] dark:hover:text-blue-400 rounded-lg transition"
                              title="Edit Mark"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* TABLET & DESKTOP TABLE VIEW (≥ md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                      <th className="p-4">Student</th>
                      <th className="p-4 text-center w-28">Gender</th>
                      <th className="p-4 text-center w-48">Raw Score</th>
                      <th className="p-4 text-right w-36">Scaled %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                    {filteredScores.map((score) => {
                      const hasScore = score.score !== undefined && score.score !== null
                      const percentage = hasScore && assessment.max_score > 0 
                        ? Math.round((score.score / assessment.max_score) * 100) 
                        : 0
                      const isEditing = editingStudentId === score.student_id

                      return (
                        <tr key={score.student_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition group">
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {[score.students?.last_name, score.students?.first_name].filter(Boolean).join(', ')}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {score.students?.student_id}
                            </div>
                          </td>

                          <td className="p-4 text-center whitespace-nowrap text-gray-500 dark:text-gray-400">
                            {score.students?.gender || '—'}
                          </td>

                          <td className="p-4 text-center whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <input 
                                  type="number" 
                                  value={editScore}
                                  onChange={e => setEditScore(e.target.value)}
                                  className="w-16 h-8 px-2 text-xs font-mono font-bold text-center border border-[#003B5C] rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                                  autoFocus
                                  min="0"
                                  max={assessment.max_score}
                                  step="0.1"
                                />
                                <span className="text-[11px] text-gray-400 font-bold">/ {assessment.max_score}</span>
                                <button 
                                  type="button"
                                  onClick={() => saveScore(score.student_id)}
                                  disabled={savingScore}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button 
                                  type="button"
                                  onClick={cancelEditing}
                                  className="p-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-mono font-bold text-gray-800 dark:text-gray-200">
                                  {hasScore ? score.score : '—'}{' '}
                                  <span className="text-gray-400 text-xs font-normal">/ {assessment.max_score}</span>
                                </span>
                                <button 
                                  type="button"
                                  onClick={() => startEditing(score.student_id, score.score)}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-[#003B5C] dark:hover:text-blue-400 rounded transition"
                                  title="Edit Score"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          <td className="p-4 text-right whitespace-nowrap">
                            {hasScore ? (
                              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-black ${
                                percentage >= 50 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60'
                              }`}>
                                {percentage}%
                              </span>
                            ) : (
                              <span className="text-gray-400 font-medium text-xs">Not graded</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}