'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Users, TrendingUp, AlertCircle, Search } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from 'react-hot-toast'

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  middle_name?: string
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

  const isReadOnly = teacher?.status === 'on_leave' || teacher?.status === 'on leave'

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
      .select('id, student_id, first_name, last_name, middle_name, gender')
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
      toast.error(`Please enter a valid number between 0 and ${totalDays}`)
      return
    }

    const newAttendance: { [key: string]: number } = {}
    students.forEach(student => {
      newAttendance[student.id] = days
    })
    setAttendance(newAttendance)
    setHasUnsavedChanges(true)
    setBulkDays('')
    toast.success(`Applied ${days} days to all ${students.length} students`)
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
    if (isReadOnly) return
    
    setSaving(true)
    try {
      const updates = Object.entries(attendance).map(([studentId, days]) => ({
        student_id: studentId,
        class_id: selectedClass,
        term_id: selectedTerm,
        days_present: days,
        recorded_by: teacher.id
      }))

      // Upsert attendance records
      const { error } = await supabase
        .from('student_attendance')
        .upsert(updates, {
          onConflict: 'student_id,term_id',
          ignoreDuplicates: false
        })

      if (error) throw error

      setHasUnsavedChanges(false)
      toast.success('Attendance saved successfully!')
      await loadStudents() // Reload to get updated records
    } catch (error: any) {
      console.error('Error saving attendance:', error)
      toast.error(`Failed to save attendance: ${error.message}`)
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 h-16 w-full">
            <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
                <Skeleton className="w-32 h-6" />
                <Skeleton className="w-24 h-9 rounded-md" />
            </div>
        </nav>
        <div className="max-w-7xl mx-auto px-4 w-full py-8 space-y-8">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
                <Skeleton className="h-32 rounded-lg" />
            </div>
            <Skeleton className="h-96 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <BackButton 
                label="Back to Dashboard" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              />
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <EmptyState 
            title="No Class Teacher Assignment" 
            description="You must be assigned as a class teacher to record attendance."
            icon={AlertCircle}
          />
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
              <BackButton 
                label="Back to Dashboard" 
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-xs md:text-sm"
              />
            </div>
            <div className="flex items-center space-x-3">
              {hasUnsavedChanges && (
                <span className="text-xs md:text-sm text-orange-600 dark:text-orange-400 font-medium">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleSaveAttendance}
                disabled={saving || !selectedClass || students.length === 0 || isReadOnly}
                className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-md hover:shadow-lg text-white rounded-xl disabled:opacity-50 transition-all font-semibold text-xs md:text-sm"
              >
                <Save className="w-5 h-5" />
                <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isReadOnly && (
          <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-200">Read-Only Mode</h3>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You are currently marked as "On Leave". You can view attendance records but cannot make changes.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">Record Attendance</h1>
          <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
            Enter the number of days each student was present during {currentTerm?.name}
          </p>
        </div>

        {/* Instructions & Quick Fill */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-6 shadow-sm">
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

          <div className="bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-emerald-900 dark:text-emerald-300 mb-4 text-sm md:text-base flex items-center gap-2"><span className="text-lg">⚡</span> Quick Fill All Students</h3>
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
                  className="w-full px-4 py-2.5 border-0 bg-white dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm shadow-sm dark:text-white font-medium"
                />
              </div>
              <button
                onClick={applyToAll}
                disabled={!selectedClass || students.length === 0 || !bulkDays || isReadOnly}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-all font-semibold whitespace-nowrap text-xs md:text-sm shadow-sm"
              >
                Apply to All
              </button>
            </div>
            <p className="text-xs text-emerald-700 dark:text-green-400 mt-2">
              Set the same attendance for all students, then adjust individual cases
            </p>
          </div>
        </div>

        {/* Class Selection & Filters */}
        <div className="bg-white dark:bg-gray-800/80 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 md:p-6 mb-6 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4 overflow-x-auto pb-2 md:pb-0">
              {teacherClasses.map((cls) => (
                <button
                  key={cls.class_id}
                  onClick={() => setSelectedClass(cls.class_id)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                    selectedClass === cls.class_id
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {cls.class_name}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 border-0 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 dark:text-white font-medium transition-all"
                />
              </div>
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                className="w-full sm:w-auto px-4 py-2.5 border-0 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 dark:text-white font-medium transition-all"
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
              <div className="w-full px-4 py-2.5 border-0 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 font-semibold text-sm">
                {currentTerm ? `${currentTerm.name} (${currentTerm.academic_year})` : 'No term selected'}
              </div>
            </div>
          </div>
        </div>

        {/* Filter and Sort Options */}
        {selectedClass && students.length > 0 && (
          <div className="bg-white dark:bg-gray-800/80 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 md:p-6 mb-6 backdrop-blur-sm">
            <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white mb-4">Filter & Sort Options</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Show Students
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setGenderFilter('all')}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-xs md:text-sm ${
                      genderFilter === 'all'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    All ({students.length})
                  </button>
                  <button
                    onClick={() => setGenderFilter('male')}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-xs md:text-sm ${
                      genderFilter === 'male'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Boys ({students.filter(s => s.gender?.toLowerCase() === 'male').length})
                  </button>
                  <button
                    onClick={() => setGenderFilter('female')}
                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 text-xs md:text-sm ${
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
                  className="w-full px-4 py-2.5 border-0 bg-gray-50 dark:bg-gray-900/50 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-800 text-xs md:text-sm font-medium transition-all"
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
            <div className="bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-4 md:p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">Total Students</p>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500" />
              </div>
              <p className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white my-1">{stats.totalStudents}</p>
              <p className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                Boys: {stats.boys} | Girls: {stats.girls}
              </p>
            </div>

            <div className="bg-emerald-50/50 dark:bg-emerald-900/20 rounded-2xl shadow-sm p-4 md:p-6 border border-emerald-100 dark:border-emerald-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-emerald-700 dark:text-green-300 text-xs md:text-sm font-medium">Overall Rate</p>
                <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-600 dark:text-green-400" />
              </div>
              <p className="text-2xl md:text-4xl font-black text-emerald-700 dark:text-emerald-400 my-1">{stats.overallRate}%</p>
              <p className="text-[10px] md:text-sm text-emerald-600 dark:text-green-400 mt-1">
                Class average attendance
              </p>
            </div>

            <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl shadow-sm p-4 md:p-6 border border-blue-100 dark:border-blue-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-blue-700 dark:text-blue-300 text-xs md:text-sm font-medium">Boys Rate</p>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-2xl md:text-4xl font-black text-blue-700 dark:text-blue-400 my-1">{stats.boysRate}%</p>
              <p className="text-[10px] md:text-sm text-blue-600 dark:text-blue-400 mt-1">
                {stats.boys} male students
              </p>
            </div>

            <div className="bg-pink-50/50 dark:bg-pink-900/20 rounded-2xl shadow-sm p-4 md:p-6 border border-pink-100 dark:border-pink-800/50">
              <div className="flex items-center justify-between mb-2">
                <p className="text-pink-700 dark:text-pink-300 text-xs md:text-sm font-medium">Girls Rate</p>
                <Users className="w-4 h-4 md:w-5 md:h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="text-2xl md:text-4xl font-black text-pink-700 dark:text-pink-400 my-1">{stats.girlsRate}%</p>
              <p className="text-[10px] md:text-sm text-pink-600 dark:text-pink-400 mt-1">
                {stats.girls} female students
              </p>
            </div>
          </div>
        )}

        {/* Student Attendance List */}
        {selectedClass && students.length > 0 && (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800/90 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Student Attendance ({getFilteredAndSortedStudents().length} of {students.length} students)
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
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
                  <thead className="bg-gray-50/80 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Gender</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Days Present</th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attendance %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {getFilteredAndSortedStudents().map((student, index) => {
                      const daysPresent = attendance[student.id] || 0
                      const percentage = totalDays > 0 ? ((daysPresent / totalDays) * 100).toFixed(1) : '0'
                      return (
                        <tr key={student.id} className={`hover:bg-white dark:hover:bg-gray-700 transition-colors ${
                          student.gender?.toLowerCase() === 'male' ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'bg-pink-50/30 dark:bg-pink-900/10'
                        }`}>
                          <td className="px-6 py-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                            {student.last_name}, {student.first_name} {student.middle_name}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
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
                                disabled={isReadOnly}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value)
                                  if (!isNaN(val) && val >= 0 && val <= totalDays) {
                                    handleAttendanceChange(student.id, val)
                                  }
                                }}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                className="w-20 px-2 py-1.5 text-center font-bold text-sm bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent dark:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              />
                              <span className="text-sm text-gray-500 dark:text-gray-400">/ {totalDays}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
               <div className="flex justify-between items-center mb-2 px-1">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Showing {getFilteredAndSortedStudents().length} students
                  </span>
                  {hasUnsavedChanges && (
                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" /> Unsaved
                    </span>
                  )}
               </div>
               {getFilteredAndSortedStudents().map((student, index) => {
                  const daysPresent = attendance[student.id] || 0
                  const percentage = totalDays > 0 ? ((daysPresent / totalDays) * 100).toFixed(1) : '0'
                  return (
                    <div key={student.id} className={`p-4 rounded-2xl shadow-sm border ${
                      student.gender?.toLowerCase() === 'male' 
                        ? 'bg-blue-50/20 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800' 
                        : 'bg-pink-50/20 border-pink-100 dark:bg-pink-900/10 dark:border-pink-800'
                    }`}>
                      <div className="flex justify-between items-start mb-3 bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-base">
                            {student.last_name}, {student.first_name} {student.middle_name}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                              #{index + 1}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                              student.gender?.toLowerCase() === 'male'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
                            }`}>
                              {student.gender}
                            </span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          parseFloat(percentage) >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                          parseFloat(percentage) >= 75 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                          parseFloat(percentage) >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {percentage}%
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm">
                        <label htmlFor={`mobile-attendance-${student.id}`} className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                          Days Present:
                        </label>
                        <div className="flex-1 flex items-center space-x-2">
                          <input
                            id={`mobile-attendance-${student.id}`}
                            type="number"
                            min="0"
                            max={totalDays}
                            value={daysPresent} // Keep it controlled
                            disabled={isReadOnly}
                            onChange={(e) => {
                              // Direct update on change for better mobile feel, but validate
                              const valStr = e.target.value
                              if (valStr === '') return // Allow empty temporarily while typing
                              const val = parseInt(valStr)
                              if (!isNaN(val) && val >= 0 && val <= totalDays) {
                                handleAttendanceChange(student.id, val)
                              }
                            }}
                            className="flex-1 px-3 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-lg"
                          />
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                            / {totalDays} days
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </>
        )}

        {selectedClass && students.length === 0 && (
          <EmptyState
            title="No Students Found"
            description="There are no active students in the selected class."
            icon={Users}
            className="bg-white dark:bg-gray-800 shadow p-12"
          />
        )}

        {!selectedClass && (
          <EmptyState
            title="Select a Class"
            description="Please select a class above to record attendance."
            icon={AlertCircle}
            className="bg-white dark:bg-gray-800 shadow p-12"
          />
        )}
      </main>
    </div>
  )
}
