'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Search, Filter, Edit, Trash2, ArrowLeft, Plus, Check, AlertCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createUserAction } from '@/app/actions/create-user'

export default function StudentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [classes, setClasses] = useState<any[]>([])
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    loadData()
  }, [router])

  async function loadData() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('level')
    
    if (classesData) setClasses(classesData)

    // Load students with class information
    const { data: studentsData } = await supabase
      .from('students')
      .select(`
        *,
        profiles:profile_id(full_name, email),
        classes:class_id(name, level)
      `)
      .order('first_name')

    if (studentsData) setStudents(studentsData)
    setLoading(false)
  }

  const handleDeleteStudent = async (studentId: string, profileId: string) => {
    try {
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete student')
      }

      setMessage({ type: 'success', text: 'Student deleted successfully!' })
      loadData() // Refresh the list
    } catch (error: any) {
      console.error('Error deleting student:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to delete student' })
    }
  }





  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.middle_name && student.middle_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      student.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesClass = classFilter === 'all' || student.class_id === classFilter

    return matchesSearch && matchesClass
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <Link href="/admin/dashboard" className="text-methodist-blue hover:text-blue-700 flex-shrink-0">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 leading-tight">Student Management</h1>
                <p className="text-xs sm:text-sm text-gray-600">View and manage all students</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Link 
                href="/admin/students/add"
                className="bg-methodist-blue text-white px-3 py-2 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 flex-1 sm:flex-none text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
            <button onClick={() => setMessage({ type: '', text: '' })} className="ml-auto text-sm">×</button>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
              />
            </div>
            <div className="relative md:w-64">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent appearance-none"
              >
                <option value="all">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end md:w-auto">
              <span className="text-gray-600 text-sm bg-gray-100 px-3 py-2 rounded-lg whitespace-nowrap">
                <strong>{filteredStudents.length}</strong> students
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{student.student_id}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {student.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4 flex-grow">
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="font-medium text-gray-500">Class</span>
                  <span className="font-semibold text-gray-900">{student.classes?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="font-medium text-gray-500">Gender</span>
                  <span>{student.gender}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-gray-50">
                  <span className="font-medium text-gray-500">Guardian</span>
                  <span className="text-right truncate max-w-[150px]">{student.guardian_name}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-medium text-gray-500">Phone</span>
                  <span className="font-mono">{student.guardian_phone}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t mt-auto">
                <Link 
                  href={`/admin/students/${student.id}`} 
                  className="flex items-center justify-center space-x-2 text-methodist-blue hover:bg-blue-50 px-3 py-2 rounded-lg border border-blue-200 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit</span>
                </Link>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) {
                      handleDeleteStudent(student.id, student.profile_id)
                    }
                  }}
                  className="flex items-center justify-center space-x-2 text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg border border-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guardian</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {student.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{student.first_name} {student.middle_name ? `${student.middle_name} ` : ''}{student.last_name}</div>
                      <div className="text-sm text-gray-500">{student.profiles?.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.classes?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.gender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.guardian_name}</div>
                      <div className="text-sm text-gray-500">{student.guardian_phone}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link href={`/admin/students/${student.id}`} className="text-methodist-blue hover:text-blue-700">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) {
                              handleDeleteStudent(student.id, student.profile_id)
                            }
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredStudents.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || classFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Get started by adding your first student'}
            </p>
            <Link 
              href="/admin/students/add"
              className="inline-flex items-center px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Student
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
