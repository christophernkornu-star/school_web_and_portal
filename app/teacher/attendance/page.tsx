'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Users, TrendingUp, AlertCircle, Search } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  gender: string
  days_present?: number
  attendance_record_id?: string
}

interface TeacherClass {
  class_id: string
  class_name: string
  is_class_teacher: boolean
}

export default function AttendancePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teacher, setTeacher] = useState<any>(null)
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [currentTerm, setCurrentTerm] = useState<any>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<{ [studentId: string]: number }>({})
  const [totalDays, setTotalDays] = useState(0)
  const [bulkDays, setBulkDays] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')
  const [sortOrder, setSortOrder] = useState<'boys-first' | 'girls-first' | 'name'>('name')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      await loadTeacherData(user.id)
      await loadCurrentTerm()
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (selectedClass && selectedTerm) {
      loadStudents()
    }
  }, [selectedClass, selectedTerm])

  async function loadTeacherData(userId: string) {
    const { data: teacherData } = (await supabase
      .from('teachers')
      .select('*')
      .eq('profile_id', userId)
      .single()) as { data: any }

    if (teacherData) {
      setTeacher(teacherData)

      // Load classes where teacher is class teacher
      const { data: classData } = (await supabase
        .from('teacher_class_assignments')
        .select(`
          class_id,
          is_class_teacher,
          classes (
            id,
            name
          )
        `)
        .eq('teacher_id', teacherData.id)
        .eq('is_class_teacher', true)) as { data: any[] | null }

      if (classData) {
        const classes: TeacherClass[] = classData.map((tc: any) => ({
          class_id: tc.class_id,
          class_name: (tc.classes as any).name,
          is_class_teacher: tc.is_class_teacher
        }))
        setTeacherClasses(classes)
      }
    }
  }

  async function loadCurrentTerm() {
    const { data: settings } = (await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'current_term')
      .single()) as { data: any }

    if (settings) {
      const termId = settings.setting_value
      setSelectedTerm(termId)

      const { data: termData } = (await supabase
        .from('academic_terms')
        .select('*')
        .eq('id', termId)
        .single()) as { data: any }

      if (termData) {
        setCurrentTerm(termData)
        setTotalDays(termData.total_days || 0)
      }
    }
  }

  async function loadStudents() {
    const { data, error } = (await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, gender')
      .eq('class_id', selectedClass)
      .eq('status', 'active')
      .order('last_name')) as { data: any[] | null; error: any }

    if (error) {
      console.error('Error loading students:', error)
      return
    }

    if (data) {
      // Load existing attendance records for this term
      const { data: attendanceData } = (await supabase
        .from('student_attendance')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('term_id', selectedTerm)) as { data: any[] | null }

      const attendanceMap: { [key: string]: number } = {}
      const studentsWithAttendance = data.map((student: any) => {
        const record = attendanceData?.find((a: any) => a.student_id === student.id)
        if (record) {
          attendanceMap[student.id] = record.days_present
          return {
            ...student,
            days_present: record.days_present,
            attendance_record_id: record.id
          }
        }
        attendanceMap[student.id] = 0
        return student
      })

      setStudents(studentsWithAttendance)
      setAttendance(attendanceMap)
    }
  }

  const handleAttendanceChange = (studentId: string, days: number) => {
    const validDays = Math.max(0, Math.min(days, totalDays))
    setAttendance(prev => ({
      ...prev,
      [studentId]: validDays
    }))
    setHasUnsavedChanges(true)
  }

  const applyToAll = () => {
    const days = parseInt(bulkDays)
    if (isNaN(days) || days < 0 || days > totalDays) {
      alert(`Please enter a valid number between 0 and ${totalDays}`)
      return
    }

    const newAttendance: { [key: string]: number } = {}
    students.forEach(student => {
      newAttendance[student.id] = days
    })
    setAttendance(newAttendance)
    setHasUnsavedChanges(true)
    setBulkDays('')
    alert(`Applied ${days} days to all ${students.length} students`)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const filteredStudents = getFilteredAndSortedStudents()
      const nextIndex = index + 1
      if (nextIndex < filteredStudents.length) {
        const nextInput = document.getElementById(`attendance-${filteredStudents[nextIndex].id}`)
        nextInput?.focus()
      }
    }
  }

  const handleSaveAttendance = async () => {
    if (!selectedClass || !selectedTerm) {
      alert('Please select a class and term')
      return
    }

    setSaving(true)

    try {
      const records = students.map(student => ({
        student_id: student.id,
        class_id: selectedClass,
        term_id: selectedTerm,
        days_present: attendance[student.id] || 0,
        recorded_by: teacher.id
      }))

      // Upsert attendance records
      const { error } = await supabase
        .from('student_attendance')
        .upsert(records, {
          onConflict: 'student_id,term_id',
          ignoreDuplicates: false
        })

      if (error) throw error

      setHasUnsavedChanges(false)
      alert('Attendance saved successfully!')
      await loadStudents() // Reload to get updated records
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      alert(`Failed to save attendance: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const getFilteredAndSortedStudents = () => {
    let filtered = [...students]

    // Apply gender filter
    if (genderFilter === 'male') {
      filtered = filtered.filter(s => s.gender?.toLowerCase() === 'male')
    } else if (genderFilter === 'female') {
      filtered = filtered.filter(s => s.gender?.toLowerCase() === 'female')
    }

    // Apply sort order
    if (sortOrder === 'boys-first') {
      filtered.sort((a, b) => {
        if (a.gender?.toLowerCase() === 'male' && b.gender?.toLowerCase() === 'female') return -1
        if (a.gender?.toLowerCase() === 'female' && b.gender?.toLowerCase() === 'male') return 1
        return a.last_name.localeCompare(b.last_name)
      })
    } else if (sortOrder === 'girls-first') {
      filtered.sort((a, b) => {
        if (a.gender?.toLowerCase() === 'female' && b.gender?.toLowerCase() === 'male') return -1
        if (a.gender?.toLowerCase() === 'male' && b.gender?.toLowerCase() === 'female') return 1
        return a.last_name.localeCompare(b.last_name)
      })
    } else {
      filtered.sort((a, b) => a.last_name.localeCompare(b.last_name))
    }

    return filtered
  }

  const calculateStats = () => {
    const totalStudents = students.length
    const totalPresent = Object.values(attendance).reduce((sum, days) => sum + days, 0)
    const totalPossible = totalStudents * totalDays
    const overallRate = totalPossible > 0 ? (totalPresent / totalPossible * 100).toFixed(1) : '0'

    const boys = students.filter(s => s.gender?.toLowerCase() === 'male')
    const girls = students.filter(s => s.gender?.toLowerCase() === 'female')

    const boysPresentTotal = boys.reduce((sum, s) => sum + (attendance[s.id] || 0), 0)
    const girlsPresentTotal = girls.reduce((sum, s) => sum + (attendance[s.id] || 0), 0)

    const boysPossible = boys.length * totalDays
    const girlsPossible = girls.length * totalDays

    const boysRate = boysPossible > 0 ? (boysPresentTotal / boysPossible * 100).toFixed(1) : '0'
    const girlsRate = girlsPossible > 0 ? (girlsPresentTotal / girlsPossible * 100).toFixed(1) : '0'

    return {
      totalStudents,
      totalPresent,
      overallRate,
      boys: boys.length,
      girls: girls.length,
      boysRate,
      girlsRate
    }
  }

  const stats = calculateStats()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Link
                href="/teacher/dashboard"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Class Teacher Assignment</h2>
            <p className="text-gray-600 dark:text-gray-400">
              You must be assigned as a class teacher to record attendance.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/teacher/dashboard"
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="w-6 h-6" />
                <span className="text-xs md:text-sm">Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <span className="text-xs md:text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleSaveAttendance}
                disabled={saving || !selectedClass || students.length === 0}
                className="flex items-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-xs md:text-sm"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">Record Attendance</h1>
          <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Enter the number of days each student was present during {currentTerm?.name}
          </p>
        </div>

        {/* Instructions & Quick Fill */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Quick Tips</h3>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Total school days: <strong>{totalDays} days</strong></li>
                  <li>• Press Tab or Enter to move to next student</li>
                  <li>• Use "Quick Fill" to set same value for all</li>
                  <li>• Click "Save Attendance" when done</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 dark:text-green-300 mb-4 text-sm md:text-base">⚡ Quick Fill All Students</h3>
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <label className="block text-xs md:text-sm font-medium text-green-800 dark:text-green-300 mb-2">
                  Days Present (0-{totalDays})
                </label>
                <input
                  type="number"
                  min="0"
                  max={totalDays}
                  value={bulkDays}
                  onChange={(e) => setBulkDays(e.target.value)}
                  placeholder={`e.g., ${totalDays}`}
                  className="w-full px-4 py-2 border border-green-300 dark:border-green-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm dark:bg-gray-700 dark:text-white"
                />
              </div>
              <button
                onClick={applyToAll}
                disabled={!selectedClass || students.length === 0 || !bulkDays}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition font-medium whitespace-nowrap text-xs md:text-sm"
              >
                Apply to All
              </button>
            </div>
            <p className="text-xs text-green-700 dark:text-green-400 mt-2">
              Set the same attendance for all students, then adjust individual cases
            </p>
          </div>
        </div>

        {/* Class Selection & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 overflow-x-auto pb-2 md:pb-0">
              {teacherClasses.map((cls) => (
                <button
                  key={cls.class_id}
                  onClick={() => setSelectedClass(cls.class_id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedClass === cls.class_id
                      ? 'bg-ghana-green text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cls.class_name}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Genders</option>
                <option value="male">Boys</option>
                <option value="female">Girls</option>
              </select>
            </div>
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Term
              </label>
              <div className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium text-sm">
                {currentTerm ? `${currentTerm.name} (${currentTerm.academic_year})` : 'No term selected'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Sort Options */}
        {selectedClass && students.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white mb-4">Filter & Sort Options</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Show Students
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setGenderFilter('all')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-xs md:text-sm ${
                      genderFilter === 'all'
                        ? 'bg-ghana-green text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    onClick={() => setGenderFilter('male')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-xs md:text-sm ${
                      genderFilter === 'male'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Boys ({students.filter(s => s.gender?.toLowerCase() === 'male').length})
                  </button>
                  <button
                    onClick={() => setGenderFilter('female')}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-xs md:text-sm ${
                      genderFilter === 'female'
                        ? 'bg-pink-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Girls ({students.filter(s => s.gender?.toLowerCase() === 'female').length})
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-xs md:text-sm dark:bg-gray-700 dark:text-white"
                >
                  <option value="name">Name (A-Z)</option>
                  <option value="boys-first">Boys First</option>
                  <option value="girls-first">Girls First</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        {selectedClass && students.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 md:p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Total Students</p>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white">{stats.totalStudents}</p>
              <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Boys: {stats.boys} | Girls: {stats.girls}
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg shadow p-4 md:p-6 border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-green-700 dark:text-green-300 text-xs md:text-sm font-medium">Overall Rate</p>
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-green-800 dark:text-green-200">{stats.overallRate}%</p>
              <p className="text-[10px] md:text-sm text-green-600 dark:text-green-400 mt-1">
                Class average attendance
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow p-4 md:p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-700 dark:text-blue-300 text-xs md:text-sm font-medium">Boys Rate</p>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-blue-800 dark:text-blue-200">{stats.boysRate}%</p>
              <p className="text-[10px] md:text-sm text-blue-600 dark:text-blue-400 mt-1">
                {stats.boys} male students
              </p>
            </div>

            <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg shadow p-4 md:p-6 border border-pink-200 dark:border-pink-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-pink-700 dark:text-pink-300 text-xs md:text-sm font-medium">Girls Rate</p>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="text-xl md:text-3xl font-bold text-pink-800 dark:text-pink-200">{stats.girlsRate}%</p>
              <p className="text-[10px] md:text-sm text-pink-600 dark:text-pink-400 mt-1">
                {stats.girls} female students
              </p>
            </div>
          </div>
        )}

        {/* Student Attendance List */}
        {selectedClass && students.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 flex justify-between items-center">
              <div>
                <h3 className="text-base md:text-lg font-semibold text-gray-800 dark:text-white">
                  Student Attendance ({getFilteredAndSortedStudents().length} of {students.length} students)
                </h3>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Total school days: {totalDays} days | <span className="font-medium">Tip: Press Tab or Enter to move to next student</span>
                </p>
              </div>
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-2 text-orange-600 dark:text-orange-400">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm font-semibold">Unsaved Changes</span>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Gender</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Days Present</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {getFilteredAndSortedStudents().map((student, index) => {
                    const daysPresent = attendance[student.id] || 0
                    const percentage = totalDays > 0 ? ((daysPresent / totalDays) * 100).toFixed(1) : '0'
                    return (
                      <tr key={student.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        student.gender?.toLowerCase() === 'male' ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-pink-50/30 dark:bg-pink-900/10'
                      }`}>
                        <td className="px-6 py-4 text-xs md:text-sm font-bold text-gray-500 dark:text-gray-400">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 text-xs md:text-sm text-gray-900 dark:text-white">
                          {student.last_name} {student.first_name}
                        </td>
                        <td className="px-6 py-4 text-xs md:text-sm">
                          <span className={`px-2 py-1 rounded-full text-[10px] md:text-xs font-semibold ${
                            student.gender?.toLowerCase() === 'male' 
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                              : 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
                          }`}>
                            {student.gender}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <input
                              id={`attendance-${student.id}`}
                              type="number"
                              min="0"
                              max={totalDays}
                              value={daysPresent}
                              onChange={(e) => handleAttendanceChange(student.id, parseInt(e.target.value) || 0)}
                              onKeyDown={(e) => handleKeyDown(e, index)}
                              autoFocus={index === 0}
                              className="w-16 md:w-20 px-2 md:px-3 py-1 md:py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-center text-sm md:text-lg font-semibold focus:ring-2 focus:ring-ghana-green focus:border-ghana-green transition dark:bg-gray-700 dark:text-white"
                            />
                            <span className="text-gray-500 dark:text-gray-400 text-xs md:text-sm font-medium">/ {totalDays}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                            parseFloat(percentage) >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                            parseFloat(percentage) >= 75 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                            parseFloat(percentage) >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                            'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          }`}>
                            {percentage}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selectedClass && students.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">No Students Found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              There are no active students in the selected class.
            </p>
          </div>
        )}

        {!selectedClass && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">Select a Class</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Please select a class above to record attendance.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
