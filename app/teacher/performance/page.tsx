'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BarChart3, TrendingUp, Award, Users, AlertCircle, Download, Filter, BookOpen, Target, TrendingDown, Minus, FileText } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'

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
  const [topStudents, setTopStudents] = useState<StudentPerformance[]>([])
  const [strugglingStudents, setStrugglingStudents] = useState<StudentPerformance[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [currentTermId, setCurrentTermId] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [overallTrends, setOverallTrends] = useState<TermTrend[]>([])
  const [subjectTrends, setSubjectTrends] = useState<SubjectTrend[]>([])
  const [selectedSubjectForTrend, setSelectedSubjectForTrend] = useState<string>('')

  // Initial load effect
  useEffect(() => {
    if (!initialized) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter change effect
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

      // Get current user and teacher data
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
      if (teacherError || !teacherData) {
        setError('Failed to load teacher data')
        return
      }

      setTeacherId(teacherData.teacher_id)

      // Load teacher's classes
      const classAccess = await getTeacherClassAccess(teacherData.profile_id)
      setClasses(classAccess)

      // Load terms
      const { data: termsData } = await supabase
        .from('academic_terms')
        .select('*')
        .order('start_date', { ascending: false }) as { data: any[] | null }

      let termIdToUse = null

      if (termsData && termsData.length > 0) {
        setTerms(termsData)
        
        // Try to get current term from system settings
        const { data: currentTermData, error: settingsError } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'current_term')
          .maybeSingle() as { data: any; error: any }

        let termToUse = null
        
        // Validate if the setting value is a valid UUID and exists in terms
        if (currentTermData?.setting_value) {
          const matchingTerm = termsData.find((t: any) => t.id === currentTermData.setting_value)
          if (matchingTerm) {
            termToUse = currentTermData.setting_value
          }
        }
        
        // Fallback: use the term marked as current or the most recent term
        if (!termToUse) {
          const currentTerm = termsData.find((t: any) => t.is_current) || termsData[0]
          termToUse = currentTerm.id
        }
        
        setCurrentTermId(termToUse)
        termIdToUse = termToUse
        
        // Set initial term selection on first load
        if (!initialized && !selectedTerm) {
          setSelectedTerm(termToUse)
        }
      }

      // Determine class filter
      const classIds = selectedClass === 'all' 
        ? classAccess.map(c => c.class_id)
        : [selectedClass]

      if (classIds.length === 0) {
        setError('No classes assigned to you')
        setLoading(false)
        setInitialized(true)
        return
      }

      // Determine term filter - use the resolved term ID if no term selected yet
      const termId = !selectedTerm || selectedTerm === '' ? termIdToUse : selectedTerm
      if (!termId) {
        // Set empty state instead of error if no term is configured yet
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

      // Load performance data
      await Promise.all([
        loadOverallStats(classIds, termId),
        loadSubjectPerformance(classIds, termId),
        loadGradeDistribution(classIds, termId),
        loadTopPerformers(classIds, termId),
        loadStrugglingStudents(classIds, termId),
        loadPerformanceTrends(classIds, termsData || [])
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

  async function loadOverallStats(classIds: string[], termId: string) {
    try {
      // Get all scores for the classes and term
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          student_id,
          total,
          students!inner(class_id)
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
        return
      }

      // Calculate student averages
      const studentAverages = new Map<string, number[]>()
      scoresData.forEach(score => {
        if (!studentAverages.has(score.student_id)) {
          studentAverages.set(score.student_id, [])
        }
        studentAverages.get(score.student_id)!.push(score.total)
      })

      const averages = Array.from(studentAverages.entries()).map(([studentId, totals]) => {
        const avg = totals.reduce((sum, t) => sum + t, 0) / totals.length
        return { studentId, average: avg }
      })

      const totalStudents = averages.length
      const classAverage = averages.reduce((sum, s) => sum + s.average, 0) / totalStudents
      const passedStudents = averages.filter(s => s.average >= 50).length
      const passRate = (passedStudents / totalStudents) * 100

      const topPerformers = averages.filter(s => s.average >= 80).length
      const averagePerformers = averages.filter(s => s.average >= 50 && s.average < 80).length
      const strugglingStudents = averages.filter(s => s.average < 50).length

      setStats({
        classAverage: Math.round(classAverage * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        totalStudents,
        passedStudents,
        topPerformers,
        averagePerformers,
        strugglingStudents
      })
    } catch (err) {
      console.error('Error loading overall stats:', err)
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

      // Group by subject
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

  async function loadGradeDistribution(classIds: string[], termId: string) {
    try {
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          student_id,
          total,
          students!inner(class_id)
        `)
        .in('students.class_id', classIds)
        .eq('term_id', termId) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      if (!scoresData || scoresData.length === 0) {
        setGradeDistribution([])
        return
      }

      // Calculate student averages
      const studentAverages = new Map<string, number[]>()
      scoresData.forEach((score: any) => {
        if (!studentAverages.has(score.student_id)) {
          studentAverages.set(score.student_id, [])
        }
        studentAverages.get(score.student_id)!.push(score.total)
      })

      const averages = Array.from(studentAverages.values()).map(totals => 
        totals.reduce((sum, t) => sum + t, 0) / totals.length
      )

      // Calculate grade distribution
      const gradeCount = {
        'A': averages.filter(a => a >= 80).length,
        'B': averages.filter(a => a >= 70 && a < 80).length,
        'C': averages.filter(a => a >= 60 && a < 70).length,
        'D': averages.filter(a => a >= 50 && a < 60).length,
        'E': averages.filter(a => a >= 40 && a < 50).length,
        'F': averages.filter(a => a < 40).length
      }

      const total = averages.length
      const distribution: GradeDistribution[] = Object.entries(gradeCount).map(([grade, count]) => ({
        grade,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }))

      setGradeDistribution(distribution)
    } catch (err) {
      console.error('Error loading grade distribution:', err)
    }
  }

  async function loadTopPerformers(classIds: string[], termId: string) {
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
        setTopStudents([])
        return
      }

      // Calculate student averages
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

      const students: StudentPerformance[] = Array.from(studentMap.entries()).map(([studentId, data]) => {
        const average = data.totals.reduce((sum, t) => sum + t, 0) / data.totals.length
        const student = data.student
        
        return {
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_id,
          average: Math.round(average * 10) / 10,
          subjects_count: data.totals.length,
          trend: 'stable' as const
        }
      })

      students.sort((a, b) => b.average - a.average)
      setTopStudents(students.slice(0, 10))
    } catch (err) {
      console.error('Error loading top performers:', err)
    }
  }

  async function loadStrugglingStudents(classIds: string[], termId: string) {
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
        setStrugglingStudents([])
        return
      }

      // Calculate student averages
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

      const students: StudentPerformance[] = Array.from(studentMap.entries()).map(([studentId, data]) => {
        const average = data.totals.reduce((sum, t) => sum + t, 0) / data.totals.length
        const student = data.student
        
        return {
          student_id: studentId,
          student_name: `${student.first_name} ${student.last_name}`,
          student_number: student.student_id,
          average: Math.round(average * 10) / 10,
          subjects_count: data.totals.length,
          trend: 'stable' as const
        }
      })

      const struggling = students.filter(s => s.average < 50)
      struggling.sort((a, b) => a.average - b.average)
      setStrugglingStudents(struggling.slice(0, 10))
    } catch (err) {
      console.error('Error loading struggling students:', err)
    }
  }

  async function loadPerformanceTrends(classIds: string[], allTerms: any[]) {
    try {
      if (allTerms.length < 2) {
        setOverallTrends([])
        setSubjectTrends([])
        return
      }

      // Get scores for all terms for the selected class(es)
      const { data: scoresData, error: scoresError } = await supabase
        .from('scores')
        .select(`
          student_id,
          term_id,
          subject_id,
          total,
          students!inner(class_id),
          subjects(name),
          academic_terms(name, start_date)
        `)
        .in('students.class_id', classIds) as { data: any[] | null; error: any }

      if (scoresError) throw scoresError

      if (!scoresData || scoresData.length === 0) {
        setOverallTrends([])
        setSubjectTrends([])
        return
      }

      // Calculate overall trends (class average per term)
      const termAverages = new Map<string, { sum: number; count: number; name: string; passCount: number; startDate: string }>()
      
      scoresData.forEach((score: any) => {
        const termId = score.term_id
        const termName = score.academic_terms?.name || 'Unknown'
        const startDate = score.academic_terms?.start_date || ''
        
        if (!termAverages.has(termId)) {
          termAverages.set(termId, { sum: 0, count: 0, name: termName, passCount: 0, startDate })
        }
        
        const termData = termAverages.get(termId)!
        termData.sum += score.total
        termData.count += 1
        if (score.total >= 50) termData.passCount += 1
      })

      // Convert to array and sort by date
      const overallTrendData: TermTrend[] = Array.from(termAverages.entries())
        .map(([termId, data]) => ({
          termName: data.name,
          classAverage: Math.round((data.sum / data.count) * 10) / 10,
          passRate: Math.round((data.passCount / data.count) * 100 * 10) / 10,
          startDate: data.startDate
        }))
        .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .map(({ startDate, ...rest }) => rest)

      setOverallTrends(overallTrendData)

      // Calculate subject-specific trends
      const subjectTermMap = new Map<string, Map<string, { sum: number; count: number; termName: string; startDate: string }>>()
      
      scoresData.forEach((score: any) => {
        const subjectId = score.subject_id
        const subjectName = score.subjects?.name || 'Unknown'
        const termId = score.term_id
        const termName = score.academic_terms?.name || 'Unknown'
        const startDate = score.academic_terms?.start_date || ''
        
        if (!subjectTermMap.has(subjectId)) {
          subjectTermMap.set(subjectId, new Map())
        }
        
        const termMap = subjectTermMap.get(subjectId)!
        if (!termMap.has(termId)) {
          termMap.set(termId, { sum: 0, count: 0, termName, startDate })
        }
        
        const termData = termMap.get(termId)!
        termData.sum += score.total
        termData.count += 1
      })

      // Find subject with most data points for default selection
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

      // Convert to chart data format
      const allTermIds = Array.from(new Set(scoresData.map((s: any) => s.term_id)))
      const termOrder = allTerms
        .filter(t => allTermIds.includes(t.id))
        .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())

      const subjectTrendData: SubjectTrend[] = termOrder.map(term => {
        const dataPoint: SubjectTrend = { termName: term.name }
        
        subjectTermMap.forEach((termMap, subjectId) => {
          const termData = Array.from(termMap.entries()).find(([tid]) => tid === term.id)
          if (termData) {
            const [, data] = termData
            const average = data.sum / data.count
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

  function exportToCSV() {
    if (!stats || !subjectPerformance || !topStudents) return

    let csv = 'Performance Analytics Report\n\n'
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

    csv += '\nTop Performers\n'
    csv += 'Admission Number,Name,Average\n'
    topStudents.forEach(student => {
      csv += `${student.student_number},${student.student_name},${student.average}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 transition-colors">
        <header className="bg-white dark:bg-gray-800 shadow mb-8">
            <div className="container mx-auto px-6 py-4">
                <div className="flex justify-between items-center mb-4">
                   <div className="flex items-center gap-3">
                       <Skeleton className="h-8 w-8 rounded-full" />
                       <Skeleton className="h-8 w-48 rounded" />
                   </div>
                   <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="flex gap-4">
                    <Skeleton className="h-10 w-48 rounded-lg" />
                    <Skeleton className="h-10 w-48 rounded-lg" />
                </div>
            </div>
        </header>

        <main className="container mx-auto px-6">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
             </div>
             
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                 <Skeleton className="h-80 rounded-xl" />
                 <Skeleton className="h-80 rounded-xl" />
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Skeleton className="h-96 rounded-xl" />
                  <Skeleton className="h-96 rounded-xl" />
             </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <BackButton className="text-ghana-green hover:text-green-700" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Performance Analytics</h1>
                <p className="text-sm text-gray-600 dark:text-gray-300">Track and analyze student performance</p>
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 flex items-start space-x-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-red-800 dark:text-red-300 mb-2 text-sm md:text-base">Error Loading Data</h3>
              <p className="text-red-700 dark:text-red-200 text-xs md:text-sm">{error}</p>
              <button
                onClick={() => loadData()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow transition-colors">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <BackButton className="text-ghana-green hover:text-green-700" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Performance Analytics</h1>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">Track and analyze student performance</p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 text-sm md:text-base"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Filter className="w-5 h-5 text-ghana-green" />
            <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">Filters</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} ({term.academic_year})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        {stats && (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">Class Average</h3>
                  <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-ghana-green">{stats.classAverage}%</p>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-2">Based on {stats.totalStudents} students</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">Pass Rate</h3>
                  <Award className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.passRate}%</p>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-2">{stats.passedStudents}/{stats.totalStudents} students</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white text-sm md:text-base">Top Performers</h3>
                  <Award className="w-6 h-6 md:w-8 md:h-8 text-ghana-gold" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-ghana-gold">{stats.topPerformers}</p>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300 mt-2">Scoring above 80%</p>
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg shadow p-6 border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-green-800 dark:text-green-300 text-sm md:text-base">Excellent</h3>
                  <Target className="w-6 h-6 md:w-8 md:h-8 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-green-700 dark:text-green-400">{stats.topPerformers}</p>
                <p className="text-xs md:text-sm text-green-600 dark:text-green-300 mt-2">80% and above</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-lg shadow p-6 border-2 border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-yellow-800 dark:text-yellow-300 text-sm md:text-base">Average</h3>
                  <Minus className="w-6 h-6 md:w-8 md:h-8 text-yellow-600 dark:text-yellow-400" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-yellow-700 dark:text-yellow-400">{stats.averagePerformers}</p>
                <p className="text-xs md:text-sm text-yellow-600 dark:text-yellow-300 mt-2">50% - 79%</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-lg shadow p-6 border-2 border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-red-800 dark:text-red-300 text-sm md:text-base">Needs Support</h3>
                  <TrendingDown className="w-6 h-6 md:w-8 md:h-8 text-red-600 dark:text-red-400" />
                </div>
                <p className="text-xl md:text-2xl font-bold text-red-700 dark:text-red-400">{stats.strugglingStudents}</p>
                <p className="text-xs md:text-sm text-red-600 dark:text-red-300 mt-2">Below 50%</p>
              </div>
            </div>
          </>
        )}

        {/* Performance Trends Over Time */}
        {overallTrends.length >= 2 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <TrendingUp className="w-6 h-6 text-ghana-green" />
              <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Overall Performance Trends</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={overallTrends} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="termName" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Line 
                  type="monotone" 
                  dataKey="classAverage" 
                  stroke="#059669" 
                  strokeWidth={3}
                  dot={{ fill: '#059669', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Class Average (%)"
                />
                <Line 
                  type="monotone" 
                  dataKey="passRate" 
                  stroke="#1e40af" 
                  strokeWidth={3}
                  dot={{ fill: '#1e40af', r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Pass Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Subject Performance Trends */}
        {subjectTrends.length >= 2 && subjectPerformance.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <BookOpen className="w-6 h-6 text-ghana-green" />
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Subject Performance Trends</h3>
              </div>
              <select
                value={selectedSubjectForTrend}
                onChange={(e) => setSelectedSubjectForTrend(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {subjectPerformance.map((subject) => (
                  <option key={subject.subject_id} value={subject.subject_id}>
                    {subject.subject_name}
                  </option>
                ))}
              </select>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={subjectTrends} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="termName" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                  formatter={(value: number) => [`${value}%`, 'Average']}
                />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                {selectedSubjectForTrend && (
                  <Line 
                    type="monotone" 
                    dataKey={selectedSubjectForTrend}
                    stroke="#dc2626" 
                    strokeWidth={3}
                    dot={{ fill: '#dc2626', r: 5 }}
                    activeDot={{ r: 7 }}
                    name={subjectPerformance.find(s => s.subject_id === selectedSubjectForTrend)?.subject_name || 'Subject'}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Grade Distribution */}
        {gradeDistribution.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <BarChart3 className="w-6 h-6 text-ghana-green" />
              <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Grade Distribution</h3>
            </div>
            <div className="space-y-4">
              {gradeDistribution.map((grade) => (
                <div key={grade.grade}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-sm md:text-base">Grade {grade.grade}</span>
                    <span className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">{grade.count} students ({grade.percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full ${
                        grade.grade === 'A' ? 'bg-green-500' :
                        grade.grade === 'B' ? 'bg-blue-500' :
                        grade.grade === 'C' ? 'bg-yellow-500' :
                        grade.grade === 'D' ? 'bg-orange-500' :
                        grade.grade === 'E' ? 'bg-red-400' :
                        'bg-red-600'
                      }`}
                      style={{ width: `${grade.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subject Performance */}
        {subjectPerformance.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center space-x-4 mb-6">
              <BookOpen className="w-6 h-6 text-ghana-green" />
              <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Subject Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">Subject</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">Average</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">Highest</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">Lowest</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 text-xs md:text-sm">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {subjectPerformance.map((subject) => (
                    <tr key={subject.subject_id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-3 px-4 font-medium text-gray-800 dark:text-white text-xs md:text-sm">{subject.subject_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold ${
                          subject.average >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          subject.average >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                          subject.average >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          subject.average >= 50 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {subject.average}%
                        </span>
                      </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Top Performers & Struggling Students */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Performers */}
          {topStudents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center space-x-4 mb-6">
                <Award className="w-6 h-6 text-ghana-gold" />
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Top Performers</h3>
              </div>
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-ghana-gold text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white text-sm md:text-base">{student.student_name}</p>
                        <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">{student.student_number}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base md:text-lg font-bold text-green-600 dark:text-green-400">{student.average}%</p>
                      <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">{student.subjects_count} subjects</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Struggling Students */}
          {strugglingStudents.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center space-x-4 mb-6">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Students Needing Support</h3>
              </div>
              <div className="space-y-3">
                {strugglingStudents.map((student) => (
                  <div key={student.student_id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-white text-sm md:text-base">{student.student_name}</p>
                      <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">{student.student_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base md:text-lg font-bold text-red-600 dark:text-red-400">{student.average}%</p>
                      <p className="text-[10px] md:text-xs text-gray-600 dark:text-gray-400">{student.subjects_count} subjects</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Empty State */}
        {(!stats || stats.totalStudents === 0) && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-2">No Performance Data Yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm md:text-base">
              There are no scores recorded for the selected class and term.
            </p>
            <Link
              href="/teacher/scores"
              className="inline-flex items-center px-6 py-3 bg-ghana-green text-white rounded-lg hover:bg-green-700"
            >
              <FileText className="w-5 h-5 mr-2" />
              Enter Scores
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
