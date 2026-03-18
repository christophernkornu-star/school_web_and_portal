'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { toast } from 'react-hot-toast'

import { StudentForm, StudentFormData } from '@/components/forms/StudentForm'

export default function EditStudentPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const studentId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teacherClasses, setTeacherClasses] = useState<any[]>([])
  const [student, setStudent] = useState<any>(null)

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

        setStudent(student)
        setLoading(false)

      } catch (err: any) {
        console.error('Error loading data:', err)
        setError('Failed to load data')
        setLoading(false)
      }
    }

    loadData()
  }, [router, studentId])

  const handleUpdate = async (formData: StudentFormData) => {
    setSaving(true)

    try {
      const { error: updateError } = await supabase
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
          guardian_email: formData.guardian_email || null
        })
        .eq('id', studentId)

      if (updateError) throw updateError

      toast.success('Student updated successfully')
      router.push('/teacher/students') // Redirect to student list
    } catch (err: any) {
      console.error('Error updating student:', err)
      toast.error(err.message || 'Failed to update student')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white p-6 rounded-lg shadow-sm border max-w-md w-full">
         <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
         <p className="text-gray-600 mb-4">{error}</p>
         <button onClick={() => router.back()} className="text-blue-600 underline">Go Back</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-3">
            <button 
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Go Back"
            >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Edit Student</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Update student details</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <StudentForm
            initialData={student}
            classes={teacherClasses}
            isAdmin={false}
            onSubmit={handleUpdate}
            isSubmitting={saving}
        />
      </main>
    </div>
  )
}
