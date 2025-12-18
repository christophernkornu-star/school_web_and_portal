'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, Search, Filter, Edit, Trash2, ArrowLeft, Plus, Upload, Download, Check, AlertCircle } from 'lucide-react'
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
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
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

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMessage('')
    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      // Define valid columns for students table
      const validColumns = [
        'first_name', 'last_name', 'date_of_birth', 'gender', 'class_name',
        'guardian_name', 'guardian_phone', 'guardian_email', 'admission_date', 
        'password', 'email'
      ]
      
      let successCount = 0
      let errorCount = 0
      const totalRecords = lines.length - 1

      setUploadMessage(`Processing 0 of ${totalRecords} students...`)

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const student: any = {}
        headers.forEach((header, index) => {
          // Only include valid columns
          if (validColumns.includes(header)) {
            student[header] = values[index]
          }
        })

        try {
          // Validate required fields
          const requiredFields = ['first_name', 'last_name', 'date_of_birth', 'gender', 'class_name', 'guardian_name', 'guardian_phone']
          const missingFields = requiredFields.filter(field => !student[field] || student[field] === '')
          
          if (missingFields.length > 0) {
            console.error(`Row ${i + 1}: Missing required fields: ${missingFields.join(', ')}`)
            errorCount++
            setUploadMessage(`Row ${i + 1}: Missing required fields: ${missingFields.join(', ')}`)
            continue
          }

          // Find class by name
          const { data: classData } = await supabase
            .from('classes')
            .select('id')
            .eq('name', student.class_name)
            .single() as { data: any }

          if (!classData) {
            console.error(`Row ${i + 1}: Class "${student.class_name}" not found`)
            errorCount++
            setUploadMessage(`Row ${i + 1}: Class "${student.class_name}" not found`)
            continue
          }

          // Sanitize names for email/username (remove spaces and special characters)
          const sanitizedFirst = student.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          const sanitizedLast = student.last_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          // Create auth user
          const email = student.email || `${sanitizedFirst}.${sanitizedLast}@student.biriwa.edu.gh`
          const username = `${sanitizedFirst}.${sanitizedLast}`
          const password = student.password || 'Student123!'

          let user = null
          try {
            const result = await createUserAction({
              email,
              password,
              username,
              full_name: `${student.first_name} ${student.last_name}`,
              role: 'student'
            })
            user = result.user
          } catch (err) {
            console.error('Error creating user:', err)
          }

          if (!user) {
            errorCount++
            setUploadMessage(`Processing ${i} of ${totalRecords} students... (${errorCount} failed)`)
            // Add delay to avoid rate limiting on next attempt
            await new Promise(resolve => setTimeout(resolve, 2000))
            continue
          }

          // Create or update profile (upsert in case profile was auto-created)
          await supabase.from('profiles').upsert({
            id: user.id,
            email,
            username,
            full_name: `${student.first_name} ${student.last_name}`,
            role: 'student'
          }, {
            onConflict: 'id'
          })

          // Create student record (student_id will auto-generate)
          const { error: studentError } = await supabase.from('students').insert({
            profile_id: user.id,
            first_name: student.first_name,
            last_name: student.last_name,
            date_of_birth: student.date_of_birth,
            gender: student.gender,
            class_id: classData.id,
            guardian_name: student.guardian_name,
            guardian_phone: student.guardian_phone,
            guardian_email: student.guardian_email || null,
            admission_date: student.admission_date || new Date().toISOString().split('T')[0],
            status: 'active'
          })

          if (studentError) {
            console.error('Student insert error:', studentError)
            errorCount++
            setUploadMessage(`Processing ${i} of ${totalRecords} students... Error: ${studentError.message}`)
            continue
          }

          successCount++
          setUploadMessage(`Processing ${i} of ${totalRecords} students... (${successCount} successful)`)
          
          // Add 2-second delay between each account creation to avoid rate limiting
          if (i < lines.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        } catch (err: any) {
          console.error('Error creating student:', err)
          errorCount++
          setUploadMessage(`Processing ${i} of ${totalRecords} students... Error: ${err?.message || 'Unknown error'}`)
        }
      }

      setUploadMessage(`✅ Upload complete! ${successCount} students created successfully. ${errorCount > 0 ? `${errorCount} failed.` : ''}`)
      setTimeout(() => {
        setShowUploadModal(false)
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error('CSV parsing error:', err)
      setUploadMessage('Error parsing CSV file. Please check the format.')
    } finally {
      setUploading(false)
    }
  }

  const downloadCSVTemplate = () => {
    const template = 'first_name,last_name,date_of_birth,gender,class_name,guardian_name,guardian_phone,guardian_email,admission_date,password\nKwame,Mensah,2014-05-20,Male,Basic 4,Mr. Emmanuel Mensah,+233244567890,parent@email.com,2024-01-15,Student123!\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'students_template.csv'
    a.click()
  }

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-methodist-blue hover:text-blue-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Student Management</h1>
                <p className="text-xs md:text-sm text-gray-600">View and manage all students</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-ghana-green text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2 flex-1 md:flex-none text-sm md:text-base"
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5" />
                <span>Upload CSV</span>
              </button>
              <Link 
                href="/admin/students/add"
                className="bg-methodist-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 flex-1 md:flex-none text-sm md:text-base"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
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
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
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
            <div className="flex items-center justify-between md:justify-end">
              <span className="text-gray-600 text-sm md:text-base">
                <strong>{filteredStudents.length}</strong> students found
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {filteredStudents.map((student) => (
            <div key={student.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-900">{student.first_name} {student.last_name}</h3>
                  <p className="text-sm text-gray-500">{student.student_id}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {student.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span className="font-medium">Class:</span>
                  <span>{student.classes?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Gender:</span>
                  <span>{student.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Guardian:</span>
                  <span>{student.guardian_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Phone:</span>
                  <span>{student.guardian_phone}</span>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <Link 
                  href={`/admin/students/${student.id}`} 
                  className="flex items-center space-x-1 text-methodist-blue hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                  <span className="text-sm">Edit</span>
                </Link>
                <button 
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete ${student.first_name} ${student.last_name}?`)) {
                      handleDeleteStudent(student.id, student.profile_id)
                    }
                  }}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-800 px-3 py-1.5 bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Delete</span>
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
                      <div className="text-sm font-medium text-gray-900">{student.first_name} {student.last_name}</div>
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

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" suppressHydrationWarning>
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Students CSV</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Upload a CSV file with student information. Required columns: first_name, last_name, date_of_birth, gender, class_name, guardian_name, guardian_phone, guardian_email, admission_date, password
              </p>
              
              <button
                onClick={downloadCSVTemplate}
                className="text-sm text-methodist-blue hover:underline flex items-center space-x-1 mb-4"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV Template</span>
              </button>

              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
              />
            </div>

            {uploadMessage && (
              <div className={`p-3 rounded-lg mb-4 ${
                uploadMessage.includes('Successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                <p className="text-sm">{uploadMessage}</p>
              </div>
            )}

            {uploading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-methodist-blue"></div>
                <span className="ml-3 text-gray-600">Processing CSV...</span>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
