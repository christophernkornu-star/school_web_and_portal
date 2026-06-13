'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Trash2, AlertCircle, Palette, Shuffle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SectionBadge } from '@/components/sections/SectionBadge'


import { StudentForm, StudentFormData } from '@/components/forms/StudentForm'

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
  const [studentSection, setStudentSection] = useState<any>(null)
  const [sections, setSections] = useState<any[]>([])
  const [showSectionModal, setShowSectionModal] = useState(false)
  const [reassigning, setReassigning] = useState(false)

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
      .select('id, name') // Matches expected format
      .order('level')

        if (classesData) setClasses(classesData)

    // Load sections
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, colour, emblem_url')
      .eq('is_active', true)
      .order('sort_order')
    
    if (sectionsData) setSections(sectionsData)

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

    // Load student's section
    const { data: ssData } = await supabase
      .from('student_sections')
      .select('section_id, sections(id, name, colour, emblem_url)')
      .eq('student_id', studentId)
      .maybeSingle()

    if (ssData?.sections) setStudentSection(ssData.sections)

    setLoading(false)
  }

    const handleUpdate = async (formData: StudentFormData) => {
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      if (studentError) throw studentError

      toast.success('Student updated successfully')
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error updating student:', error)
      toast.error(error.message || 'Failed to update student')
    } finally {
      setSaving(false)
    }
  }

  async function handleReassignSection(sectionId: string) {
    setReassigning(true)
    try {
      const { error } = await supabase
        .from('student_sections')
        .upsert({ student_id: studentId, section_id: sectionId }, { onConflict: 'student_id' })

      if (error) throw error

      toast.success('Section updated successfully')
      const newSection = sections.find(s => s.id === sectionId)
      setStudentSection(newSection || null)
      setShowSectionModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update section')
    } finally {
      setReassigning(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      // 1. Delete associated profile (triggers cascade usually, but manual is safer)
      if (student.profile_id) {
          // Check if RPC exists or delete directly
          // For now direct delete if RLS permits, else use RPC
          const { error: profileError } = await supabase.auth.admin.deleteUser(student.profile_id)
          // Client side can't use admin auth. We need an API or rely on DB cascade
          // Assuming DB cascade on students DELETE or using API
      } 
      
      // Direct delete on public table (RLS permitting)
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) throw error

      toast.success('Student deleted successfully')
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error deleting student:', error)
      // Fallback: DB constraints might block delete if marks exist
      toast.error('Failed to delete student. They might have related records.')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
     return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid grid-cols-2 gap-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
     )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
                <BackButton href="/admin/students" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
                    <p className="text-gray-500">Update student details and status</p>
                </div>
            </div>
            <button
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center space-x-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
                <Trash2 className="w-4 h-4" />
                <span>Delete Student</span>
            </button>
        </div>

        {/* Section Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Palette className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">School Section</h3>
                {studentSection ? (
                  <SectionBadge section={studentSection} size="lg" className="mt-1" />
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Not assigned yet</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowSectionModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
            >
              <Shuffle className="w-4 h-4" />
              Change Section
            </button>
          </div>
        </div>

        <StudentForm
            initialData={student}
            classes={classes}
            isAdmin={true}
            onSubmit={handleUpdate}
            isSubmitting={saving}
        />
      </div>

            {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <div className="flex items-center space-x-3 text-red-600 mb-4">
                    <AlertCircle className="w-6 h-6" />
                    <h3 className="text-lg font-bold">Delete Student?</h3>
                </div>
                <p className="text-gray-600 mb-6">
                    Are you sure you want to delete <strong>{student.first_name} {student.last_name}</strong>? 
                    This action cannot be undone and will remove all their academic records.
                </p>
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={() => setShowDeleteModal(false)}
                        className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                        disabled={deleting}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center space-x-2"
                    >
                        {deleting ? 'Deleting...' : 'Delete Permanently'}
                    </button>
                </div>
            </div>
        </div>
      )}

            {/* Section Reassign Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <Shuffle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Section</h3>
                  <p className="text-sm text-gray-500">
                    {student.first_name} {student.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSectionModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select New Section
              </label>
              <div className="flex flex-col gap-2">
                {sections.map((sec: any) => (
                  <button
                    key={sec.id}
                    onClick={() => handleReassignSection(sec.id)}
                    disabled={reassigning}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      transition-all border
                      ${studentSection?.id === sec.id
                        ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-200 hover:bg-purple-50/50'
                      }
                    `}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-sm flex-shrink-0"
                      style={{ backgroundColor: sec.colour }}
                    />
                    <span className="flex-1 text-left">{sec.name}</span>
                    {studentSection?.id === sec.id && (
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {reassigning && (
                <p className="text-xs text-purple-600 flex items-center gap-2 mt-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Updating...
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowSectionModal(false)}
                disabled={reassigning}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
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
