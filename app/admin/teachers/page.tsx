'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Search, Plus, ArrowLeft, Edit, Trash2, Upload, Download, KeyRound } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function TeachersPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState<{ show: boolean; teacher: any | null }>({ show: false, teacher: null })
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  async function handleResetPassword() {
    if (!resetPasswordModal.teacher) return

    setResetting(true)
    setResetSuccess(false)
    try {
      const teacher = resetPasswordModal.teacher
      // Default password is teacher_id padded to 8 characters (for Supabase Auth minimum)
      const defaultPassword = teacher.teacher_id.padStart(8, '0')
      
      // Get the teacher's profile_id to reset their password
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('profile_id, profiles(email)')
        .eq('id', teacher.id)
        .single() as { data: any; error: any }

      if (teacherError || !teacherData?.profile_id) {
        throw new Error('Teacher profile not found')
      }

      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser()
      
      console.log('Making password reset request:', {
        userId: teacherData.profile_id,
        requesterId: user?.id,
        userEmail: user?.email
      })
      
      // Call the admin update user endpoint via API route
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: teacherData.profile_id,
          newPassword: defaultPassword, // Padded password (8 chars)
          newUsername: teacher.teacher_id, // Keep original teacher_id as username
          requesterId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset password')
      }

      setResetSuccess(true)
      setTimeout(() => {
        setResetPasswordModal({ show: false, teacher: null })
        setResetSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      alert(`Failed to reset password: ${err.message}`)
    } finally {
      setResetting(false)
    }
  }

  async function handleDeleteTeacher(teacherId: string) {
    if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone. This will also delete their login account.')) {
      return
    }

    try {
      // Get current user's ID
      const { data: { user } } = await supabase.auth.getUser()
      
      // Call the delete API route
      const response = await fetch('/api/admin/delete-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          requesterId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete teacher')
      }

      setTeachers(prev => prev.filter(t => t.teacher_id !== teacherId))
      alert('Teacher and their login account deleted successfully')
    } catch (error: any) {
      alert('Failed to delete teacher: ' + error.message)
    }
  }

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('first_name')

      if (error) {
        console.error('Error loading teachers:', error)
      }

      if (data) {
        console.log('Teachers loaded:', data)
        setTeachers(data)
      } else {
        console.log('No teacher data returned')
      }
      setLoading(false)
    }

    loadData()
  }, [router])

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMessage('')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())
      
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      const totalRecords = lines.length - 1

      setUploadMessage(`Processing 0 of ${totalRecords} teachers...`)

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const teacher: any = {}
        headers.forEach((header, index) => {
          teacher[header] = values[index]
        })

        try {
          // Sanitize names for email/username
          const sanitizedFirst = teacher.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          const sanitizedLast = teacher.last_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          // Use Gmail for auth emails (change to actual school domain when available)
          const email = teacher.email || `${sanitizedFirst}.${sanitizedLast}.teacher@gmail.com`
          const password = teacher.password || 'Teacher123!'

          // Use the helper function from user-creation with retry logic
          const { createTeacher } = await import('@/lib/user-creation')
          
          const result = await createTeacher({
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email,
            password,
            phone: teacher.phone || null,
            specialization: teacher.specialization || null,
            qualification: teacher.qualification || null,
            hire_date: teacher.hire_date || new Date().toISOString().split('T')[0],
            staff_id: teacher.staff_id || null
          })

          successCount++
          setUploadMessage(`✅ Processing ${i} of ${totalRecords} teachers... (${successCount} successful, ${errorCount} failed)`)
          
          // Add 15-second delay between requests to avoid rate limiting
          // Supabase free tier has strict email signup limits
          if (i < lines.length - 1) {
            setUploadMessage(`⏳ Waiting 15 seconds before next teacher... (${successCount} successful, ${errorCount} failed)`)
            await new Promise(resolve => setTimeout(resolve, 15000))
          }
        } catch (err: any) {
          console.error('Error creating teacher:', err)
          errorCount++
          errors.push(`Row ${i}: ${err.message || 'Unknown error'}`)
          setUploadMessage(`❌ Processing ${i} of ${totalRecords} teachers... (${successCount} successful, ${errorCount} failed)`)
        }
      }

      if (errors.length > 0) {
        console.log('Upload errors:', errors)
      }

      setUploadMessage(`✅ Upload complete! ${successCount} teachers created successfully.${errorCount > 0 ? ` ${errorCount} failed (check console for details).` : ''}`)
      
      if (successCount > 0) {
        setTimeout(() => {
          setShowUploadModal(false)
          window.location.reload()
        }, 3000)
      }
    } catch (err) {
      console.error('CSV parsing error:', err)
      setUploadMessage('❌ Error parsing CSV file. Please check the format.')
    } finally {
      setUploading(false)
    }
  }

  const downloadCSVTemplate = () => {
    const template = 'staff_id,first_name,last_name,email,phone,specialization,qualification,hire_date,password\nTCH0001,John,Doe,john.doe.teacher@gmail.com,+233201234567,Mathematics,B.Ed Mathematics,2024-01-15,Teacher123!\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'teachers_template.csv'
    a.click()
  }

  const filteredTeachers = teachers.filter(teacher =>
    teacher.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.teacher_id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading teachers...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/dashboard" className="text-methodist-blue hover:text-blue-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Teacher Management</h1>
                <p className="text-xs md:text-sm text-gray-600">View and manage all teachers</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-methodist-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 text-sm md:text-base flex-1 md:flex-none justify-center"
              >
                <Upload className="w-4 h-4 md:w-5 md:h-5" />
                <span>Upload CSV</span>
              </button>
              <Link 
                href="/admin/teachers/add"
                className="bg-ghana-green text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 text-sm md:text-base flex-1 md:flex-none justify-center"
              >
                <Plus className="w-4 h-4 md:w-5 md:h-5" />
                <span>Add Teacher</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or teacher ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
            />
          </div>
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-ghana-green bg-opacity-10 p-3 rounded-full">
                    <GraduationCap className="w-6 h-6 text-ghana-green" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base md:text-lg text-gray-800">
                      {teacher.first_name} {teacher.middle_name ? teacher.middle_name + ' ' : ''}{teacher.last_name}
                    </h3>
                    <p className="text-xs md:text-sm text-gray-500">{teacher.teacher_id}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 text-[10px] md:text-xs font-semibold rounded-full ${
                  teacher.status === 'active' ? 'bg-green-100 text-green-800' : 
                  teacher.status === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {teacher.status === 'on_leave' ? 'On Leave' : 
                   teacher.status === 'transferred' ? 'Transferred' :
                   teacher.status.charAt(0).toUpperCase() + teacher.status.slice(1)}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-xs md:text-sm text-gray-600">
                  <span className="font-medium mr-2">Teacher ID:</span>
                  <span>{teacher.teacher_id || 'N/A'}</span>
                </div>
                <div className="flex items-center text-xs md:text-sm text-gray-600">
                  <span className="font-medium mr-2">Specialization:</span>
                  <span>{teacher.specialization || 'N/A'}</span>
                </div>
                <div className="flex items-center text-xs md:text-sm text-gray-600">
                  <span className="font-medium mr-2">Phone:</span>
                  <span>{teacher.phone || 'N/A'}</span>
                </div>
                {teacher.email && (
                  <div className="flex items-center text-xs md:text-sm text-gray-600">
                    <span className="font-medium mr-2">Email:</span>
                    <span className="truncate">{teacher.email}</span>
                  </div>
                )}
                {teacher.qualification && (
                  <div className="flex items-center text-xs md:text-sm text-gray-600">
                    <span className="font-medium mr-2">Qualification:</span>
                    <span>{teacher.qualification}</span>
                  </div>
                )}
              </div>

              <div className="flex space-x-2 pt-4 border-t">
                <Link 
                  href={`/admin/teachers/${teacher.teacher_id}`}
                  className="flex-1 px-3 py-2 bg-methodist-blue text-white rounded hover:bg-blue-700 flex items-center justify-center space-x-1"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </Link>
                <button 
                  onClick={() => setResetPasswordModal({ show: true, teacher })}
                  className="px-3 py-2 bg-yellow-100 text-yellow-600 rounded hover:bg-yellow-200"
                  title="Reset Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteTeacher(teacher.teacher_id)}
                  className="px-3 py-2 bg-red-100 text-red-600 rounded hover:bg-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredTeachers.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No teachers found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search' : 'Get started by adding your first teacher'}
            </p>
            <Link 
              href="/admin/teachers/add"
              className="inline-flex items-center px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Teacher
            </Link>
          </div>
        )}
      </main>

      {/* Reset Password Modal */}
      {resetPasswordModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-3 rounded-full">
                <KeyRound className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
            </div>
            {resetSuccess ? (
              <div className="text-center py-4">
                <div className="bg-green-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-600 font-semibold">Password reset successfully!</p>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-2">
                  Are you sure you want to reset the password for <span className="font-semibold">{resetPasswordModal.teacher?.first_name} {resetPasswordModal.teacher?.middle_name ? resetPasswordModal.teacher.middle_name + ' ' : ''}{resetPasswordModal.teacher?.last_name}</span>?
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Username:</span> {resetPasswordModal.teacher?.teacher_id}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <span className="font-semibold">New Password:</span> {resetPasswordModal.teacher?.teacher_id.padStart(8, '0')}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Username: teacher's ID | Password: teacher's ID padded to 8 characters
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setResetPasswordModal({ show: false, teacher: null })}
                    disabled={resetting}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    {resetting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
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

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" suppressHydrationWarning>
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Teachers CSV</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-3">
                Upload a CSV file with teacher information. Required columns: staff_id, first_name, last_name, email, phone, specialization, qualification, hire_date, password. The staff_id should follow the format TCH0001, TCH0002, etc.
              </p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Important:</strong> CSV upload creates auth accounts with 15-second delays between each teacher to avoid rate limits. 
                  For large batches (10+ teachers), use "Add Teacher" manually or upload in smaller batches.
                </p>
              </div>
              
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
