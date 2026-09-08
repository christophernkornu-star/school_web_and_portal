'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, BarChart3, TrendingUp, Award, Users, AlertCircle, 
  Download, Filter, BookOpen, Target, TrendingDown, Minus, 
  FileText, ChevronDown, CheckCircle2, Calendar, UserCheck, AlertTriangle
} from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { getTermOrderParts } from '@/lib/academic-utils'
import { resolveActiveAcademicYear } from '@/lib/academic-year'
import { 
  LineChart, Line, BarChart, Bar, Cell, ReferenceLine,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface PerformanceStats {
  classAverage: number
  passRate: number
  totalStudents: number
  passedStudents: number
  topPerformers: number
  averagePerformers: number
  strugglingStudents: number
}

interface SubjectPerformance {
  subject_id: string
  subject_name: string
  average: number
  highest: number
  lowest: number
  studentCount: number
}

interface GradeDistribution {
  grade: string
  count: number
  percentage: number
}

interface StudentPerformance {
  student_id: string
  student_name: string
  short_name: string
  student_number: string
  average: number
  subjects_count: number
  trend: 'up' | 'down' | 'stable'
}

interface TermTrend {
  termName: string
  classAverage: number
  passRate: number
}

interface SubjectTrend {
  termName: string
  [key: string]: number | string
}

export default function PerformancePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([])
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([])
  const [allStudents, setAllStudents] = useState<StudentPerformance[]>([])
  const [topStudents, setTopStudents] = useState<StudentPerformance[]>([])
  const [strugglingStudents, setStrugglingStudents] = useState<StudentPerformance[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [classes, setClasses] = useState<any[]>([])
  const [activeTerms, setActiveTerms] = useState<any[]>([])
  const [activeAcademicYear, setActiveAcademicYear] = useState<string>('')
  const [initialized, setInitialized] = useState(false)
  const [overallTrends, setOverallTrends] = useState<TermTrend[]>([])
  const [subjectTrends, setSubjectTrends] = useState<SubjectTrend[]>([])
  const [selectedSubjectForTrend, setSelectedSubjectForTrend] = useState<string>('')
  const [studentChartFilter, setStudentChartFilter] = useState<'top10' | 'struggling' | 'all'>('top10')

  useEffect(() => {
    if (!initialized) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (initialized && selectedTerm) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedTerm])

  async function loadData() {
    try {
      setLoading(true)
      setError(null)

      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
      if (teacherError || !teacherData) {
        setError('Failed to load teacher profile')
        return
      }

      setTeacherId(teacherData.teacher_id)

      const classAccess = await getTeacherClassAccess(teacherData.profile_id)
      setClasses(classAccess)

      // Resolve Active Academic Year
      let currentYear = ''
      try {
        currentYear = await resolveActiveAcademicYear(supabase)
      } catch (err) {
        console.warn('Failed to resolve active year:', err)
      }

      const { data: allTermsData } = await supabase
        .from('academic_terms')
        .select('*')
        .order('start_date', { ascending: true }) as { data: any[] | null }

      const { data: currentTermSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'current_term')
        .maybeSingle() as { data: any; error: any }

      const resolvedCurrentTermId = currentTermSetting?.setting_value || null

      if (!currentYear && allTermsData && allTermsData.length > 0) {
        const found = allTermsData.find((t: any) => t.is_current || t.id === resolvedCurrentTermId)
        currentYear = found?.academic_year || allTermsData[allTermsData.length - 1]?.academic_year || ''
      }

      setActiveAcademicYear(currentYear)

      // Filter terms strictly to the active year
      const yearFilteredTerms = (allTermsData || [])
        .filter((t: any) => String(t.academic_year) === String(currentYear))
        .sort((a: any, b: any) => {
          const [, ta] = getTermOrderParts(a.name, a.academic_year)
          const [, tb] = getTermOrderParts(b.name, b.academic_year)
          if (ta !== tb) return ta - tb
          return (new Date(a.start_date || 0).getTime()) - (new Date(b.start_date || 0).getTime())
        })

      setActiveTerms(yearFilteredTerms)

      let termIdToQuery = selectedTerm
      const isSelectionInActiveYear = yearFilteredTerms.some((t: any) => t.id === selectedTerm)

      if (!isSelectionInActiveYear || !selectedTerm) {
        const currentTermInYear = yearFilteredTerms.find((t: any) => t.is_current) || 
                                  yearFilteredTerms.find((t: any) => t.id === resolvedCurrentTermId)
        const defaultTerm = currentTermInYear || yearFilteredTerms[0]
        termIdToQuery = defaultTerm?.id || ''
        setSelectedTerm(termIdToQuery)
      }

      const classIds = selectedClass === 'all' 
        ? classAccess.map(c => c.class_id)
        : [selectedClass]

      if (classIds.length === 0) {
        setError('No classes assigned to your profile')
        setLoading(false)
        setInitialized(true)
        return
      }

      if (!termIdToQuery) {
        setStats({
          classAverage: 0,
          passRate: 0,
          totalStudents: 0,
          passedStudents: 0,
          topPerformers: 0,
          averagePerformers: 0,
          strugglingStudents: 0
        })
        setLoading(false)
        setInitialized(true)
        return
      }

      await Promise.all([
        loadStudentAndClassMetrics(classIds, termIdToQuery),
        loadSubjectPerformance(classIds, termIdToQuery),
        loadPerformanceTrends(classIds, yearFilteredTerms)
      ])

      setInitialized(true)
    } catch (err: any) {
      console.error('Error loading performance data:', err)
      setError('Failed to load performance data')
      setInitialized(true)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudentAndClassMetrics(classIds: string[], termId: string) {
    try {
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          student_id,
          total,
          students!inner(
            student_id,
            first_name,
            last_name,
            class_id
          )
        `)
        .in('students.class_id', classIds)
        .eq('term_id', termId) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      if (!scoresData || scoresData.length === 0) {
        setStats({
          classAverage: 0,
          passRate: 0,
          totalStudents: 0,
          passedStudents: 0,
          topPerformers: 0,
          averagePerformers: 0,
          strugglingStudents: 0
        })
        setAllStudents([])
        setTopStudents([])
        setStrugglingStudents([])
        setGradeDistribution([])
        return
      }

      const studentMap = new Map<string, { student: any, totals: number[] }>()
      
      scoresData.forEach((score: any) => {
        if (!studentMap.has(score.student_id)) {
          studentMap.set(score.student_id, {
            student: score.students,
            totals: []
          })
        }
        studentMap.get(score.student_id)!.totals.push(score.total)
      })

      const studentList: StudentPerformance[] = Array.from(studentMap.entries()).map(([studentId, data]) => {
        const average = data.totals.reduce((sum, t) => sum + t, 0) / data.totals.length
        const s = data.student
        const shortName = `${s.first_name} ${s.last_name ? s.last_name.charAt(0) + '.' : ''}`
        
        return {
          student_id: studentId,
          student_name: `${s.first_name} ${s.last_name}`,
          short_name: shortName,
          student_number: s.student_id,
          average: Math.round(average * 10) / 10,
          subjects_count: data.totals.length,
          trend: 'stable' as const
        }
      })

      studentList.sort((a, b) => b.average - a.average)
      setAllStudents(studentList)

      const top = studentList.slice(0, 10)
      setTopStudents(top)

      const struggling = studentList.filter(s => s.average < 50)
      setStrugglingStudents(struggling)

      const totalStudents = studentList.length
      const classAverage = studentList.reduce((sum, s) => sum + s.average, 0) / totalStudents
      const passedStudents = studentList.filter(s => s.average >= 50).length
      const passRate = (passedStudents / totalStudents) * 100
      const topPerformers = studentList.filter(s => s.average >= 80).length
      const averagePerformers = studentList.filter(s => s.average >= 50 && s.average < 80).length
      const strugglingStudentsCount = studentList.filter(s => s.average < 50).length

      setStats({
        classAverage: Math.round(classAverage * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        totalStudents,
        passedStudents,
        topPerformers,
        averagePerformers,
        strugglingStudents: strugglingStudentsCount
      })

      const gradeCount = {
        'A': studentList.filter(a => a.average >= 80).length,
        'B': studentList.filter(a => a.average >= 70 && a.average < 80).length,
        'C': studentList.filter(a => a.average >= 60 && a.average < 70).length,
        'D': studentList.filter(a => a.average >= 50 && a.average < 60).length,
        'E': studentList.filter(a => a.average >= 40 && a.average < 50).length,
        'F': studentList.filter(a => a.average < 40).length
      }

      const distribution: GradeDistribution[] = Object.entries(gradeCount).map(([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / totalStudents) * 100 * 10) / 10
      }))

      setGradeDistribution(distribution)
    } catch (err) {
      console.error('Error loading student metrics:', err)
    }
  }

  async function loadSubjectPerformance(classIds: string[], termId: string) {
    try {
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          total,
          subject_id,
          subjects!inner(name),
          students!inner(class_id)
        `)
        .in('students.class_id', classIds)
        .eq('term_id', termId) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      if (!scoresData || scoresData.length === 0) {
        setSubjectPerformance([])
        return
      }

      const subjectMap = new Map<string, { name: string, scores: number[] }>()
      
      scoresData.forEach((score: any) => {
        if (!subjectMap.has(score.subject_id)) {
          subjectMap.set(score.subject_id, {
            name: score.subjects.name,
            scores: []
          })
        }
        subjectMap.get(score.subject_id)!.scores.push(score.total)
      })

      const performance: SubjectPerformance[] = Array.from(subjectMap.entries()).map(([subjectId, data]) => {
        const scores = data.scores
        const average = scores.reduce((sum, s) => sum + s, 0) / scores.length
        const highest = Math.max(...scores)
        const lowest = Math.min(...scores)

        return {
          subject_id: subjectId,
          subject_name: data.name,
          average: Math.round(average * 10) / 10,
          highest,
          lowest,
          studentCount: scores.length
        }
      })

      performance.sort((a, b) => b.average - a.average)
      setSubjectPerformance(performance)
    } catch (err) {
      console.error('Error loading subject performance:', err)
    }
  }

  async function loadPerformanceTrends(classIds: string[], yearTerms: any[]) {
    try {
      if (yearTerms.length < 2) {
        setOverallTrends([])
        setSubjectTrends([])
        return
      }

      const termIds = yearTerms.map((t: any) => t.id)

      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          student_id,
          term_id,
          subject_id,
          total,
          students!inner(class_id),
          subjects(name),
          academic_terms!inner(id, name, academic_year, start_date)
        `)
        .in('students.class_id', classIds)
        .in('term_id', termIds) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      if (!scoresData || scoresData.length === 0) {
        setOverallTrends([])
        setSubjectTrends([])
        return
      }

      const termAverages = new Map<string, { sum: number; count: number; name: string; passCount: number; startDate: string; academicYear: string }>()
      
      scoresData.forEach((score: any) => {
        const termId = score.term_id
        const termName = score.academic_terms?.name || 'Unknown'
        const startDate = score.academic_terms?.start_date || ''
        const academicYear = score.academic_terms?.academic_year || ''
        
        if (!termAverages.has(termId)) {
          termAverages.set(termId, { sum: 0, count: 0, name: termName, passCount: 0, startDate, academicYear })
        }
        
        const termData = termAverages.get(termId)!
        termData.sum += score.total
        termData.count += 1
        if (score.total >= 50) termData.passCount += 1
      })

      const overallTrendData: TermTrend[] = Array.from(termAverages.entries())
        .map(([termId, data]) => ({
          termName: data.name,
          classAverage: Math.round((data.sum / data.count) * 10) / 10,
          passRate: Math.round((data.passCount / data.count) * 100 * 10) / 10,
          academicYear: data.academicYear
        }))
        .sort((a: any, b: any) => {
          const [, ta] = getTermOrderParts(a.termName, a.academicYear)
          const [, tb] = getTermOrderParts(b.termName, b.academicYear)
          return ta - tb
        })
        .map(({ academicYear, ...rest }) => rest)

      setOverallTrends(overallTrendData)

      const subjectTermMap = new Map<string, Map<string, { sum: number; count: number; termName: string }>>()
      
      scoresData.forEach((score: any) => {
        const subjectId = score.subject_id
        const termId = score.term_id
        const termName = score.academic_terms?.name || 'Unknown'
        
        if (!subjectTermMap.has(subjectId)) {
          subjectTermMap.set(subjectId, new Map())
        }
        
        const termMap = subjectTermMap.get(subjectId)!
        if (!termMap.has(termId)) {
          termMap.set(termId, { sum: 0, count: 0, termName })
        }
        
        const termData = termMap.get(termId)!
        termData.sum += score.total
        termData.count += 1
      })

      let maxSubjectId = ''
      let maxDataPoints = 0
      
      subjectTermMap.forEach((termMap, subjectId) => {
        if (termMap.size > maxDataPoints) {
          maxDataPoints = termMap.size
          maxSubjectId = subjectId
        }
      })

      if (maxSubjectId) {
        setSelectedSubjectForTrend(maxSubjectId)
      }

      const subjectTrendData: SubjectTrend[] = yearTerms.map((term: any) => {
        const dataPoint: SubjectTrend = { termName: term.name }
        
        subjectTermMap.forEach((termMap, subjectId) => {
          const termData = termMap.get(term.id)
          if (termData) {
            const average = termData.sum / termData.count
            dataPoint[subjectId] = Math.round(average * 10) / 10
          }
        })
        
        return dataPoint
      })

      setSubjectTrends(subjectTrendData)
    } catch (err) {
      console.error('Error loading performance trends:', err)
    }
  }

  const studentChartData = useMemo(() => {
    if (studentChartFilter === 'top10') {
      return topStudents
    } else if (studentChartFilter === 'struggling') {
      return strugglingStudents.length > 0 ? strugglingStudents : []
    }
    return allStudents.slice(0, 30)
  }, [studentChartFilter, topStudents, strugglingStudents, allStudents])

  function exportToCSV() {
    if (!stats || !subjectPerformance || !topStudents) return

    let csv = `Performance Analytics Report - Academic Year ${activeAcademicYear}\n\n`
    csv += 'Overall Statistics\n'
    csv += `Class Average,${stats.classAverage}%\n`
    csv += `Pass Rate,${stats.passRate}%\n`
    csv += `Total Students,${stats.totalStudents}\n`
    csv += `Passed Students,${stats.passedStudents}\n\n`

    csv += 'Subject Performance\n'
    csv += 'Subject,Average,Highest,Lowest,Student Count\n'
    subjectPerformance.forEach(subject => {
      csv += `${subject.subject_name},${subject.average},${subject.highest},${subject.lowest},${subject.studentCount}\n`
    })

    csv += '\nStudent Rankings\n'
    csv += 'Student ID,Name,Average,Subjects Count\n'
    allStudents.forEach(student => {
      csv += `${student.student_number},"${student.student_name}",${student.average},${student.subjects_count}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-analytics-${activeAcademicYear.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-32 w-full rounded-2xl sm:rounded-3xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-80 rounded-3xl" />
            <Skeleton className="h-80 rounded-3xl" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl mx-auto flex items-center justify-center">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">Error Loading Data</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{error}</p>
          <button
            onClick={() => loadData()}
            className="w-full py-2.5 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            Retry Loading
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <BarChart3 className="w-6 h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Performance Analytics</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate flex items-center gap-2">
                  <span>Track student performance</span>
                  {activeAcademicYear && (
                    <span className="bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-300 px-2 py-0.5 rounded-md font-bold text-[11px]">
                      {activeAcademicYear} Session
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={exportToCSV}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Filters Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
              <h3 className="font-black text-xs sm:text-sm uppercase tracking-wider text-gray-700 dark:text-gray-200">
                Filter Cohort & Term
              </h3>
            </div>

            {activeAcademicYear && (
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#003B5C] dark:text-blue-400" />
                <span>Active Year: <strong>{activeAcademicYear}</strong></span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Class Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Target Class
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="all">All Assigned Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Term Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Term ({activeAcademicYear || 'Active Year'})
              </label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="w-full pl-4 sm:pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  {activeTerms.length === 0 ? (
                    <option value="">No terms in active session</option>
                  ) : (
                    activeTerms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.name} {term.is_current ? '• Current' : ''}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {stats && stats.totalStudents > 0 ? (
          <>
            {/* Primary KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Class Average</span>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                    {stats.classAverage}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">Calculated from {stats.totalStudents} student(s)</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Pass Rate</span>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[#003B5C] dark:text-blue-400">
                    {stats.passRate}%
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">{stats.passedStudents} of {stats.totalStudents} passed (≥ 50%)</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Distinctions</span>
                  <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-2">
                  <p className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-amber-500">
                    {stats.topPerformers}
                  </p>
                </div>
                <p className="text-xs text-gray-400 font-medium">Scored Grade A distinction (≥ 80%)</p>
              </div>
            </div>

            {/* Performance Stratification Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">
                    Excellent (≥ 80%)
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {stats.topPerformers} <span className="text-xs font-bold text-emerald-600/70">learners</span>
                  </p>
                </div>
                <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
              </div>

              <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-amber-800 dark:text-amber-300">
                    Average (50% - 79%)
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-amber-700 dark:text-amber-400 mt-0.5">
                    {stats.averagePerformers} <span className="text-xs font-bold text-amber-600/70">learners</span>
                  </p>
                </div>
                <Minus className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>

              <div className="bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-rose-800 dark:text-rose-300">
                    Needs Support (&lt; 50%)
                  </span>
                  <p className="text-xl sm:text-2xl font-black text-rose-700 dark:text-rose-400 mt-0.5">
                    {stats.strugglingStudents} <span className="text-xs font-bold text-rose-600/70">learners</span>
                  </p>
                </div>
                <TrendingDown className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
              </div>
            </div>

            {/* Student Performance Benchmark Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-750 pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                      Student Performance Benchmark Spectrum
                    </h3>
                    <p className="text-xs text-gray-400">
                      Visual comparison against the 50% pass mark and 80% distinction line
                    </p>
                  </div>
                </div>

                {/* Switcher */}
                <div className="bg-gray-100 dark:bg-gray-700/60 p-1 rounded-xl flex gap-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setStudentChartFilter('top10')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      studentChartFilter === 'top10'
                        ? 'bg-white dark:bg-gray-800 text-[#003B5C] dark:text-blue-300 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Top 10
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentChartFilter('struggling')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      studentChartFilter === 'struggling'
                        ? 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Needs Support ({strugglingStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStudentChartFilter('all')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      studentChartFilter === 'all'
                        ? 'bg-white dark:bg-gray-800 text-[#003B5C] dark:text-blue-300 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                    }`}
                  >
                    Roster ({allStudents.length})
                  </button>
                </div>
              </div>

              {studentChartData.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 space-y-1">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-bold text-gray-700 dark:text-gray-300">No students found in this category</p>
                  <p>All active learners are currently above the 50% threshold.</p>
                </div>
              ) : (
                <div className="w-full h-[300px] sm:h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={studentChartData}
                      margin={{ top: 20, right: 15, left: -20, bottom: 45 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
                      <XAxis 
                        dataKey="short_name" 
                        stroke="#9ca3af"
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        style={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <YAxis 
                        stroke="#9ca3af" 
                        domain={[0, 100]} 
                        style={{ fontSize: '11px', fontWeight: 'bold' }} 
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)'
                        }}
                        formatter={(val: number) => [`${val}%`, 'Term Average']}
                        labelFormatter={(label: string, payload: any[]) => {
                          const item = payload?.[0]?.payload
                          if (!item) return label
                          return `${item.student_name} (${item.student_number})`
                        }}
                      />
                      
                      {/* Benchmarks */}
                      <ReferenceLine 
                        y={50} 
                        stroke="#e11d48" 
                        strokeDasharray="4 4" 
                        strokeWidth={2}
                        label={{ 
                          value: 'Pass (50%)', 
                          position: 'top', 
                          fill: '#e11d48', 
                          fontSize: 10,
                          fontWeight: 'bold'
                        }} 
                      />
                      <ReferenceLine 
                        y={80} 
                        stroke="#059669" 
                        strokeDasharray="4 4" 
                        strokeWidth={2}
                        label={{ 
                          value: 'Distinction (80%)', 
                          position: 'top', 
                          fill: '#059669', 
                          fontSize: 10,
                          fontWeight: 'bold'
                        }} 
                      />
                      {stats && (
                        <ReferenceLine 
                          y={stats.classAverage} 
                          stroke="#003B5C" 
                          strokeDasharray="2 2" 
                          label={{ 
                            value: `Avg (${stats.classAverage}%)`, 
                            position: 'insideBottomRight', 
                            fill: '#003B5C', 
                            fontSize: 10,
                            fontWeight: 'bold'
                          }} 
                        />
                      )}

                      <Bar dataKey="average" radius={[8, 8, 0, 0]} maxBarSize={45}>
                        {studentChartData.map((entry, idx) => (
                          <Cell 
                            key={`cell-${idx}`}
                            fill={
                              entry.average >= 80 ? '#059669' :
                              entry.average >= 50 ? '#003B5C' :
                              '#e11d48'
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-750 text-xs">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span>Distinction (≥80%)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#003B5C]" />
                    <span>Pass (50-79%)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-gray-600 dark:text-gray-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <span>Under 50%</span>
                  </span>
                </div>
                <span className="text-gray-400 text-[11px]">Hover or tap on bar for student specifics</span>
              </div>
            </div>

            {/* Progression & Trends Charts */}
            {overallTrends.length >= 2 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    {activeAcademicYear} Session Progression
                  </h3>
                </div>

                <div className="w-full h-[260px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={overallTrends} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="termName" stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: 'bold' }} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }} 
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line 
                        type="monotone" 
                        dataKey="classAverage" 
                        stroke="#059669" 
                        strokeWidth={3} 
                        dot={{ fill: '#059669', r: 4 }} 
                        activeDot={{ r: 6 }} 
                        name="Class Average (%)" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="passRate" 
                        stroke="#003B5C" 
                        strokeWidth={3} 
                        dot={{ fill: '#003B5C', r: 4 }} 
                        activeDot={{ r: 6 }} 
                        name="Pass Rate (%)" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Subject Trends Chart */}
            {subjectTrends.length >= 2 && subjectPerformance.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                      Subject Performance Trends ({activeAcademicYear})
                    </h3>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <select
                      value={selectedSubjectForTrend}
                      onChange={(e) => setSelectedSubjectForTrend(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2 text-xs font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                    >
                      {subjectPerformance.map((subject) => (
                        <option key={subject.subject_id} value={subject.subject_id}>
                          {subject.subject_name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="w-full h-[260px] sm:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={subjectTrends} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                      <XAxis dataKey="termName" stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: 'bold' }} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1f2937', 
                          border: 'none', 
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }} 
                        formatter={(value: number) => [`${value}%`, 'Average']}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      {selectedSubjectForTrend && (
                        <Line 
                          type="monotone" 
                          dataKey={selectedSubjectForTrend} 
                          stroke="#e11d48" 
                          strokeWidth={3} 
                          dot={{ fill: '#e11d48', r: 4 }} 
                          activeDot={{ r: 6 }} 
                          name={subjectPerformance.find(s => s.subject_id === selectedSubjectForTrend)?.subject_name || 'Subject'} 
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Visual Grade Distribution Bar Chart */}
            {gradeDistribution.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                  <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    Grade Distribution Spectrum
                  </h3>
                </div>

                <div className="w-full h-[220px] sm:h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={gradeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.4} />
                      <XAxis dataKey="grade" stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <YAxis stroke="#9ca3af" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: 'none',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 'bold'
                        }}
                        formatter={(val: number, name: string, item: any) => [
                          `${val} Students (${item.payload.percentage}%)`,
                          `Grade ${item.payload.grade}`
                        ]}
                      />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={45}>
                        {gradeDistribution.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`}
                            fill={
                              entry.grade === 'A' ? '#059669' :
                              entry.grade === 'B' ? '#003B5C' :
                              entry.grade === 'C' ? '#eab308' :
                              entry.grade === 'D' ? '#f97316' :
                              entry.grade === 'E' ? '#fb7185' :
                              '#e11d48'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Subject Performance Breakdown */}
            {subjectPerformance.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between bg-gray-50/50 dark:bg-gray-850">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                      Subject Performance Breakdown
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-gray-400">
                    {subjectPerformance.length} Subjects
                  </span>
                </div>

                {/* Mobile Card Breakdown */}
                <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {subjectPerformance.map((subject) => (
                    <div key={subject.subject_id} className="p-4 space-y-2 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-gray-900 dark:text-white">
                          {subject.subject_name}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                          subject.average >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                          subject.average >= 70 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                          subject.average >= 60 ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                          subject.average >= 50 ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                        }`}>
                          {subject.average}% avg
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Highest</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{subject.highest}%</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Lowest</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">{subject.lowest}%</span>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                          <span className="text-[10px] uppercase font-bold text-gray-400 block">Learners</span>
                          <span className="font-bold text-gray-700 dark:text-gray-300 font-mono">{subject.studentCount}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet & Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[640px]">
                    <thead>
                      <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                        <th className="p-4">Subject</th>
                        <th className="p-4 text-center">Cohort Average</th>
                        <th className="p-4 text-center">Top Score</th>
                        <th className="p-4 text-center">Lowest Score</th>
                        <th className="p-4 text-center">Assessed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                      {subjectPerformance.map((subject) => (
                        <tr key={subject.subject_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                          <td className="p-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                            {subject.subject_name}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-black ${
                              subject.average >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                              subject.average >= 70 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                              subject.average >= 60 ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' :
                              subject.average >= 50 ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300' :
                              'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}>
                              {subject.average}%
                            </span>
                          </td>
                          <td className="p-4 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono whitespace-nowrap">
                            {subject.highest}%
                          </td>
                          <td className="p-4 text-center font-bold text-rose-600 dark:text-rose-400 font-mono whitespace-nowrap">
                            {subject.lowest}%
                          </td>
                          <td className="p-4 text-center text-gray-500 font-mono whitespace-nowrap">
                            {subject.studentCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Rankings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {topStudents.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-750 pb-3">
                    <Award className="w-5 h-5 text-amber-500" />
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                      Top 10 High Performers
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {topStudents.map((student, index) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100/60 dark:border-emerald-900/40">
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {student.student_name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{student.student_number}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                            {student.average}%
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">{student.subjects_count} subjects</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {strugglingStudents.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-750 pb-3">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                      Students Needing Immediate Support
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {strugglingStudents.map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100/60 dark:border-rose-900/40">
                        <div className="min-w-0">
                          <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {student.student_name}
                          </p>
                          <p className="text-[11px] text-gray-400 font-mono mt-0.5">{student.student_number}</p>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <p className="text-sm sm:text-base font-black text-rose-600 dark:text-rose-400 font-mono">
                            {student.average}%
                          </p>
                          <p className="text-[10px] text-gray-400 font-medium">{student.subjects_count} subjects</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 sm:p-14 border border-dashed border-gray-200 dark:border-gray-700 max-w-lg mx-auto text-center space-y-3 shadow-sm">
            <BarChart3 className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">No Score Records Found</h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              There are no scores recorded for the selected class cohort in the {activeAcademicYear} academic session.
            </p>
            <div className="pt-2">
              <Link
                href="/teacher/scores"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>Enter Scores</span>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}