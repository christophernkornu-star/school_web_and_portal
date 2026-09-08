'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, FileText, BarChart3, Download, Users, 
  TrendingUp, Eye, Filter, CheckSquare, Square, Printer, 
  Wand2, Archive, ChevronDown, CheckCircle2, Award
} from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getAutoRemark } from '@/lib/remark-utils'
import { isClassTeacher } from '@/lib/teacher-permissions'
import { resolveActiveAcademicYear, filterTermsByActiveYear } from '@/lib/academic-year'

interface Student {
  id: string
  student_id: string
  first_name?: string
  middle_name?: string
  last_name?: string
  profiles: { full_name: string }
  averageScore?: number
  totalScore?: number
  position?: number
  subjectsCount?: number
}

export default function ReportsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [terms, setTerms] = useState<any[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [classPerformance, setClassPerformance] = useState<any>(null)
  const [view, setView] = useState<'overview' | 'students' | 'subjects'>('overview')
  const [subjectAnalysis, setSubjectAnalysis] = useState<any[]>([])
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkGenerating, setBulkGenerating] = useState(false)
  const [isAutoGenerating, setIsAutoGenerating] = useState(false)
  const [isTeacherClassTeacher, setIsTeacherClassTeacher] = useState(false)
  const [activeYear, setActiveYear] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          router.push('/login?portal=teacher')
          return
        }

        setTeacher(teacherData)

        const { data: assignmentsData } = await getTeacherAssignments(teacherData.id) as { data: any[] | null }
        if (assignmentsData) {
          setAssignments(assignmentsData)
          if (assignmentsData.length > 0) {
            setSelectedClass(assignmentsData[0].class_id)
          }
        }

        try {
          const year = await resolveActiveAcademicYear(supabase)
          setActiveYear(year)

          const termsResponse = await fetch('/api/terms-list', { cache: 'no-store' })
          if (termsResponse.ok) {
            const termsData = await termsResponse.json()
            const activeTerms = filterTermsByActiveYear(termsData || [], year)
            if (activeTerms && activeTerms.length > 0) {
              setTerms(activeTerms)
              setSelectedTerm(activeTerms[0].id)
            } else {
              setTerms([])
            }
          } else {
            const { data: termsData } = await supabase
              .from('academic_terms')
              .select('*')
              .order('start_date', { ascending: false })
              .order('academic_year', { ascending: false }) as { data: any[] | null }

            const activeTerms = filterTermsByActiveYear(termsData || [], year)
            if (activeTerms && activeTerms.length > 0) {
              setTerms(activeTerms)
              setSelectedTerm(activeTerms[0].id)
            } else {
              setTerms([])
            }
          }
        } catch (termsError) {
          console.error('Error loading terms:', termsError)
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadClassData()
    }
  }, [selectedClass, selectedTerm])

  useEffect(() => {
    const checkClassTeacher = async () => {
      if (teacher?.profile_id && selectedClass) {
        const isClass = await isClassTeacher(teacher.profile_id, selectedClass)
        setIsTeacherClassTeacher(isClass)
      } else {
        setIsTeacherClassTeacher(false)
      }
    }
    checkClassTeacher()
  }, [teacher, selectedClass])

  const loadClassData = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          middle_name,
          last_name,
          profile_id,
          profiles!students_profile_id_fkey(full_name),
          classes(id, name, level, category)
        `)
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name', { ascending: true })

      if (studentsError) throw studentsError
      if (!studentsData) throw new Error('Failed to load students')

      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          student_id,
          total,
          subjects(name)
        `)
        .eq('term_id', selectedTerm)
        .in('student_id', (studentsData as any)?.map((s: any) => s.id) || [])

      const classLevel = studentsData && studentsData.length > 0 ? (studentsData[0] as any).classes?.level : null
      let totalSubjectsCount = 0
      
      if (classLevel) {
        const { count } = await supabase
          .from('subjects')
          .select('*', { count: 'exact', head: true })
          .eq('level', classLevel)
        totalSubjectsCount = count || 0
      }

      const studentsWithScores: Student[] = (studentsData || []).map((student: any) => {
        const studentScores = scoresData?.filter((s: any) => s.student_id === student.id) || []
        const totalScore = studentScores.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
        
        const divisor = totalSubjectsCount > 0 ? totalSubjectsCount : (studentScores.length || 1)
        const averageScore = totalScore / divisor

        return {
          id: student.id,
          student_id: student.student_id,
          first_name: student.first_name,
          middle_name: student.middle_name,
          last_name: student.last_name,
          profiles: student.profiles || { full_name: '' },
          totalScore,
          averageScore: Math.round(averageScore * 10) / 10,
          subjectsCount: studentScores.length,
          position: 0
        }
      })

      const sorted = [...studentsWithScores].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
      sorted.forEach((student, index) => {
        student.position = index + 1
      })

      setStudents(sorted)

      const classAverage = sorted.reduce((sum, s) => sum + (s.averageScore || 0), 0) / (sorted.length || 1)
      const highestScore = sorted[0]?.averageScore || 0
      const lowestScore = sorted[sorted.length - 1]?.averageScore || 0
      
      setClassPerformance({
        totalStudents: sorted.length,
        classAverage: Math.round(classAverage * 10) / 10,
        highestScore,
        lowestScore,
        excellentCount: sorted.filter(s => (s.averageScore || 0) >= 80).length,
        goodCount: sorted.filter(s => (s.averageScore || 0) >= 60 && (s.averageScore || 0) < 80).length,
        averageCount: sorted.filter(s => (s.averageScore || 0) >= 40 && (s.averageScore || 0) < 60).length,
        poorCount: sorted.filter(s => (s.averageScore || 0) < 40).length,
      })

      const subjectGroups: Record<string, number[]> = {}
      scoresData?.forEach((score: any) => {
        const subjectData = score.subjects
        const subjectName = (subjectData && typeof subjectData === 'object' && !Array.isArray(subjectData)) 
          ? subjectData.name 
          : 'Unknown'
        if (!subjectGroups[subjectName]) {
          subjectGroups[subjectName] = []
        }
        subjectGroups[subjectName].push(score.total || 0)
      })

      const subjectStats = Object.entries(subjectGroups).map(([subject, scores]: [string, any]) => {
        const avg = scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length
        return {
          subject,
          average: Math.round(avg * 10) / 10,
          highest: Math.max(...scores),
          lowest: Math.min(...scores),
          studentsCount: scores.length
        }
      })

      setSubjectAnalysis(subjectStats.sort((a, b) => b.average - a.average))

    } catch (error) {
      console.error('Error loading class data:', error)
    }
  }

  const generateStudentReportCard = async (studentId: string) => {
    setGeneratingPDF(true)
    setSelectedStudentId(studentId)
    
    try {
      const reportCardUrl = `/teacher/reports/student/${studentId}?term=${selectedTerm}&class=${selectedClass}`
      router.push(reportCardUrl)
    } catch (error: any) {
      console.error('Error generating report card:', error)
      toast.error('Failed to generate report card: ' + error.message)
    } finally {
      setGeneratingPDF(false)
      setSelectedStudentId(null)
    }
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map(s => s.id))
    }
  }

  const generateBulkReportCards = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student')
      return
    }

    setBulkGenerating(true)
    try {
      const reportUrl = `/teacher/reports/bulk?students=${selectedStudents.join(',')}&term=${selectedTerm}&class=${selectedClass}`
      router.push(reportUrl)
    } catch (error: any) {
      console.error('Error generating bulk report cards:', error)
      toast.error('Failed to generate report cards: ' + error.message)
    } finally {
      setBulkGenerating(false)
    }
  }

  const generateAutoRemarksForAll = async () => {
    if (students.length === 0) {
      toast.error('No students found in this class.')
      return
    }

    if (!confirm('Are you sure you want to regenerate remarks for ALL students in this class for the selected term? This will overwrite existing auto-remarks.')) {
      return
    }

    setIsAutoGenerating(true)
    const toastId = toast.loading('Fetching attendance and calculating remarks...')

    try {
      const { data: attendanceData } = await supabase
        .from('student_attendance')
        .select('student_id, days_present')
        .eq('term_id', selectedTerm)

      const { data: termData, error: termError } = await supabase
        .from('academic_terms')
        .select('total_days')
        .eq('id', selectedTerm)
        .single()
        
      if (termError && termError.code !== 'PGRST116') {
        throw termError
      }

      const totalDays = termData?.total_days || 0
      const maxBatchSize = 100
      const remarksPayload = students.map(student => {
        const studentAttendance = attendanceData?.find((a: any) => a.student_id === student.id)
        const presentDays = studentAttendance?.days_present || 0
        const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : undefined
        
        const avgScore = student.averageScore || 0
        const seed = student.id

        return {
          student_id: student.id,
          term_id: selectedTerm,
          attitude: getAutoRemark('attitude', avgScore, attendancePercentage, seed),
          interest: getAutoRemark('interest', avgScore, attendancePercentage, seed),
          conduct: getAutoRemark('conduct', avgScore, attendancePercentage, seed),
          class_teacher_remark: getAutoRemark('classTeacher', avgScore, attendancePercentage, seed),
          head_teacher_remark: getAutoRemark('headTeacher', avgScore, attendancePercentage, seed)
        }
      })

      toast.loading(`Saving remarks for ${students.length} students...`, { id: toastId })

      for (let i = 0; i < remarksPayload.length; i += maxBatchSize) {
        const batch = remarksPayload.slice(i, i + maxBatchSize)
        const { error: saveError } = await supabase
          .from('student_remarks')
          .upsert(batch, { onConflict: 'student_id,term_id' })
          
        if (saveError) throw saveError
      }

      toast.success(`Successfully regenerated remarks for all ${students.length} students!`, { id: toastId })
    } catch (error: any) {
      console.error('Error generating auto-remarks bulk:', error)
      toast.error('Failed to generate remarks: ' + error.message, { id: toastId })
    } finally {
      setIsAutoGenerating(false)
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60'
    if (score >= 60) return 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60'
    if (score >= 40) return 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60'
    return 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/60'
  }

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Class Performance Reports</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Generate report cards, audit student achievements, and inspect class broadsheets
                </p>
              </div>
            </div>

            {/* Quick Actions Header Toolbar */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
              <Link 
                href="/teacher/class-report" 
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95"
              >
                <Printer className="w-4 h-4" />
                <span>Broadsheet</span>
              </Link>
              <Link 
                href="/teacher/reports/historical" 
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95"
              >
                <Archive className="w-4 h-4" />
                <span>Historical Archive</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* Active Session Notice Banner */}
        <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm text-blue-900 dark:text-blue-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Archive className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
            <span className="truncate">
              Showing active session for <strong>{activeYear || 'current academic year'}</strong>.
            </span>
          </div>
          <Link href="/teacher/reports/historical" className="shrink-0 text-xs font-bold text-[#003B5C] dark:text-blue-300 hover:underline">
            Browse past years →
          </Link>
        </div>

        {/* Filters Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-750 pb-3">
            <Filter className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
            <h2 className="font-black text-xs sm:text-sm uppercase tracking-wider text-gray-700 dark:text-gray-200">
              Filter Cohort & Session
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Class Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Class Cohort <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="">Select class</option>
                  {Array.from(new Set(assignments.map(a => a.class_id))).map(classId => {
                    const assignment = assignments.find(a => a.class_id === classId)
                    return (
                      <option key={classId} value={classId}>
                        {assignment?.classes?.name}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Term Selection Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Term Session <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  {terms.length === 0 ? (
                    <option value="">No terms found in session</option>
                  ) : (
                    terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name} ({term.academic_year})
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Segmented View Toggle Switcher */}
        <div className="w-full overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <div className="bg-gray-200/70 dark:bg-gray-800/90 p-1.5 rounded-2xl inline-flex items-center gap-1.5 min-w-full sm:min-w-0 shadow-inner">
            <button
              type="button"
              onClick={() => setView('overview')}
              className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                view === 'overview'
                  ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>Performance Overview</span>
            </button>

            <button
              type="button"
              onClick={() => setView('students')}
              className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                view === 'students'
                  ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Student Roster ({students.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setView('subjects')}
              className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                view === 'subjects'
                  ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 shrink-0" />
              <span>Subject Breakdown</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Overview View */}
        {view === 'overview' && classPerformance && (
          <div className="space-y-5 sm:space-y-6">
            {/* Primary KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Class Average</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 rounded-xl">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#003B5C] dark:text-blue-400">
                    {classPerformance.classAverage}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">Cohort academic average</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Total Enrolled</span>
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                    {classPerformance.totalStudents}
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">Active learners on register</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Highest Score</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    {classPerformance.highestScore}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">Top student average</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Lowest Score</span>
                  <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl">
                    <TrendingUp className="w-4 h-4 transform rotate-180" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-rose-600 dark:text-rose-400">
                    {classPerformance.lowestScore}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">Floor student average</p>
              </div>
            </div>

            {/* Performance Distribution Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
              <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Performance Stratification Matrix
              </h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl p-3.5 sm:p-4 text-center">
                  <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400">
                    {classPerformance.excellentCount}
                  </p>
                  <p className="text-[11px] sm:text-xs font-bold text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Excellent (≥80%)
                  </p>
                </div>

                <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl p-3.5 sm:p-4 text-center">
                  <p className="text-xl sm:text-2xl font-black text-blue-700 dark:text-blue-400">
                    {classPerformance.goodCount}
                  </p>
                  <p className="text-[11px] sm:text-xs font-bold text-blue-800 dark:text-blue-300 mt-0.5">
                    Good (60-79%)
                  </p>
                </div>

                <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-3.5 sm:p-4 text-center">
                  <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400">
                    {classPerformance.averageCount}
                  </p>
                  <p className="text-[11px] sm:text-xs font-bold text-amber-800 dark:text-amber-300 mt-0.5">
                    Average (40-59%)
                  </p>
                </div>

                <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-3.5 sm:p-4 text-center">
                  <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400">
                    {classPerformance.poorCount}
                  </p>
                  <p className="text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-300 mt-0.5">
                    Needs Help (&lt;40%)
                  </p>
                </div>
              </div>
            </div>

            {/* Students Needing Immediate Attention */}
            {classPerformance.poorCount > 0 && (
              <div className="bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300">
                  <Award className="w-5 h-5 shrink-0" />
                  <h3 className="text-sm sm:text-base font-black">
                    Learners Requiring Remedial Support ({classPerformance.poorCount})
                  </h3>
                </div>

                <div className="divide-y divide-rose-200/60 dark:divide-rose-900/40 border border-rose-200/60 dark:border-rose-900/40 rounded-2xl overflow-hidden bg-white/60 dark:bg-gray-800/60">
                  {students.filter(s => (s.averageScore || 0) < 40).map(student => (
                    <div key={student.id} className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                          {[student.last_name, student.middle_name, student.first_name].filter(Boolean).join(', ')}
                        </h4>
                        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                          ID: {student.student_id} • Average: <strong className="text-rose-600 dark:text-rose-400">{student.averageScore}%</strong>
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => generateStudentReportCard(student.id)}
                        className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/40 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold transition shrink-0"
                      >
                        Inspect
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Students Roster View */}
        {view === 'students' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden space-y-0">
            {/* Bulk Actions Header Toolbar */}
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  {selectedStudents.length === students.length && students.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                  <span>{selectedStudents.length === students.length && students.length > 0 ? 'Deselect All' : 'Select All'}</span>
                </button>

                {selectedStudents.length > 0 && (
                  <span className="text-xs font-bold text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/10 dark:bg-[#003B5C]/30 px-2.5 py-0.5 rounded-full">
                    {selectedStudents.length} selected
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {isTeacherClassTeacher && students.length > 0 && (
                  <button
                    type="button"
                    onClick={generateAutoRemarksForAll}
                    disabled={isAutoGenerating || students.length === 0}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
                  >
                    {isAutoGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        <span>Auto-Generate Remarks</span>
                      </>
                    )}
                  </button>
                )}

                {selectedStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={generateBulkReportCards}
                    disabled={bulkGenerating}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 active:scale-95"
                  >
                    {bulkGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Preparing...</span>
                      </>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>Print {selectedStudents.length} Report Cards</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Card Roster (< md) */}
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {students.map((student) => {
                const isSelected = selectedStudents.includes(student.id)
                return (
                  <div key={student.id} className={`p-4 space-y-3 transition ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-gray-50/50 dark:hover:bg-gray-750/50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <button type="button" onClick={() => toggleStudentSelection(student.id)} className="shrink-0 pt-0.5">
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {[student.last_name, student.middle_name, student.first_name].filter(Boolean).join(', ')}
                          </h4>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                            ID: {student.student_id} • Pos: <strong className="text-gray-700 dark:text-gray-300">{student.position}{getOrdinalSuffix(student.position || 0)}</strong>
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase shrink-0 ${getPerformanceColor(student.averageScore || 0)}`}>
                        {student.averageScore}%
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => generateStudentReportCard(student.id)}
                      disabled={generatingPDF && selectedStudentId === student.id}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/10 dark:bg-[#003B5C]/20 hover:bg-[#003B5C]/20 transition"
                    >
                      {generatingPDF && selectedStudentId === student.id ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-[#003B5C]/30 border-t-[#003B5C] rounded-full animate-spin" />
                          <span>Loading Report...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Report Card</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Tablet & Desktop Table Roster (≥ md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <button type="button" onClick={toggleSelectAll}>
                        {selectedStudents.length === students.length && students.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </th>
                    <th className="p-4 w-24 text-center">Position</th>
                    <th className="p-4 w-32">Student ID</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4 text-center w-32">Average</th>
                    <th className="p-4 text-center w-36">Performance</th>
                    <th className="p-4 text-right w-36">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                  {students.map((student) => {
                    const isSelected = selectedStudents.includes(student.id)
                    return (
                      <tr key={student.id} className={`transition ${isSelected ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'hover:bg-gray-50/60 dark:hover:bg-gray-750/50'}`}>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => toggleStudentSelection(student.id)}>
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                            ) : (
                              <Square className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        </td>

                        <td className="p-4 text-center font-bold text-gray-900 dark:text-white">
                          {student.position}{getOrdinalSuffix(student.position || 0)}
                        </td>

                        <td className="p-4 font-mono text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {student.student_id}
                        </td>

                        <td className="p-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          {[student.last_name, student.middle_name, student.first_name].filter(Boolean).join(', ')}
                        </td>

                        <td className="p-4 text-center font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                          {student.averageScore}%
                        </td>

                        <td className="p-4 text-center whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${getPerformanceColor(student.averageScore || 0)}`}>
                            {(student.averageScore || 0) >= 80 ? 'Excellent' :
                             (student.averageScore || 0) >= 60 ? 'Good' :
                             (student.averageScore || 0) >= 40 ? 'Average' : 'Needs Help'}
                          </span>
                        </td>

                        <td className="p-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => generateStudentReportCard(student.id)}
                            disabled={generatingPDF && selectedStudentId === student.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300 hover:bg-[#003B5C]/20 rounded-xl text-xs font-bold transition"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Report Card</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Subject Analysis View */}
        {view === 'subjects' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden space-y-0">
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-850">
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                Subject Performance Breakdown
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Inspect averages, highest marks, and floor scores for each subject
              </p>
            </div>

            {/* Mobile Card Subject View (< md) */}
            <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
              {subjectAnalysis.map((subject, index) => (
                <div key={index} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      {subject.subject}
                    </h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${getPerformanceColor(subject.average)}`}>
                      {subject.average}% avg
                    </span>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        subject.average >= 80 ? 'bg-emerald-500' :
                        subject.average >= 60 ? 'bg-blue-600' :
                        subject.average >= 40 ? 'bg-amber-500' : 'bg-rose-600'
                      }`}
                      style={{ width: `${subject.average}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Highest</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{subject.highest}%</span>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Lowest</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{subject.lowest}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop Subject Table (≥ md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                    <th className="p-4">Subject</th>
                    <th className="p-4 text-center w-36">Class Average</th>
                    <th className="p-4 text-center w-32">Highest</th>
                    <th className="p-4 text-center w-32">Lowest</th>
                    <th className="p-4 text-center w-48">Progress Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                  {subjectAnalysis.map((subject, index) => (
                    <tr key={index} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                      <td className="p-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        {subject.subject}
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${getPerformanceColor(subject.average)}`}>
                          {subject.average}%
                        </span>
                      </td>

                      <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                        {subject.highest}%
                      </td>

                      <td className="p-4 text-center font-bold text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap">
                        {subject.lowest}%
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              subject.average >= 80 ? 'bg-emerald-500' :
                              subject.average >= 60 ? 'bg-blue-600' :
                              subject.average >= 40 ? 'bg-amber-500' : 'bg-rose-600'
                            }`}
                            style={{ width: `${subject.average}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State Fallback */}
        {!selectedClass && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center text-gray-500 text-xs sm:text-sm space-y-2 border border-gray-200/80 dark:border-gray-700">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
            <p className="font-bold text-gray-800 dark:text-gray-200">No Class Assigned</p>
            <p>You have not been assigned to any classroom cohorts for performance reporting.</p>
          </div>
        )}
      </main>
    </div>
  )
}