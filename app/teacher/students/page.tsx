'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Search, GraduationCap, AlertCircle, Filter, Grid, List, Edit, Trash2, Phone, Mail, KeyRound, CheckSquare, Square, ArrowUpDown } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'

export default function MyStudentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [students, setStudents] = useState<any[]>([])
  const [teacherClasses, setTeacherClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [sortBy, setSortBy] = useState('name_asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; student: any | null }>({ show: false, student: null })
  const [deleting, setDeleting] = useState(false)
  const [resetPasswordModal, setResetPasswordModal] = useState<{ show: boolean; student: any | null }>({ show: false, student: null })
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Check if teacher can manage students (only class teachers can)
  const canManageStudentsInClass = (classId: string) => {
    if (classId === 'all') {
      // Check if user is class teacher for at least one class
      return teacherClasses.some(c => c.is_class_teacher)
    }
    const classAccess = teacherClasses.find(c => c.class_id === classId)
    return classAccess?.is_class_teacher || false
  }

  const isClassTeacher = canManageStudentsInClass(selectedClass)

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
          setError('Teacher profile not found')
          setLoading(false)
          return
        }

        // Get teacher's assigned classes
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        setTeacherClasses(classAccess)

        if (classAccess.length === 0) {
          setLoading(false)
          return
        }

        // Load students only from teacher's assigned classes
        const classIds = classAccess.map(c => c.class_id)
        const { data, error: studentsError } = await supabase
          .from('students')
          .select(`
            *,
            classes(
              id,
              name
            )
          `)
          .in('class_id', classIds)
          .eq('status', 'active')
          .order('first_name')

        if (studentsError) {
          console.error('Error loading students:', studentsError)
          setError('Failed to load students')
        } else if (data) {
          setStudents(data)
        }
      } catch (err: any) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClass = selectedClass === 'all' || student.class_id === selectedClass

    return matchesSearch && matchesClass
  }).sort((a, b) => {
    if (sortBy === 'name_asc') {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase()
      return nameA.localeCompare(nameB)
    }
    if (sortBy === 'name_desc') {
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase()
      return nameB.localeCompare(nameA)
    }
    if (sortBy === 'id_asc') {
      return (a.student_id || '').localeCompare(b.student_id || '')
    }
    if (sortBy === 'id_desc') {
      return (b.student_id || '').localeCompare(a.student_id || '')
    }
    if (sortBy === 'gender_male') {
      // Sort by gender (Male first), then by name
      const genderA = (a.gender || '').toLowerCase()
      const genderB = (b.gender || '').toLowerCase()
      if (genderA !== genderB) {
        return genderA === 'male' ? -1 : 1
      }
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase()
      return nameA.localeCompare(nameB)
    }
    if (sortBy === 'gender_female') {
      // Sort by gender (Female first), then by name
      const genderA = (a.gender || '').toLowerCase()
      const genderB = (b.gender || '').toLowerCase()
      if (genderA !== genderB) {
        return genderA === 'female' ? -1 : 1
      }
      const nameA = `${a.last_name} ${a.first_name}`.toLowerCase()
      const nameB = `${b.last_name} ${b.first_name}`.toLowerCase()
      return nameA.localeCompare(nameB)
    }
    return 0
  })

  function getResetCredentials(student: any) {
    if (!student) return { username: '', password: '' }

    // Generate username: First 3 letters of firstname + Last 3 letters of lastname
    const sanitizedFirst = (student.first_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const sanitizedLast = (student.last_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    
    const firstPart = sanitizedFirst.substring(0, 3)
    const lastPart = sanitizedLast.substring(Math.max(0, sanitizedLast.length - 3))
    let newUsername = `${firstPart}${lastPart}`.toLowerCase()
    
    // Ensure username is at least 3 chars
    if (newUsername.length < 3) {
       newUsername = (sanitizedFirst + sanitizedLast).substring(0, 6).toLowerCase()
    }

    // Generate password: Date of birth in DD-MM-YYYY format
    let newPassword = 'Student123!' // Fallback
    if (student.date_of_birth) {
      // date_of_birth is YYYY-MM-DD in DB
      const parts = student.date_of_birth.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        newPassword = `${day}-${month}-${year}`
      }
    }

    return { username: newUsername, password: newPassword }
  }

  async function handleResetPassword() {
    if (!resetPasswordModal.student) return

    setResetting(true)
    setResetSuccess(false)
    try {
      const student = resetPasswordModal.student
      const { username: newUsername, password: newPassword } = getResetCredentials(student)
      
      // Get the student's profile_id to reset their password
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('profile_id, profiles(email)')
        .eq('id', student.id)
        .single() as { data: any; error: any }

      if (studentError || !studentData?.profile_id) {
        throw new Error('Student profile not found')
      }

      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser()
      
      // Call the admin update user endpoint via API route
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentData.profile_id,
          newPassword: newPassword,
          newUsername: newUsername,
          requesterId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset password')
      }

      setResetSuccess(true)
      setTimeout(() => {
        setResetPasswordModal({ show: false, student: null })
        setResetSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      alert(`Failed to reset password: ${err.message}`)
    } finally {
      setResetting(false)
    }
  }

  async function handleDelete() {
    if (!deleteModal.student) return

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deleteModal.student.id)

      if (error) throw error

      // Remove from local state
      setStudents(students.filter(s => s.id !== deleteModal.student.id))
      setDeleteModal({ show: false, student: null })
    } catch (err: any) {
      alert('Failed to delete student: ' + err.message)
    } finally {
      setDeleting(false)
    }
  }

  function toggleStudentSelection(studentId: string) {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  function toggleSelectAll() {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([])
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id))
    }
  }

  async function handleBulkDelete() {
    if (selectedStudents.length === 0) return

    setBulkDeleting(true)
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .in('id', selectedStudents)

      if (error) throw error

      // Remove from local state
      setStudents(students.filter(s => !selectedStudents.includes(s.id)))
      setSelectedStudents([])
      setBulkDeleteModal(false)
    } catch (err: any) {
      alert('Failed to delete students: ' + err.message)
    } finally {
      setBulkDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading students...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700"
            >
              Reload Page
            </button>
            <Link
              href="/teacher/dashboard"
              className="block w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <Link href="/teacher/dashboard" className="text-ghana-green hover:text-green-700 flex-shrink-0">
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              </Link>
              <div>
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">My Students</h1>
                <p className="text-xs md:text-sm text-gray-600 mt-0.5">
                  {isClassTeacher ? 'View and manage students in your classes' : 'View students in your assigned classes'}
                </p>
              </div>
            </div>
            {isClassTeacher && (
              <Link
                href="/teacher/students/add"
                className="bg-ghana-green text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 text-xs md:text-sm whitespace-nowrap"
              >
                <Users className="w-4 h-4 md:w-5 md:h-5" />
                <span>Add Student</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* No Classes Assigned */}
        {teacherClasses.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 md:p-8 text-center">
            <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-2">No Classes Assigned</h2>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              You are not currently assigned to any classes. Please contact the school administrator.
            </p>
            <Link
              href="/teacher/dashboard"
              className="inline-block bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700 text-sm md:text-base"
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {/* Search and Filter */}
        {teacherClasses.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-4 md:mb-6">
              <div className="grid md:grid-cols-3 gap-3 md:gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-xs md:text-sm"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-xs md:text-sm"
                  >
                    <option value="all">All Classes</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent text-xs md:text-sm"
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="id_asc">Student ID (Asc)</option>
                    <option value="id_desc">Student ID (Desc)</option>
                    <option value="gender_male">Gender (Male First)</option>
                    <option value="gender_female">Gender (Female First)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Actions Bar */}
            {isClassTeacher && selectedStudents.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                    <span className="text-xs md:text-sm font-medium text-gray-800">
                      {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedStudents([])}
                      className="px-3 py-1.5 text-xs md:text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setBulkDeleteModal(true)}
                      className="px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs md:text-sm font-medium flex items-center space-x-2"
                    >
                      <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                      <span>Delete Selected</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary and View Toggle */}
            <div className="bg-white rounded-lg shadow p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">
                    Showing <span className="font-semibold text-ghana-green">{filteredStudents.length}</span> student{filteredStudents.length !== 1 ? 's' : ''}
                    {selectedClass !== 'all' && ` in ${teacherClasses.find(c => c.class_id === selectedClass)?.class_name}`}
                  </p>
                </div>
                <div className="flex items-center space-x-3 md:space-x-4 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-xs md:text-sm text-gray-600">
                    Total: <span className="font-semibold">{students.length}</span> student{students.length !== 1 ? 's' : ''}
                  </div>
                  <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-2 md:px-3 py-1.5 flex items-center space-x-1 ${
                        viewMode === 'grid' 
                          ? 'bg-ghana-green text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Grid className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm">Grid</span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`px-2 md:px-3 py-1.5 flex items-center space-x-1 ${
                        viewMode === 'list' 
                          ? 'bg-ghana-green text-white' 
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <List className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="text-xs md:text-sm">List</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Students Grid/List View */}
            {filteredStudents.length > 0 ? (
              viewMode === 'grid' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4 md:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="bg-ghana-green bg-opacity-10 p-3 md:p-4 rounded-full flex-shrink-0">
                          <GraduationCap className="w-6 h-6 md:w-8 md:h-8 text-ghana-green" />
                        </div>
                        {canManageStudentsInClass(student.class_id) && (
                          <div className="flex space-x-1 md:space-x-2">
                            <Link
                              href={`/teacher/students/edit/${student.id}`}
                              className="p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Edit student"
                            >
                              <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </Link>
                            <button
                              onClick={() => setResetPasswordModal({ show: true, student })}
                              className="p-1.5 md:p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition"
                              title="Reset password"
                            >
                              <KeyRound className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ show: true, student })}
                              className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                              title="Delete student"
                            >
                              <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-base md:text-lg text-gray-800 truncate">
                          {student.last_name} {student.first_name}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500">{student.student_id}</p>
                        <div className="mt-2 md:mt-3 space-y-1">
                          <p className="text-xs md:text-sm text-ghana-green font-medium">{student.classes?.name || 'No Class'}</p>
                          {student.guardian_name && (
                            <p className="text-xs text-gray-600 truncate">Guardian: {student.guardian_name}</p>
                          )}
                          {student.guardian_phone && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />
                              <span>{student.guardian_phone}</span>
                            </div>
                          )}
                          {student.guardian_email && (
                            <div className="flex items-center space-x-1 text-xs text-gray-500">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{student.guardian_email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {isClassTeacher && (
                          <th className="px-3 md:px-4 py-2 md:py-3 text-left">
                            <button
                              onClick={toggleSelectAll}
                              className="flex items-center justify-center"
                              title={selectedStudents.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                            >
                              {selectedStudents.length === filteredStudents.length && filteredStudents.length > 0 ? (
                                <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-ghana-green" />
                              ) : (
                                <Square className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                              )}
                            </button>
                          </th>
                        )}
                        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Student ID
                        </th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Class
                        </th>
                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Guardian
                        </th>
                        <th className="hidden lg:table-cell px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-3 md:px-6 py-2 md:py-3 text-right text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStudents.map((student) => (
                        <tr key={student.id} className={`hover:bg-gray-50 ${selectedStudents.includes(student.id) ? 'bg-green-50' : ''}`}>
                          {isClassTeacher && canManageStudentsInClass(student.class_id) && (
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <button
                                onClick={() => toggleStudentSelection(student.id)}
                                className="flex items-center justify-center"
                              >
                                {selectedStudents.includes(student.id) ? (
                                  <CheckSquare className="w-4 h-4 md:w-5 md:h-5 text-ghana-green" />
                                ) : (
                                  <Square className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
                                )}
                              </button>
                            </td>
                          )}
                          {isClassTeacher && !canManageStudentsInClass(student.class_id) && (
                            <td className="px-3 md:px-4 py-3 md:py-4">
                              <Square className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
                            </td>
                          )}
                          <td className="px-3 md:px-6 py-3 md:py-4">
                            <div className="flex items-center">
                              <div className="bg-ghana-green bg-opacity-10 p-1.5 md:p-2 rounded-full flex-shrink-0">
                                <GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-ghana-green" />
                              </div>
                              <div className="ml-2 md:ml-4">
                                <div className="text-xs md:text-sm font-medium text-gray-900">
                                  {student.last_name} {student.first_name}
                                </div>
                                <div className="md:hidden text-xs text-gray-500 mt-0.5">
                                  {student.student_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <div className="text-xs md:text-sm text-gray-900">{student.student_id}</div>
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                            <span className="px-1.5 md:px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {student.classes?.name || 'No Class'}
                            </span>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                            {student.guardian_name || '-'}
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                            <div className="space-y-1">
                              {student.guardian_phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{student.guardian_phone}</span>
                                </div>
                              )}
                              {student.guardian_email && (
                                <div className="flex items-center space-x-1">
                                  <Mail className="w-3 h-3" />
                                  <span className="truncate max-w-[150px]">{student.guardian_email}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                            {canManageStudentsInClass(student.class_id) ? (
                              <div className="flex justify-end space-x-1 md:space-x-2">
                                <Link
                                  href={`/teacher/students/edit/${student.id}`}
                                  className="text-blue-600 hover:text-blue-900 p-0.5 md:p-1"
                                  title="Edit"
                                >
                                  <Edit className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </Link>
                                <button
                                  onClick={() => setResetPasswordModal({ show: true, student })}
                                  className="text-yellow-600 hover:text-yellow-900 p-0.5 md:p-1"
                                  title="Reset Password"
                                >
                                  <KeyRound className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteModal({ show: true, student })}
                                  className="text-red-600 hover:text-red-900 p-0.5 md:p-1"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">View Only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center">
                <Users className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || selectedClass !== 'all' ? 'No students match your search' : 'No students yet'}
                </h3>
                <p className="text-sm md:text-base text-gray-600 mb-6">
                  {searchTerm || selectedClass !== 'all' 
                    ? 'Try adjusting your filters or search term' 
                    : 'Add students to your classes to get started'}
                </p>
                {!searchTerm && selectedClass === 'all' && isClassTeacher && (
                  <Link
                    href="/teacher/students/add"
                    className="inline-block bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700 text-sm md:text-base"
                  >
                    Add Your First Student
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Reset Password Modal */}
      {resetPasswordModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-2 md:p-3 rounded-full">
                <KeyRound className="w-5 h-5 md:w-6 md:h-6 text-yellow-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Reset Password</h3>
            </div>
            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="bg-green-100 p-3 rounded-full w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-6 h-6 md:w-8 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-semibold text-sm md:text-base">Password reset successfully!</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-2 text-xs md:text-sm">
                  Are you sure you want to reset the password for <span className="font-semibold">{resetPasswordModal.student?.last_name} {resetPasswordModal.student?.first_name}</span>?
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-xs md:text-sm text-blue-800">
                    <span className="font-semibold">New Password:</span> {getResetCredentials(resetPasswordModal.student).password}
                  </p>
                  <p className="text-[10px] md:text-xs text-blue-600 mt-1">
                    The password will be reset to the student's Date of Birth (DD-MM-YYYY)
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setResetPasswordModal({ show: false, student: null })}
                    disabled={resetting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs md:text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2 text-xs md:text-sm"
                  >
                    {resetting ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-3 h-3 md:w-4 md:h-4" />
                        <span>Reset Password</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 md:p-3 rounded-full">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Delete Student</h3>
            </div>
            <p className="text-gray-600 mb-6 text-xs md:text-sm">
              Are you sure you want to delete <span className="font-semibold">{deleteModal.student?.last_name} {deleteModal.student?.first_name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteModal({ show: false, student: null })}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs md:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2 text-xs md:text-sm"
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4 md:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 p-2 md:p-3 rounded-full">
                <AlertCircle className="w-5 h-5 md:w-6 md:h-6 text-red-600" />
              </div>
              <h3 className="text-lg md:text-xl font-bold text-gray-900">Delete Multiple Students</h3>
            </div>
            <p className="text-gray-600 mb-6 text-xs md:text-sm">
              Are you sure you want to delete <span className="font-semibold">{selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBulkDeleteModal(false)}
                disabled={bulkDeleting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-xs md:text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2 text-xs md:text-sm"
              >
                {bulkDeleting ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 md:h-4 md:w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                    <span>Delete {selectedStudents.length} Student{selectedStudents.length > 1 ? 's' : ''}</span>
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
