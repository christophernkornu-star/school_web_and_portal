'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Upload, Users, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess, isTeacherAssignedToClass } from '@/lib/teacher-permissions'

interface TeacherClass {
  class_id: string
  class_name: string
  level: string
}

export default function AddStudentPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<TeacherClass[]>([])
  const [activeTab, setActiveTab] = useState<'manual' | 'csv'>('manual')
  const [teacher, setTeacher] = useState<any>(null)

  // Manual form state
  const [manualFormData, setManualFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    class_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // CSV upload state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<{
    success: number
    failed: number
    errors: string[]
  } | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setError(null)
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          setError('Teacher profile not found. Please contact an administrator.')
          setLoading(false)
          return
        }

        setTeacher(teacherData)

        // Load teacher's assigned classes (only classes where they are class teacher)
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        const classTeacherClasses = classAccess.filter(c => c.is_class_teacher)
        
        if (classTeacherClasses.length === 0) {
          setError('You are not a class teacher for any classes. Only class teachers can add students. Please contact an administrator.')
          setLoading(false)
          return
        }

        setTeacherClasses(classTeacherClasses.map(c => ({
          class_id: c.class_id,
          class_name: c.class_name,
          level: c.level
        })))

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError(err.message || 'Failed to load data. Please try again.')
        setLoading(false)
      }
    }

    loadData()
  }, [router])

  function validateManualForm(): boolean {
    const errors: Record<string, string> = {}

    if (!manualFormData.first_name.trim()) {
      errors.first_name = 'First name is required'
    }
    if (!manualFormData.last_name.trim()) {
      errors.last_name = 'Last name is required'
    }
    if (!manualFormData.date_of_birth) {
      errors.date_of_birth = 'Date of birth is required'
    } else {
      const dob = new Date(manualFormData.date_of_birth)
      const today = new Date()
      if (dob > today) {
        errors.date_of_birth = 'Date of birth cannot be in the future'
      }
      const age = today.getFullYear() - dob.getFullYear()
      if (age < 3 || age > 25) {
        errors.date_of_birth = 'Student age must be between 3 and 25 years'
      }
    }
    if (!manualFormData.gender) {
      errors.gender = 'Gender is required'
    }
    if (!manualFormData.class_id) {
      errors.class_id = 'Class is required'
    }
    if (!manualFormData.guardian_name.trim()) {
      errors.guardian_name = 'Guardian name is required'
    }
    if (!manualFormData.guardian_phone.trim()) {
      errors.guardian_phone = 'Guardian phone is required'
    } else if (!/^[\d\s\-+()]+$/.test(manualFormData.guardian_phone)) {
      errors.guardian_phone = 'Please enter a valid phone number'
    }
    if (manualFormData.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualFormData.guardian_email)) {
      errors.guardian_email = 'Please enter a valid email address'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!teacher) return

    // Validate form
    if (!validateManualForm()) {
      return
    }

    setSubmitting(true)
    setSubmitSuccess(false)

    try {
      // Verify teacher is assigned to selected class
      const isAssigned = await isTeacherAssignedToClass(teacher.id, manualFormData.class_id)
      if (!isAssigned) {
        setFormErrors({ class_id: 'You are not assigned to this class' })
        setSubmitting(false)
        return
      }

      // Use API route for manual add to handle profile creation
      const response = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: [{
            first_name: manualFormData.first_name.trim(),
            middle_name: manualFormData.middle_name.trim() || null,
            last_name: manualFormData.last_name.trim(),
            date_of_birth: manualFormData.date_of_birth,
            gender: manualFormData.gender,
            guardian_name: manualFormData.guardian_name.trim(),
            guardian_phone: manualFormData.guardian_phone.trim(),
            guardian_email: manualFormData.guardian_email.trim() || null
          }],
          classId: manualFormData.class_id
        })
      })

      const result = await response.json()
      
      if (!response.ok || result.failed > 0) {
        throw new Error(result.errors?.[0] || result.error || 'Failed to add student')
      }

      // Show success message
      setSubmitSuccess(true)
      
      // Reset form
      setManualFormData({
        first_name: '',
        middle_name: '',
        last_name: '',
        date_of_birth: '',
        gender: '',
        class_id: '',
        guardian_name: '',
        guardian_phone: '',
        guardian_email: ''
      })
      setFormErrors({})

      // Hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000)
    } catch (error: any) {
      console.error('Error adding student:', error)
      setFormErrors({ submit: error.message || 'Failed to add student. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCsvUpload() {
    if (!csvFile || !selectedClassId || !teacher) {
      setFormErrors({ csv: 'Please select a class and CSV file' })
      return
    }

    // Validate file type
    if (!csvFile.name.endsWith('.csv')) {
      setFormErrors({ csv: 'Please upload a CSV file (.csv)' })
      return
    }

    // Validate file size (max 5MB)
    if (csvFile.size > 5 * 1024 * 1024) {
      setFormErrors({ csv: 'File size must be less than 5MB' })
      return
    }

    setUploading(true)
    setUploadResults(null)
    setFormErrors({})

    try {
      // Verify teacher is assigned to selected class
      const isAssigned = await isTeacherAssignedToClass(teacher.id, selectedClassId)
      if (!isAssigned) {
        setFormErrors({ csv: 'You are not assigned to this class' })
        setUploading(false)
        return
      }
    } catch (error: any) {
      console.error('Error checking class assignment:', error)
      setFormErrors({ csv: 'Failed to verify class assignment. Please try again.' })
      setUploading(false)
      return
    }

    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setFormErrors({ csv: 'CSV file must contain at least a header row and one data row' })
        setUploading(false)
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      
      // Validate required headers
      const requiredHeaders = ['first_name', 'last_name', 'date_of_birth', 'gender', 'guardian_name', 'guardian_phone']
      const missingHeaders = requiredHeaders.filter(h => 
        !headers.some(header => 
          header === h || 
          (h === 'first_name' && header === 'firstname') ||
          (h === 'last_name' && header === 'lastname') ||
          (h === 'date_of_birth' && header === 'dob') ||
          (h === 'guardian_phone' && header === 'phone')
        )
      )
      
      if (missingHeaders.length > 0) {
        setFormErrors({ csv: `Missing required headers: ${missingHeaders.join(', ')}` })
        setUploading(false)
        return
      }

      // Parse all students from CSV
      const studentsData = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        
        const student: any = {}
        
        headers.forEach((header, index) => {
          const value = values[index]
          switch (header) {
            case 'first_name':
            case 'firstname':
              student.first_name = value
              break
            case 'last_name':
            case 'lastname':
              student.last_name = value
              break
            case 'date_of_birth':
            case 'dob':
              student.date_of_birth = value
              break
            case 'gender':
              student.gender = value.toLowerCase()
              break
            case 'guardian_name':
              student.guardian_name = value
              break
            case 'guardian_phone':
            case 'phone':
              student.guardian_phone = value
              break
            case 'guardian_email':
            case 'email':
              student.guardian_email = value || null
              break
          }
        })

        if (student.first_name && student.last_name) {
          studentsData.push(student)
        }
      }

      // Send to API for bulk upload with admin privileges
      const response = await fetch('/api/students/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: studentsData,
          classId: selectedClassId
        })
      })

      const results = await response.json()

      if (!response.ok) {
        setFormErrors({ csv: results.error || 'Upload failed' })
        setUploading(false)
        return
      }

      setUploadResults(results)
      
      if (results.success > 0) {
        setCsvFile(null)
        setSelectedClassId('')
        // Show success message and redirect after 2 seconds
        setTimeout(() => {
          router.push('/teacher/students')
        }, 2000)
      }
    } catch (error: any) {
      console.error('Error processing CSV:', error)
      setFormErrors({ csv: error.message || 'Failed to process CSV file. Please try again.' })
      setUploadResults(null)
    } finally {
      setUploading(false)
    }
  }

  function downloadTemplate() {
    const template = `first_name,last_name,date_of_birth,gender,guardian_name,guardian_phone,guardian_email
John,Doe,2010-05-15,male,Jane Doe,0241234567,jane@email.com
Mary,Smith,2016-03-20,female,Bob Smith,0207654321,bob@example.com`
    
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'student_upload_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your assigned classes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="flex items-center space-x-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-xl font-semibold">Error Loading Page</h2>
          </div>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-ghana-green text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Try Again
            </button>
            <Link
              href="/teacher/dashboard"
              className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 transition text-center"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (teacherClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/students" className="text-ghana-green hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-800">Add Student</h1>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Users className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Classes Assigned</h2>
            <p className="text-gray-600">You are not assigned to any classes. Please contact the admin.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/teacher/students" className="text-ghana-green hover:text-green-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Add Students</h1>
              <p className="text-sm text-gray-600">Add students to your assigned classes</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Tab Navigation */}
          <div className="bg-white rounded-t-lg shadow border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Manually</span>
              </button>
              <button
                onClick={() => setActiveTab('csv')}
                className={`flex-1 flex items-center justify-center space-x-2 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'csv'
                    ? 'text-ghana-green border-b-2 border-ghana-green'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Upload CSV</span>
              </button>
            </div>
          </div>

          {/* Manual Form */}
          {activeTab === 'manual' && (
            <div className="bg-white rounded-b-lg shadow p-6">
              {/* Success Message */}
              {submitSuccess && (
                <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-medium">Student added successfully!</p>
                    <p className="text-green-700 text-sm mt-1">You can add another student or view the students list.</p>
                  </div>
                </div>
              )}

              {/* Form Error */}
              {formErrors.submit && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                  <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-800">{formErrors.submit}</p>
                </div>
              )}

              <form onSubmit={handleManualSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Personal Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={manualFormData.first_name}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, first_name: e.target.value})
                          if (formErrors.first_name) {
                            setFormErrors({...formErrors, first_name: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.first_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.first_name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={manualFormData.middle_name}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, middle_name: e.target.value})
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                        placeholder="Optional"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={manualFormData.last_name}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, last_name: e.target.value})
                          if (formErrors.last_name) {
                            setFormErrors({...formErrors, last_name: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.last_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.last_name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={manualFormData.date_of_birth}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, date_of_birth: e.target.value})
                          if (formErrors.date_of_birth) {
                            setFormErrors({...formErrors, date_of_birth: ''})
                          }
                        }}
                        max={new Date().toISOString().split('T')[0]}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.date_of_birth ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.date_of_birth && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.date_of_birth}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <select
                        value={manualFormData.gender}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, gender: e.target.value})
                          if (formErrors.gender) {
                            setFormErrors({...formErrors, gender: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.gender ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                      {formErrors.gender && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.gender}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Class Assignment */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Class Assignment</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class *
                    </label>
                    <select
                      value={manualFormData.class_id}
                      onChange={(e) => {
                        setManualFormData({...manualFormData, class_id: e.target.value})
                        if (formErrors.class_id) {
                          setFormErrors({...formErrors, class_id: ''})
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                        formErrors.class_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Class</option>
                      {teacherClasses.map(cls => (
                        <option key={cls.class_id} value={cls.class_id}>
                          {cls.class_name}
                        </option>
                      ))}
                    </select>
                    {formErrors.class_id && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.class_id}</p>
                    )}
                  </div>
                </div>

                {/* Guardian Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Guardian Information</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guardian Name *
                      </label>
                      <input
                        type="text"
                        value={manualFormData.guardian_name}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, guardian_name: e.target.value})
                          if (formErrors.guardian_name) {
                            setFormErrors({...formErrors, guardian_name: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.guardian_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.guardian_name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.guardian_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guardian Phone *
                      </label>
                      <input
                        type="tel"
                        value={manualFormData.guardian_phone}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, guardian_phone: e.target.value})
                          if (formErrors.guardian_phone) {
                            setFormErrors({...formErrors, guardian_phone: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.guardian_phone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="0201234567"
                      />
                      {formErrors.guardian_phone && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.guardian_phone}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guardian Email
                      </label>
                      <input
                        type="email"
                        value={manualFormData.guardian_email}
                        onChange={(e) => {
                          setManualFormData({...manualFormData, guardian_email: e.target.value})
                          if (formErrors.guardian_email) {
                            setFormErrors({...formErrors, guardian_email: ''})
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent ${
                          formErrors.guardian_email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="guardian@example.com"
                      />
                      {formErrors.guardian_email && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.guardian_email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <Link
                    href="/teacher/students"
                    className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <UserPlus className="w-5 h-5" />
                    <span>{submitting ? 'Adding...' : 'Add Student'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* CSV Upload */}
          {activeTab === 'csv' && (
            <div className="bg-white rounded-b-lg shadow p-6">
              <div className="space-y-6">
                {/* CSV Error */}
                {formErrors.csv && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-800">{formErrors.csv}</p>
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <span>CSV Upload Instructions</span>
                  </h3>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside ml-7">
                    <li>Download the template file to see the required format</li>
                    <li>Required columns: first_name, last_name, date_of_birth, gender, guardian_name, guardian_phone</li>
                    <li>Optional columns: guardian_email</li>
                    <li>Gender should be "male" or "female"</li>
                    <li>Date format: YYYY-MM-DD (e.g., 2015-05-15)</li>
                    <li>Maximum file size: 5MB</li>
                  </ul>
                </div>

                {/* Download Template */}
                <div>
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-ghana-green rounded-lg hover:bg-gray-200 transition"
                  >
                    <Download className="w-5 h-5" />
                    <span className="font-medium">Download CSV Template</span>
                  </button>
                </div>

                {/* Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Class *
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => {
                      setSelectedClassId(e.target.value)
                      if (formErrors.csv) {
                        setFormErrors({...formErrors, csv: ''})
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                    disabled={uploading}
                  >
                    <option value="">Select Class</option>
                    {teacherClasses.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV File *
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      setCsvFile(e.target.files?.[0] || null)
                      if (formErrors.csv) {
                        setFormErrors({...formErrors, csv: ''})
                      }
                      setUploadResults(null)
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent"
                    disabled={uploading}
                  />
                  {csvFile && (
                    <p className="text-sm text-gray-600 mt-2 flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span>Selected: {csvFile.name} ({(csvFile.size / 1024).toFixed(1)} KB)</span>
                    </p>
                  )}
                </div>

                {/* Upload Results */}
                {uploadResults && (
                  <div className={`border rounded-lg p-4 ${
                    uploadResults.failed === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <div className="flex items-start space-x-3 mb-3">
                      {uploadResults.failed === 0 ? (
                        <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">Upload Results</h3>
                        <div className="space-y-1 text-sm">
                          <p className="text-green-700 flex items-center space-x-2">
                            <CheckCircle className="w-4 h-4" />
                            <span>Successfully added: <strong>{uploadResults.success}</strong> student{uploadResults.success !== 1 ? 's' : ''}</span>
                          </p>
                          {uploadResults.failed > 0 && (
                            <>
                              <p className="text-red-700 flex items-center space-x-2">
                                <XCircle className="w-4 h-4" />
                                <span>Failed: <strong>{uploadResults.failed}</strong> student{uploadResults.failed !== 1 ? 's' : ''}</span>
                              </p>
                              {uploadResults.errors.length > 0 && (
                                <div className="mt-3 bg-white border border-gray-200 rounded p-3">
                                  <p className="font-medium text-gray-800 mb-2">Error Details:</p>
                                  <ul className="space-y-1 text-gray-700 text-xs max-h-48 overflow-y-auto">
                                    {uploadResults.errors.slice(0, 20).map((error, i) => (
                                      <li key={i} className="flex items-start space-x-2">
                                        <span className="text-red-500 flex-shrink-0">•</span>
                                        <span>{error}</span>
                                      </li>
                                    ))}
                                    {uploadResults.errors.length > 20 && (
                                      <li className="text-gray-500 italic">
                                        ... and {uploadResults.errors.length - 20} more errors
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {uploadResults.success > 0 && (
                      <Link
                        href="/teacher/students"
                        className="inline-flex items-center space-x-2 text-ghana-green hover:text-green-700 font-medium text-sm"
                      >
                        <Users className="w-4 h-4" />
                        <span>View Students List</span>
                      </Link>
                    )}
                  </div>
                )}

                {/* Upload Progress */}
                {uploading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-ghana-green"></div>
                      <div>
                        <p className="font-medium text-gray-800">Processing CSV file...</p>
                        <p className="text-sm text-gray-600">This may take a moment depending on the file size</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-end space-x-4">
                  <Link
                    href="/teacher/students"
                    className={`px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition ${
                      uploading ? 'pointer-events-none opacity-50' : ''
                    }`}
                  >
                    Cancel
                  </Link>
                  <button
                    type="button"
                    onClick={handleCsvUpload}
                    disabled={!csvFile || !selectedClassId || uploading}
                    className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Upload Students</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
