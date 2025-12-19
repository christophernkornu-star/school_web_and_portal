'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, BarChart3, Download, Users, TrendingUp, Eye, Filter, CheckSquare, Square, Printer } from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

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

        // Get teacher's class assignments
        const { data: assignmentsData } = await getTeacherAssignments(teacherData.id) as { data: any[] | null }
        if (assignmentsData) {
          setAssignments(assignmentsData)
          // Set first class as default
          if (assignmentsData.length > 0) {
            setSelectedClass(assignmentsData[0].class_id)
          }
        }

        // Load academic terms via API to bypass RLS
        try {
          const termsResponse = await fetch('/api/terms-list')
          if (termsResponse.ok) {
            const termsData = await termsResponse.json()
            if (termsData && termsData.length > 0) {
              setTerms(termsData)
              setSelectedTerm(termsData[0].id)
            }
          } else {
            // Fallback to direct query
            const { data: termsData } = await supabase
              .from('academic_terms')
              .select('*')
              .order('academic_year', { ascending: false }) as { data: any[] | null }
            
            if (termsData && termsData.length > 0) {
              setTerms(termsData)
              setSelectedTerm(termsData[0].id)
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
  }, [router])

  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadClassData()
    }
  }, [selectedClass, selectedTerm])

  const loadClassData = async () => {
    try {
      // Get all students in the class
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

      // Get scores for all students in this term
      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          student_id,
          total,
          subjects(name)
        `)
        .eq('term_id', selectedTerm)
        .in('student_id', (studentsData as any)?.map((s: any) => s.id) || [])

      // Calculate performance for each student
      const studentsWithScores: Student[] = (studentsData || []).map((student: any) => {
        const studentScores = scoresData?.filter((s: any) => s.student_id === student.id) || []
        const totalScore = studentScores.reduce((sum: number, s: any) => sum + (s.total || 0), 0)
        const averageScore = studentScores.length > 0 ? totalScore / studentScores.length : 0

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

      // Sort by average score to determine positions
      const sorted = [...studentsWithScores].sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
      sorted.forEach((student, index) => {
        student.position = index + 1
      })

      setStudents(sorted)

      // Calculate class performance metrics
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

      // Subject Analysis
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
      // Open the student's report card page in a new window
      const reportCardUrl = `/teacher/reports/student/${studentId}?term=${selectedTerm}`
      window.open(reportCardUrl, '_blank')
    } catch (error) {
      console.error('Error generating report card:', error)
      alert('Failed to generate report card')
    } finally {
      setGeneratingPDF(false)
      setSelectedStudentId(null)
    }
  }

  // Toggle student selection for bulk generation
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  // Select/Deselect all students
  const toggleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(students.map(s => s.id))
    }
  }

  // Generate report cards for selected students (bulk)
  const generateBulkReportCards = async () => {
    if (selectedStudents.length === 0) {
      alert('Please select at least one student')
      return
    }

    setBulkGenerating(true)
    
    try {
      // Open a single window with all report cards for printing
      const reportUrl = `/teacher/reports/bulk?students=${selectedStudents.join(',')}&term=${selectedTerm}`
      window.open(reportUrl, '_blank')
    } catch (error) {
      console.error('Error generating bulk report cards:', error)
      alert('Failed to generate report cards')
    } finally {
      setBulkGenerating(false)
    }
  }

  const getPerformanceColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-blue-600 bg-blue-50'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const selectedClassName = assignments.find(a => a.class_id === selectedClass)?.classes?.name || ''
  const selectedTermData = terms.find(t => t.id === selectedTerm)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4 flex justify-between items-center gap-2">
          <div className="flex items-center space-x-2 md:space-x-4">
            <Link href="/teacher/dashboard" className="text-ghana-green hover:text-green-700 shrink-0">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <div>
              <h1 className="text-base md:text-2xl font-bold text-gray-800 leading-tight">Class Performance Reports</h1>
              <p className="text-xs md:text-sm text-gray-600 hidden sm:block">Generate report cards and analyze class performance</p>
            </div>
          </div>
          <Link 
            href="/teacher/assessment-sheet" 
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0 text-xs md:text-base"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Assessment Sheet</span>
            <span className="sm:hidden">Sheet</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-base md:text-lg font-semibold text-gray-800">Filter Options</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
              >
                {Array.from(new Set(assignments.map(a => a.class_id))).map(classId => {
                  const assignment = assignments.find(a => a.class_id === classId)
                  return (
                    <option key={classId} value={classId}>
                      {assignment?.classes?.name}
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">
                Select Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name} - {term.academic_year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setView('overview')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              view === 'overview'
                ? 'bg-ghana-green text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline-block mr-2" />
            Overview
          </button>
          <button
            onClick={() => setView('students')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              view === 'students'
                ? 'bg-ghana-green text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4 inline-block mr-2" />
            Students ({students.length})
          </button>
          <button
            onClick={() => setView('subjects')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
              view === 'subjects'
                ? 'bg-ghana-green text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline-block mr-2" />
            Subject Analysis
          </button>
          <Link
            href="/teacher/class-report"
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-orange-600 text-white hover:bg-orange-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Class Broadsheet
          </Link>
        </div>

        {/* Overview */}
        {view === 'overview' && classPerformance && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Class Average</p>
                    <p className="text-xl md:text-2xl font-bold text-methodist-blue mt-2">
                      {classPerformance.classAverage}%
                    </p>
                  </div>
                  <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-methodist-blue opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Total Students</p>
                    <p className="text-xl md:text-2xl font-bold text-gray-800 mt-2">
                      {classPerformance.totalStudents}
                    </p>
                  </div>
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-gray-400 opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Highest Score</p>
                    <p className="text-xl md:text-2xl font-bold text-green-600 mt-2">
                      {classPerformance.highestScore}%
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-green-400 opacity-50" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Lowest Score</p>
                    <p className="text-xl md:text-2xl font-bold text-red-600 mt-2">
                      {classPerformance.lowestScore}%
                    </p>
                  </div>
                  <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-red-400 opacity-50 transform rotate-180" />
                </div>
              </div>
            </div>

            {/* Performance Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Performance Distribution</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-green-600">{classPerformance.excellentCount}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Excellent (≥80%)</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-blue-600">{classPerformance.goodCount}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Good (60-79%)</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-yellow-600">{classPerformance.averageCount}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Average (40-59%)</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-xl md:text-2xl font-bold text-red-600">{classPerformance.poorCount}</p>
                  <p className="text-xs md:text-sm text-gray-600 mt-1">Needs Help (&lt;40%)</p>
                </div>
              </div>
            </div>

            {/* Students Needing Help */}
            {classPerformance.poorCount > 0 && (
              <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
                <h3 className="text-base md:text-lg font-semibold text-red-800 mb-2">⚠️ Students Needing Immediate Attention</h3>
                <p className="text-red-700 mb-4 text-sm md:text-base">
                  {classPerformance.poorCount} student{classPerformance.poorCount > 1 ? 's' : ''} performing below 40%. Consider extra support or remedial classes.
                </p>
                <div className="space-y-2">
                  {students.filter(s => (s.averageScore || 0) < 40).map(student => (
                    <div key={student.id} className="bg-white p-3 rounded flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-800 text-sm md:text-base">
                          {`${student.last_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.first_name || ''}`}
                        </p>
                        <p className="text-xs md:text-sm text-gray-600">Average: {student.averageScore}%</p>
                      </div>
                      <button
                        onClick={() => generateStudentReportCard(student.id)}
                        className="text-red-600 hover:text-red-800 text-xs md:text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Students List */}
        {view === 'students' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {/* Bulk Actions Bar */}
            <div className="bg-gray-50 px-4 md:px-6 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-xs md:text-sm text-gray-600 hover:text-gray-800"
                >
                  {selectedStudents.length === students.length && students.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-ghana-green" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  {selectedStudents.length === students.length && students.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
                {selectedStudents.length > 0 && (
                  <span className="text-xs md:text-sm text-gray-500">
                    {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                  </span>
                )}
              </div>
              {selectedStudents.length > 0 && (
                <button
                  onClick={generateBulkReportCards}
                  disabled={bulkGenerating}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs md:text-sm font-medium"
                >
                  {bulkGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Printer className="w-4 h-4" />
                      Generate {selectedStudents.length} Report Card{selectedStudents.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {students.map((student) => (
                <div key={student.id} className={`p-4 ${selectedStudents.includes(student.id) ? 'bg-green-50' : 'bg-white'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <button onClick={() => toggleStudentSelection(student.id)}>
                        {selectedStudents.includes(student.id) ? (
                          <CheckSquare className="w-5 h-5 text-ghana-green" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {`${student.last_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.first_name || ''}`}
                        </h3>
                        <p className="text-xs text-gray-500">ID: {student.student_id}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                      {student.position}{getOrdinalSuffix(student.position || 0)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500 mb-1">Average Score</p>
                      <p className={`text-lg font-bold ${getPerformanceColor(student.averageScore || 0).split(' ')[0]}`}>
                        {student.averageScore}%
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-xs text-gray-500 mb-1">Performance</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPerformanceColor(student.averageScore || 0)}`}>
                        {(student.averageScore || 0) >= 80 ? 'Excellent' :
                         (student.averageScore || 0) >= 60 ? 'Good' :
                         (student.averageScore || 0) >= 40 ? 'Average' : 'Needs Help'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => generateStudentReportCard(student.id)}
                    disabled={generatingPDF && selectedStudentId === student.id}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                  >
                    {generatingPDF && selectedStudentId === student.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        View Report Card
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-ghana-green text-white">
                  <tr>
                    <th className="px-4 py-3 text-center">
                      <button onClick={toggleSelectAll}>
                        {selectedStudents.length === students.length ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase">Position</th>
                    <th className="px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase">Student ID</th>
                    <th className="px-6 py-3 text-left text-xs md:text-sm font-semibold uppercase">Name</th>
                    <th className="px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase">Average</th>
                    <th className="px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase">Performance</th>
                    <th className="px-6 py-3 text-center text-xs md:text-sm font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className={`hover:bg-gray-50 ${selectedStudents.includes(student.id) ? 'bg-green-50' : ''}`}>
                      <td className="px-4 py-4 text-center">
                        <button onClick={() => toggleStudentSelection(student.id)}>
                          {selectedStudents.includes(student.id) ? (
                            <CheckSquare className="w-5 h-5 text-ghana-green" />
                          ) : (
                            <Square className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs md:text-sm font-bold text-gray-800">
                          {student.position}{getOrdinalSuffix(student.position || 0)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                        {student.student_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-700">
                        {`${student.last_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.first_name || ''}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`text-base md:text-lg font-bold ${getPerformanceColor(student.averageScore || 0).split(' ')[0]}`}>
                          {student.averageScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-semibold ${getPerformanceColor(student.averageScore || 0)}`}>
                          {(student.averageScore || 0) >= 80 ? 'Excellent' :
                           (student.averageScore || 0) >= 60 ? 'Good' :
                           (student.averageScore || 0) >= 40 ? 'Average' : 'Needs Help'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => generateStudentReportCard(student.id)}
                          disabled={generatingPDF && selectedStudentId === student.id}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-xs md:text-sm"
                        >
                          {generatingPDF && selectedStudentId === student.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <FileText className="w-4 h-4" />
                              Report Card
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subject Analysis */}
        {view === 'subjects' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Subject Performance Analysis</h3>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Identify which subjects need more attention</p>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-200">
              {subjectAnalysis.map((subject, index) => (
                <div key={index} className="p-4 bg-white">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-gray-900">{subject.subject}</h4>
                    <span className={`text-lg font-bold ${getPerformanceColor(subject.average).split(' ')[0]}`}>
                      {subject.average}%
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          subject.average >= 80 ? 'bg-green-600' :
                          subject.average >= 60 ? 'bg-blue-600' :
                          subject.average >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${subject.average}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between p-2 bg-green-50 rounded">
                      <span className="text-gray-600">Highest</span>
                      <span className="font-bold text-green-600">{subject.highest}%</span>
                    </div>
                    <div className="flex justify-between p-2 bg-red-50 rounded">
                      <span className="text-gray-600">Lowest</span>
                      <span className="font-bold text-red-600">{subject.lowest}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-[10px] md:text-xs font-semibold uppercase text-gray-700">Subject</th>
                    <th className="px-6 py-3 text-center text-[10px] md:text-xs font-semibold uppercase text-gray-700">Class Average</th>
                    <th className="px-6 py-3 text-center text-[10px] md:text-xs font-semibold uppercase text-gray-700">Highest</th>
                    <th className="px-6 py-3 text-center text-[10px] md:text-xs font-semibold uppercase text-gray-700">Lowest</th>
                    <th className="px-6 py-3 text-center text-[10px] md:text-xs font-semibold uppercase text-gray-700">Performance</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjectAnalysis.map((subject, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                        {subject.subject}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className={`text-base md:text-lg font-bold ${getPerformanceColor(subject.average).split(' ')[0]}`}>
                          {subject.average}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm text-green-600 font-semibold">
                        {subject.highest}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-xs md:text-sm text-red-600 font-semibold">
                        {subject.lowest}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              subject.average >= 80 ? 'bg-green-600' :
                              subject.average >= 60 ? 'bg-blue-600' :
                              subject.average >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${subject.average}%` }}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!selectedClass && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg md:text-xl font-semibold text-gray-700 mb-2">No Class Assigned</h3>
            <p className="text-gray-600 text-sm md:text-base">You haven't been assigned to any classes yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
