'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'

export default function EditStudentPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<any[]>([])
  const [formData, setFormData] = useState({
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
  const [accountInfo, setAccountInfo] = useState({
    username: '',
    email: '',
    student_id: ''
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

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

        // Get teacher's assigned classes (only classes where they are class teacher)
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        const classTeacherClasses = classAccess.filter(c => c.is_class_teacher)
        setTeacherClasses(classTeacherClasses)

        // Load student data
        const { data: student, error: studentError } = (await supabase
          .from('students')
          .select(`
            *,
            profiles:profile_id (
              username,
              email
            )
          `)
          .eq('id', studentId)
          .single()) as { data: any; error: any }

        if (studentError || !student) {
          setError('Student not found')
          setLoading(false)
          return
        }

        // Check if teacher is CLASS TEACHER for this student's class
        const classTeacherAccess = classAccess.find((c: any) => c.class_id === student.class_id && c.is_class_teacher)
        if (!classTeacherAccess) {
          setError('You do not have permission to edit this student. Only the class teacher can edit student details.')
          setLoading(false)
          return
        }

        setFormData({
          first_name: student.first_name || '',
          middle_name: student.middle_name || '',
          last_name: student.last_name || '',
          date_of_birth: student.date_of_birth || '',
          gender: student.gender || '',
          class_id: student.class_id || '',
          guardian_name: student.guardian_name || '',
          guardian_phone: student.guardian_phone || '',
          guardian_email: student.guardian_email || ''
        })

        if (student.profiles) {
          setAccountInfo({
            username: student.profiles.username || '',
            email: student.profiles.email || '',
            student_id: student.student_id || ''
          })
        } else {
          setAccountInfo({
            username: '',
            email: '',
            student_id: student.student_id || ''
          })
        }

        setLoading(false)
      } catch (err: any) {
        console.error('Error loading data:', err)
        setError('Failed to load student data')
        setLoading(false)
      }
    }

    loadData()
  }, [router, studentId])

  function validateForm(): boolean {
    const errors: Record<string, string> = {}

    if (!formData.first_name.trim()) errors.first_name = 'First name is required'
    if (!formData.last_name.trim()) errors.last_name = 'Last name is required'
    if (!formData.date_of_birth) errors.date_of_birth = 'Date of birth is required'
    if (!formData.gender) errors.gender = 'Gender is required'
    if (!formData.class_id) errors.class_id = 'Class is required'
    if (!formData.guardian_name.trim()) errors.guardian_name = 'Guardian name is required'
    if (!formData.guardian_phone.trim()) errors.guardian_phone = 'Guardian phone is required'

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name.trim() || null,
          last_name: formData.last_name.trim(),
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          class_id: formData.class_id,
          guardian_name: formData.guardian_name.trim(),
          guardian_phone: formData.guardian_phone.trim(),
          guardian_email: formData.guardian_email.trim() || null
        })
        .eq('id', studentId)

      if (error) throw error

      router.push('/teacher/students')
    } catch (err: any) {
      console.error('Error updating student:', err)
      alert('Failed to update student: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading student data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center transition-colors">
        <div className="max-w-md mx-auto text-center bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 transition-colors">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <Link
            href="/teacher/students"
            className="inline-block bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            Back to Students
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow transition-colors">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/teacher/students" className="text-ghana-green hover:text-green-700 dark:hover:text-green-400">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Edit Student</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update student information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6 transition-colors">
            {/* Account Information */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Account Information</h3>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Student ID
                  </label>
                  <input
                    type="text"
                    value={accountInfo.student_id}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={accountInfo.username}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Student Email
                  </label>
                  <input
                    type="text"
                    value={accountInfo.email || 'N/A'}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.first_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.first_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({...formData, middle_name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.last_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.last_name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.last_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.date_of_birth ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.date_of_birth && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.date_of_birth}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.gender ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {formErrors.gender && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.gender}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class *
                </label>
                <select
                  value={formData.class_id}
                  onChange={(e) => setFormData({...formData, class_id: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.class_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
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
                  <p className="text-red-500 text-xs mt-1">{formErrors.class_id}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guardian Name *
                </label>
                <input
                  type="text"
                  value={formData.guardian_name}
                  onChange={(e) => setFormData({...formData, guardian_name: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.guardian_name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.guardian_name && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.guardian_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guardian Phone *
                </label>
                <input
                  type="tel"
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData({...formData, guardian_phone: e.target.value})}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formErrors.guardian_phone ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {formErrors.guardian_phone && (
                  <p className="text-red-500 text-xs mt-1">{formErrors.guardian_phone}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guardian Email
                </label>
                <input
                  type="email"
                  value={formData.guardian_email}
                  onChange={(e) => setFormData({...formData, guardian_email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-4">
              <Link
                href="/teacher/students"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
