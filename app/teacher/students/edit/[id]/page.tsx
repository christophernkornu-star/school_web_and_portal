'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, UserCog, ShieldAlert, GraduationCap, Loader2 } from 'lucide-react'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center space-y-4">
       <Loader2 className="w-8 h-8 text-methodist-blue animate-spin" />
       <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Loading student record...</p>
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border-t-4 border-red-500">
         <div className="mx-auto bg-red-100 dark:bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mb-6">
           <ShieldAlert className="w-8 h-8 text-red-600 dark:text-red-400" />
         </div>
         <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Access Denied</h2>
         <p className="text-gray-600 dark:text-gray-400 mb-8">{error}</p>
         <button 
          onClick={() => router.back()} 
          className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition-all"
         >
           <ArrowLeft className="w-4 h-4" />
           <span>Go Back to Class List</span>
         </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors duration-200">
      {/* Modern Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30 shadow-sm transition-colors">
        <div className="container mx-auto max-w-5xl px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
                onClick={() => router.back()}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-all hover:scale-105"
                title="Go Back"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="hidden sm:block h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2"></div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-methodist-blue/10 dark:bg-methodist-blue/20 rounded-lg">
                <UserCog className="w-6 h-6 text-methodist-blue dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-gray-900 dark:text-white leading-none">
                  Edit Student Record
                </h1>
                <p className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  Update details for {student?.first_name} {student?.last_name}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="container mx-auto max-w-5xl px-4 md:px-6 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 md:p-8">
          {/* Information Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 mb-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl gap-4">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 px-2 py-1 bg-white dark:bg-gray-800 shadow-sm rounded text-xs font-bold tracking-wider text-methodist-blue uppercase">
                ID: {student?.student_id || student?.admission_number || student?.id?.substring(0, 8)?.toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Class Teacher Editing Mode
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Any changes made here will immediately reflect securely on the student's profile.
                </p>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <StudentForm
              initialData={student}
              classes={teacherClasses}
              isAdmin={false}
              onSubmit={handleUpdate}
              isSubmitting={saving}
              mode="edit"
            />
          </div>
        </div>
      </main>
    </div>
  )
}
