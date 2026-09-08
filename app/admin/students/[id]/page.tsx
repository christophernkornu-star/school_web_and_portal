'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, User, Trash2, AlertCircle, Palette, Shuffle, X, Loader2 } from 'lucide-react'
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
      .select('id, name')
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
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentId)

      if (error) throw error

      toast.success('Student deleted successfully')
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student. They might have associated records.')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48 sm:w-64 rounded-xl" />
            <Skeleton className="h-10 w-28 sm:w-36 rounded-xl" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-2xl sm:rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 font-sans text-gray-900 dark:text-gray-100">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        
        {/* Responsive Header Banner */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <BackButton href="/admin/students" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
            <div>
              <h1 className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white">
                Edit Student Profile
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                {student?.first_name} {student?.last_name} ({student?.student_id})
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:hover:bg-rose-900/40 rounded-xl text-xs sm:text-sm font-bold border border-rose-200/60 dark:border-rose-800 transition-all active:scale-95 self-start sm:self-auto"
          >
            <Trash2 className="w-4 h-4 shrink-0" />
            <span>Delete Student</span>
          </button>
        </div>

        {/* Section Info Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 sm:p-3 bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-300 rounded-xl sm:rounded-2xl shrink-0">
                <Palette className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-400">
                  School Section / House
                </h3>
                <div className="mt-1">
                  {studentSection ? (
                    <SectionBadge section={studentSection} size="lg" />
                  ) : (
                    <p className="text-xs sm:text-sm text-gray-400 italic">Not assigned to any house yet</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSectionModal(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/10 dark:bg-[#003B5C]/20 border border-[#003B5C]/20 dark:border-blue-800 rounded-xl hover:bg-[#003B5C]/20 dark:hover:bg-[#003B5C]/30 transition-all active:scale-95 shadow-sm"
            >
              <Shuffle className="w-4 h-4 shrink-0" />
              <span>Change Section</span>
            </button>
          </div>
        </div>

        {/* Student Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-gray-700 p-4 sm:p-6 lg:p-8 shadow-sm">
          <StudentForm
            initialData={student}
            classes={classes}
            isAdmin={true}
            onSubmit={handleUpdate}
            isSubmitting={saving}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal (Bottom Sheet on Mobile, Centered on Tablet+) */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-rose-600 mb-3.5">
              <div className="p-2.5 bg-rose-50 dark:bg-rose-900/30 rounded-xl shrink-0">
                <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Delete Student?</h3>
                <p className="text-xs text-rose-500 font-bold uppercase tracking-wider">Permanent Action</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to delete <strong className="text-gray-900 dark:text-white">{student?.first_name} {student?.last_name}</strong>? 
              This action cannot be undone and will delete all associated attendance, assessment marks, and student history.
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Reassign Modal (Bottom Sheet on Mobile, Centered on Tablet+) */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col overflow-y-auto">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#003B5C]/10 dark:bg-[#003B5C]/30 rounded-xl shrink-0 text-[#003B5C] dark:text-blue-300">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">Change Section</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[220px]">
                    {student?.first_name} {student?.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSectionModal(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-400 tracking-wider">
                Select New Section
              </label>
              
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {sections.map((sec: any) => (
                  <button
                    key={sec.id}
                    onClick={() => handleReassignSection(sec.id)}
                    disabled={reassigning}
                    className={`
                      w-full flex items-center gap-3 px-3.5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold
                      transition-all border text-left
                      ${studentSection?.id === sec.id
                        ? 'bg-[#003B5C]/10 border-[#003B5C]/30 text-[#003B5C] dark:bg-[#003B5C]/30 dark:border-blue-700 dark:text-blue-200'
                        : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:border-[#003B5C]/40 hover:bg-gray-50 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    <span
                      className="w-4 h-4 rounded-full shadow-sm shrink-0"
                      style={{ backgroundColor: sec.colour }}
                    />
                    <span className="flex-1 truncate">{sec.name}</span>
                    {studentSection?.id === sec.id && (
                      <span className="text-[10px] uppercase tracking-wider bg-[#003B5C] text-white px-2 py-0.5 rounded-full font-black">
                        Current
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {reassigning && (
                <p className="text-xs text-[#003B5C] dark:text-blue-400 flex items-center gap-2 mt-2 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating assignment...
                </p>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowSectionModal(false)}
                disabled={reassigning}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
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