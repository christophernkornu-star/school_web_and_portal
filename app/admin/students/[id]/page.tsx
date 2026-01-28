'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function EditStudentPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [classes, setClasses] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)

  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: 'Male',
    class_id: '',
    guardian_name: '',
    guardian_phone: '',
    guardian_email: '',
    status: 'active',
  })

  useEffect(() => {
    loadData()
  }, [studentId, router])

  async function loadData() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .order('level')

    if (classesData) setClasses(classesData)

    // Load student data
    const { data: studentData, error } = await supabase
      .from('students')
      .select(`
        *,
        profiles:profile_id(email, username, full_name)
      `)
      .eq('id', studentId)
      .single() as { data: any, error: any }

    if (error || !studentData) {
      toast.error('Student not found')
      setLoading(false)
      return
    }

    setStudent(studentData)
    setFormData({
      first_name: studentData.first_name,
      middle_name: studentData.middle_name || '',
      last_name: studentData.last_name,
      date_of_birth: studentData.date_of_birth,
      gender: studentData.gender,
      class_id: studentData.class_id,
      guardian_name: studentData.guardian_name,
      guardian_phone: studentData.guardian_phone,
      guardian_email: studentData.guardian_email || '',
      status: studentData.status,
    })

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Update student record
      const { error: studentError } = await supabase
        .from('students')
        .update({
          first_name: formData.first_name,
          middle_name: formData.middle_name || null,
          last_name: formData.last_name,
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          class_id: formData.class_id,
          guardian_name: formData.guardian_name,
          guardian_phone: formData.guardian_phone,
          guardian_email: formData.guardian_email || null,
          status: formData.status,
        })
        .eq('id', studentId)

      if (studentError) throw studentError

      // Update profile name
      if (student?.profile_id) {
        await supabase
          .from('profiles')
          .update({
            full_name: `${formData.first_name} ${formData.middle_name ? formData.middle_name + ' ' : ''}${formData.last_name}`
          })
          .eq('id', student.profile_id)
      }

      toast.success('Student updated successfully!')
      setTimeout(() => router.push('/admin/students'), 1500)
    } catch (error: any) {
      console.error('Error updating student:', error)
      toast.error(error.message || 'Failed to update student')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId }),
      })

      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to delete student')

      toast.success('Student deleted successfully')
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error deleting student:', error)
      toast.error(error.message || 'Failed to delete student')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
           <Skeleton className="h-48 w-full mb-6 rounded-lg" />
           <Skeleton className="h-96 w-full rounded-lg" />
        </main>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Student Not Found</h2>
          <Link href="/admin/students" className="text-methodist-blue hover:underline">
            ← Back to Students
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <BackButton href="/admin/students" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Edit Student</h1>
                <p className="text-xs md:text-sm text-gray-600">
                  {student.student_id} - {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <Trash2 className="w-5 h-5" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Account Info */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 lg:col-span-1">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-methodist-blue" />
              Account Information
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-xs md:text-sm">
              <div>
                <span className="text-gray-600">Student ID:</span>
                <p className="font-medium">{student.student_id}</p>
              </div>
              <div>
                <span className="text-gray-600">Username:</span>
                <p className="font-medium">{student.profiles?.username}</p>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <p className="font-medium break-all">{student.profiles?.email}</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 lg:col-span-2">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Middle Name</label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Gender *</label>
                <select
                  required
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>
          </div>

          {/* Academic Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 lg:col-span-2">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Academic Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Class *</label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.category})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="graduated">Graduated</option>
                  <option value="transferred">Transferred</option>
                </select>
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="bg-white rounded-lg shadow p-6 mb-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Guardian Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name *</label>
                <input
                  type="text"
                  required
                  value={formData.guardian_name}
                  onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Phone *</label>
                <input
                  type="tel"
                  required
                  value={formData.guardian_phone}
                  onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Email</label>
                <input
                  type="email"
                  value={formData.guardian_email}
                  onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 lg:col-span-3">
            <Link
              href="/admin/students"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-methodist-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Delete Student</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete <strong>{student.first_name} {student.last_name}</strong> ({student.student_id})?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">
                  ⚠️ This will permanently delete the student's account and all associated data including scores, attendance records, and more. This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Delete Student'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
