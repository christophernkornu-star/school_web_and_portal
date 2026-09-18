'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Trash2, 
  AlertCircle, 
  Palette, 
  Shuffle, 
  X, 
  Loader2, 
  GraduationCap, 
  ShieldCheck,
  User,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { StudentForm, StudentFormData } from '@/components/forms/StudentForm'
import { PortalFooter } from '@/components/PortalFooter'

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

    // Load active sections / houses
    const { data: sectionsData } = await supabase
      .from('sections')
      .select('id, name, colour, emblem_url')
      .eq('is_active', true)
      .order('sort_order')
    
    if (sectionsData) setSections(sectionsData)

    // Load student data with associated profile
    const { data: studentData, error } = await supabase
      .from('students')
      .select(`
        *,
        profiles:profile_id(email, username, full_name),
        classes:class_id(name)
      `)
      .eq('id', studentId)
      .single() as { data: any, error: any }

    if (error || !studentData) {
      toast.error('Student profile not found')
      setLoading(false)
      return
    }

    setStudent(studentData)

    // Load student's house / section
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
          first_name: formData.first_name.trim(),
          middle_name: formData.middle_name ? formData.middle_name.trim() : null,
          last_name: formData.last_name.trim(),
          date_of_birth: formData.date_of_birth,
          gender: formData.gender,
          class_id: formData.class_id,
          guardian_name: formData.guardian_name ? formData.guardian_name.trim() : null,
          guardian_phone: formData.guardian_phone ? formData.guardian_phone.trim() : null,
          guardian_email: formData.guardian_email ? formData.guardian_email.trim() : null,
          status: formData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)

      if (studentError) throw studentError

      toast.success('Student record updated successfully!')
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error updating student:', error)
      toast.error(error.message || 'Failed to update student profile')
    } finally {
      setSaving(false)
    }
  }

  async function handleReassignSection(sectionId: string) {
    setReassigning(true)
    try {
      const { error } = await supabase
        .from('student_sections')
        .upsert(
          { student_id: studentId, section_id: sectionId }, 
          { onConflict: 'student_id' }
        )

      if (error) throw error

      toast.success('House section updated successfully')
      const newSection = sections.find(s => s.id === sectionId)
      setStudentSection(newSection || null)
      setShowSectionModal(false)
    } catch (error: any) {
      toast.error(error.message || 'Failed to update house section')
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

      toast.success('Student record deleted successfully')
      router.push('/admin/students')
    } catch (error: any) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student. They might have active dependencies or records.')
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return <EditStudentSkeleton />
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Learner Profile Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested student record could not be found or has been removed.</p>
          <BackButton href="/admin/students" />
        </div>
      </div>
    )
  }

  const fullName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim()
  const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase() || 'ST'

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/students" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Edit Learner Profile
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Update student biodata, class placement, guardian details, and house allocation
                </p>
              </div>
            </div>

            {/* Desktop / Tablet Header Actions */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Learner</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-28 sm:pb-12">
        
        {/* Informational Guidance Callout */}
        <section className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Student Information &amp; Official Records
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Changes to a student&apos;s name or birthdate reflect immediately across terminal assessment broadsheets, cumulative record cards, and portal authentication credentials.
            </p>
          </div>
        </section>

        {/* Identity & House Allocation Dossier Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 font-black text-sm flex items-center justify-center shrink-0 shadow-2xs border border-[#003B5C]/15 dark:border-blue-500/30">
                {initials}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white truncate leading-tight">
                  {fullName}
                </h3>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                  <span>ID: {student.student_id}</span>
                  <span>•</span>
                  <span className="text-[#003B5C] dark:text-blue-400 font-bold font-sans">
                    {student.classes?.name || 'Unassigned Class'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-mono">
                {student.status || 'Active'}
              </span>

              {/* Mobile delete trigger */}
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="sm:hidden p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200/60 dark:border-rose-800 transition active:scale-95"
                aria-label="Delete Student"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* House / Section Allocation Strip */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
                <Palette className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                  Assigned House / Section
                </span>
                <div className="mt-1">
                  {studentSection ? (
                    <SectionBadge section={studentSection} size="lg" />
                  ) : (
                    <p className="text-xs text-slate-400 italic">Not assigned to any house cohort yet</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSectionModal(true)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#003B5C] dark:text-blue-300 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition active:scale-95 shadow-2xs cursor-pointer self-start sm:self-auto"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Change House</span>
            </button>
          </div>

        </section>

        {/* Primary Student Form Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] text-white flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Biodata &amp; Enrollment Specifics</span>
            </h2>
            <span className="text-[10px] sm:text-xs text-blue-200 font-mono hidden sm:inline">
              GES Standard Marks Profile
            </span>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            <StudentForm
              initialData={student}
              classes={classes}
              isAdmin={true}
              onSubmit={handleUpdate}
              isSubmitting={saving}
            />
          </div>
        </section>

      </main>

      {/* Delete Confirmation Modal (Bottom Sheet on Mobile, Centered Dialog on Tablet+) */}
      {showDeleteModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowDeleteModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto border border-slate-200/80 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Permanently Delete Learner?
                </h3>
                <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                  Irreversible Academic Record Action
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-slate-900 dark:text-white font-bold">{student?.first_name} {student?.last_name}</strong> (<span className="font-mono text-xs">{student?.student_id}</span>)? This will erase all attendance marks, assessment broadsheets, and portal credentials linked to this student.
            </p>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>Deleting Learner...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* House / Section Reassignment Modal */}
      {showSectionModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowSectionModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto border border-slate-200/80 dark:border-slate-700 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Reassign House / Section
                  </h3>
                  <p className="text-xs text-slate-400 truncate max-w-[220px]">
                    {student?.first_name} {student?.last_name}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowSectionModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Select New House Cohort
              </label>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {sections.map((sec: any) => {
                  const isCurrent = studentSection?.id === sec.id

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleReassignSection(sec.id)}
                      disabled={reassigning}
                      className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all border text-left cursor-pointer active:scale-[0.99] ${
                        isCurrent
                          ? 'bg-[#003B5C]/10 border-[#003B5C]/30 text-[#003B5C] dark:bg-blue-950/40 dark:border-blue-500/40 dark:text-blue-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-[#003B5C]/40 hover:bg-slate-50 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0 ring-2 ring-white dark:ring-slate-900"
                        style={{ backgroundColor: sec.colour }}
                      />
                      <span className="flex-1 truncate">{sec.name}</span>
                      {isCurrent && (
                        <span className="text-[10px] uppercase tracking-wider bg-[#003B5C] text-white dark:bg-blue-600 px-2 py-0.5 rounded-md font-black">
                          Current
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              {reassigning && (
                <p className="text-xs text-[#003B5C] dark:text-blue-400 flex items-center gap-2 mt-2 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating house allocation...</span>
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowSectionModal(false)}
                disabled={reassigning}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <PortalFooter />
    </div>
  )
}

function EditStudentSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-96 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}