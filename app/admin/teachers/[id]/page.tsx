'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Save, 
  Trash2, 
  KeyRound, 
  Plus, 
  X, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Award, 
  Briefcase, 
  GraduationCap, 
  BookOpen, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ChevronDown,
  Layers,
  Sparkles,
  Info
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

export default function EditTeacherPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const teacherId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [teacher, setTeacher] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [assignedClasses, setAssignedClasses] = useState<string[]>([])
  const [classTeacherFor, setClassTeacherFor] = useState<string[]>([])
  const [assignedSubjects, setAssignedSubjects] = useState<Array<{subject_id: string, class_id: string, can_edit?: boolean}>>([])
  const [teachingModels, setTeachingModels] = useState<Record<string, string>>({})
  const [upperPrimaryModel, setUpperPrimaryModel] = useState<string>('class_teacher')
  
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    phone: '',
    specialization: '',
    qualification: '',
    hire_date: '',
    status: 'active',
    gender: '',
    username: '',
    email: '',
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)

  useEffect(() => {
    loadData()
  }, [teacherId])

  async function loadData() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    // Load teacher data
    const { data: teacherData } = (await supabase
      .from('teachers')
      .select(`
        *,
        profiles:profile_id(username, email)
      `)
      .eq('teacher_id', teacherId)
      .single()) as { data: any }

    if (teacherData) {
      setTeacher(teacherData)
      setFormData({
        first_name: teacherData.first_name || '',
        middle_name: teacherData.middle_name || '',
        last_name: teacherData.last_name || '',
        phone: teacherData.phone || '',
        specialization: teacherData.specialization || '',
        qualification: teacherData.qualification || '',
        hire_date: teacherData.hire_date || '',
        status: teacherData.status || 'active',
        gender: teacherData.gender || '',
        username: teacherData.profiles?.username || '',
        email: teacherData.profiles?.email || '',
      })
    }

    // Load teaching model setting
    const { data: settingData } = (await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'upper_primary_teaching_model')
      .maybeSingle()) as { data: any }
    
    if (settingData) {
      setUpperPrimaryModel(settingData.setting_value)
    }

    // Load all classes
    const { data: classesData } = (await supabase
      .from('classes')
      .select('*')
      .order('level')) as { data: any[] | null }
    
    const models: Record<string, string> = {}

    if (classesData) {
      setClasses(classesData)
      
      classesData.forEach((cls: any) => {
        if (cls.level === 'kindergarten' || ['KG 1', 'KG 2'].includes(cls.level)) {
          models[cls.id] = 'class_teacher'
        } else if (cls.level === 'lower_primary' || ['Basic 1', 'Basic 2', 'Basic 3'].includes(cls.level)) {
          models[cls.id] = 'class_teacher'
        } else if (cls.level === 'upper_primary' || ['Basic 4', 'Basic 5', 'Basic 6'].includes(cls.level)) {
          models[cls.id] = settingData?.setting_value || 'class_teacher'
        } else if (cls.level === 'jhs' || ['JHS 1', 'JHS 2', 'JHS 3'].includes(cls.level)) {
          models[cls.id] = 'subject_teacher'
        } else {
          models[cls.id] = 'class_teacher'
        }
      })
      setTeachingModels(models)
    }

    // Load subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    if (subjectsData) setSubjects(subjectsData)

    // Load assigned classes
    if (teacherData) {
      const { data: classAssignments } = (await supabase
        .from('teacher_class_assignments')
        .select('class_id, is_class_teacher')
        .eq('teacher_id', teacherData.id)) as { data: any[] | null }
      
      if (classAssignments) {
        setAssignedClasses(classAssignments.map((a: any) => a.class_id))
        const ctIds = classAssignments
          .filter((a: any) => a.is_class_teacher)
          .map((a: any) => a.class_id)
        setClassTeacherFor(ctIds)
      }

      // Load assigned subjects
      const { data: subjectAssignments } = (await supabase
        .from('teacher_subject_assignments')
        .select('subject_id, class_id, can_edit')
        .eq('teacher_id', teacherData.id)) as { data: any[] | null }
      
      if (subjectAssignments) {
        setAssignedSubjects(subjectAssignments)
      }
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const user = await getCurrentUser()

      // 1. Update teacher profile via secure API handler
      const response = await fetch('/api/admin/update-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          profileId: teacher.profile_id,
          requesterId: user?.id,
          firstName: formData.first_name.trim(),
          middleName: formData.middle_name.trim(),
          lastName: formData.last_name.trim(),
          phone: formData.phone.trim(),
          specialization: formData.specialization.trim(),
          qualification: formData.qualification.trim(),
          hireDate: formData.hire_date,
          status: formData.status,
          username: formData.username.trim(),
          email: formData.email.trim(),
          gender: formData.gender || null
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update teacher profile')
      }

      // 2. Validate Class Teacher Limits (Max 2 teachers per class)
      if (classTeacherFor.length > 0) {
        const { data: existingClassTeachers, error: checkError } = (await supabase
          .from('teacher_class_assignments')
          .select(`
            class_id, 
            teacher_id,
            teachers!inner (
              status
            )
          `)
          .in('class_id', classTeacherFor)
          .eq('is_class_teacher', true)
          .neq('teacher_id', teacher.id)) as { data: any[] | null; error: any }

        if (checkError) throw checkError

        const activeTeachers = existingClassTeachers?.filter((ct: any) => {
          const status = ct.teachers?.status?.toLowerCase()
          return status !== 'on_leave' && status !== 'on leave' && status !== 'inactive' && status !== 'transferred'
        }) || []

        const classCounts: Record<string, number> = {}
        activeTeachers.forEach((ct: any) => {
          classCounts[ct.class_id] = (classCounts[ct.class_id] || 0) + 1
        })

        const overLimit = Object.entries(classCounts).filter(([_, count]) => count >= 2)
        if (overLimit.length > 0) {
          const conflictNames = overLimit.map(([classId, count]) => {
            const className = classes.find((c: any) => c.id === classId)?.name || 'Unknown'
            return `${className} (${count} teachers already assigned)`
          })
          throw new Error(`Cannot assign as class teacher. The following classes already have 2 class teachers assigned: ${conflictNames.join(', ')}. Maximum 2 teachers per class.`)
        }

        // Revoke from inactive/on-leave teachers if a slot needs clearing
        const revokableConflicts = existingClassTeachers?.filter((ct: any) => {
          const status = ct.teachers?.status?.toLowerCase()
          return status === 'on_leave' || status === 'on leave' || status === 'inactive' || status === 'transferred'
        }) || []

        if (revokableConflicts.length > 0) {
          for (const conflict of revokableConflicts) {
            await supabase
              .from('teacher_class_assignments')
              .update({ is_class_teacher: false })
              .eq('class_id', conflict.class_id)
              .eq('teacher_id', conflict.teacher_id)
          }
        }
      }

      // 3. Validate Total Teacher Allocations per class
      if (assignedClasses.length > 0) {
        const uniqueClasses = Array.from(new Set(assignedClasses))
        for (const classId of uniqueClasses) {
          const { count: existingCount, error: countError } = (await supabase
            .from('teacher_class_assignments')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', classId)
            .neq('teacher_id', teacher.id)) as { count: number | null; error: any }

          if (countError) throw countError

          const totalCount = (existingCount || 0) + 1
          if (totalCount > 2) {
            const className = classes.find((c: any) => c.id === classId)?.name || 'Unknown'
            throw new Error(`Cannot assign more than 2 teachers to ${className}. This class already has ${existingCount} teacher(s) allocated.`)
          }
        }
      }

      // 4. Update Class Assignments
      const { error: deleteClassError } = await supabase
        .from('teacher_class_assignments')
        .delete()
        .eq('teacher_id', teacher.id)
      if (deleteClassError && deleteClassError.code !== 'PGRST116') throw deleteClassError

      if (assignedClasses.length > 0) {
        const uniqueClasses = Array.from(new Set(assignedClasses))
        const classInserts = uniqueClasses.map(class_id => ({
          teacher_id: teacher.id,
          class_id,
          is_class_teacher: classTeacherFor.includes(class_id),
          is_primary: classTeacherFor.includes(class_id),
        }))
        
        if (classInserts.length > 0) {
          const { error: insertError } = await supabase
            .from('teacher_class_assignments')
            .upsert(classInserts, { 
              onConflict: 'teacher_id, class_id',
              ignoreDuplicates: false 
            })
          if (insertError) throw insertError
        }
      }

      // 5. Update Subject Assignments
      const { error: deleteSubjError } = await supabase
        .from('teacher_subject_assignments')
        .delete()
        .eq('teacher_id', teacher.id)
      if (deleteSubjError && deleteSubjError.code !== 'PGRST116') throw deleteSubjError

      const finalSubjectAssignments = new Map<string, any>()

      // Add manual assignments
      if (assignedSubjects.length > 0) {
        assignedSubjects.forEach(assignment => {
          if (!assignment.class_id || !assignment.subject_id) return
          const key = `${assignment.class_id}-${assignment.subject_id}`
          finalSubjectAssignments.set(key, {
            teacher_id: teacher.id,
            subject_id: assignment.subject_id,
            class_id: assignment.class_id,
            can_edit: assignment.can_edit !== false,
          })
        })
      }

      // Auto-assign subjects for Class Teacher model
      const uniqueAssignedClasses = Array.from(new Set(assignedClasses))
      
      for (const class_id of uniqueAssignedClasses) {
        const model = teachingModels[class_id]
        const classInfo = classes.find(c => c.id === class_id)
        const isKG = classInfo && (classInfo.level === 'kindergarten' || ['KG 1', 'KG 2'].includes(classInfo.level))
        
        if (isKG || (model === 'class_teacher' && classTeacherFor.includes(class_id))) {
          if (classInfo) {
            const relevantSubjects = subjects.filter(subject => {
              if (subject.level) return subject.level === classInfo.level
              return true
            })

            relevantSubjects.forEach(subject => {
              const key = `${class_id}-${subject.id}`
              if (!finalSubjectAssignments.has(key)) {
                finalSubjectAssignments.set(key, {
                  teacher_id: teacher.id,
                  subject_id: subject.id,
                  class_id: class_id,
                  can_edit: true,
                })
              }
            })
          }
        }
      }

      if (finalSubjectAssignments.size > 0) {
        const { error: subjError } = await supabase
          .from('teacher_subject_assignments')
          .upsert(Array.from(finalSubjectAssignments.values()), { 
            onConflict: 'teacher_id, class_id, subject_id',
            ignoreDuplicates: false 
          })
        if (subjError) throw subjError
      }

      toast.success('Teacher record and allocations updated successfully!')
      router.push('/admin/teachers')
    } catch (error: any) {
      console.error('Error updating teacher:', error)
      toast.error('Failed to update teacher: ' + (error.message || 'Please try again'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordReset() {
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match!')
      return
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    setResettingPassword(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          password_reset_required: true,
        })
        .eq('id', teacher.profile_id)

      if (error) throw error

      toast.success('Password reset flagged. Staff member will be prompted to change credentials on next sign-in.')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error('Failed to reset password: ' + error.message)
    } finally {
      setResettingPassword(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to permanently delete this teacher account? This will cascade and delete portal credentials.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('teacher_id', teacherId)

      if (error) throw error

      toast.success('Teacher deleted successfully')
      router.push('/admin/teachers')
    } catch (error: any) {
      toast.error('Failed to delete teacher: ' + error.message)
    } finally {
      setDeleting(false)
    }
  }

  function toggleClassAssignment(classId: string) {
    const isAssigned = assignedClasses.includes(classId)
    const model = teachingModels[classId]
    
    if (isAssigned) {
      setAssignedClasses(prev => prev.filter(id => id !== classId))
      setClassTeacherFor(prev => prev.filter(id => id !== classId))
      setAssignedSubjects(prev => prev.filter(s => s.class_id !== classId))
    } else {
      setAssignedClasses(prev => [...prev, classId])
      if (model === 'class_teacher') {
        setClassTeacherFor(prev => [...prev, classId])
      }
    }
  }

  function addSubjectAssignment() {
    setAssignedSubjects(prev => [...prev, { subject_id: '', class_id: '', can_edit: true }])
  }

  function removeSubjectAssignment(index: number) {
    setAssignedSubjects(prev => prev.filter((_, i) => i !== index))
  }

  function updateSubjectAssignment(index: number, field: 'subject_id' | 'class_id' | 'can_edit', value: string | boolean) {
    setAssignedSubjects(prev =>
      prev.map((assignment, i) =>
        i === index ? { ...assignment, [field]: value } : assignment
      )
    )
  }

  const subjectTeacherClassesAssigned = useMemo(() => {
    return assignedClasses.filter(classId => teachingModels[classId] === 'subject_teacher')
  }, [assignedClasses, teachingModels])

  if (loading) {
    return <EditTeacherSkeleton />
  }

  if (!teacher) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex items-center justify-center p-4 font-sans">
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full text-center border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Teacher Record Not Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">The requested staff record does not exist or has been removed.</p>
          <BackButton href="/admin/teachers" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/teachers" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Edit Teacher Profile
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Update faculty details, classroom assignments, and curriculum permissions
                </p>
              </div>
            </div>

            {/* Tablet & Desktop Header Actions */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50"
                title="Delete Faculty Account"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Delete</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving || deleting}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Form Workspace */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-28 sm:pb-12">
        
        {/* Informational Guidance Callout */}
        <section className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Staff Allocations &amp; Permissions Standard
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Assigned classes determine classroom roll call attendance rights. Team teaching supports up to <strong>2 teachers per class</strong>. For classes designated under the Class Teacher Model, all subjects are automatically mapped.
            </p>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          
          {/* Section 1: Personal Profile */}
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  1. Personal &amp; Institutional Profile
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">ID: {teacher.teacher_id}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4.5">
              
              {/* First Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>

              {/* Middle Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Middle Name <span className="text-slate-400 font-normal text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.middle_name}
                  onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Last Name */}
              <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Last Name (Surname) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Gender <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full appearance-none px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Contact Telephone
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Staff Employment Status <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full appearance-none px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                  >
                    <option value="active">Active Duty</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Official Leave</option>
                    <option value="transferred">Transferred Out</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Hire Date */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Appointment Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={formData.hire_date}
                    onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>

              {/* Specialization */}
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Specialization
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    placeholder="e.g. Mathematics & Science"
                    className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>

              {/* Qualification */}
              <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Highest Qualification
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={formData.qualification}
                    onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                    placeholder="e.g. B.Ed Mathematics"
                    className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>

            </div>
          </section>

          {/* Section 2: Account Credentials */}
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  2. Portal Login Credentials
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Reset Password</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Staff Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Official Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Classroom Allocations */}
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  3. Assigned Classes &amp; Cohort Roles
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">{assignedClasses.length} Allocated</span>
            </div>

            <div className="space-y-5">
              
              {/* Kindergarten Tier */}
              {classes.filter(c => c.level === 'kindergarten' || ['KG 1', 'KG 2'].includes(c.level)).length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#003B5C] dark:text-blue-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Kindergarten (KG 1 – 2)</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/50">
                      Class Teacher Model
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {classes.filter(c => c.level === 'kindergarten' || ['KG 1', 'KG 2'].includes(c.level)).map(cls => {
                      const isChecked = assignedClasses.includes(cls.id)

                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer active:scale-[0.99] select-none ${
                            isChecked
                              ? 'border-[#003B5C] bg-[#003B5C]/5 dark:border-blue-400 dark:bg-blue-950/20'
                              : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{cls.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleClassAssignment(cls.id)}
                            className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Lower Primary Tier */}
              {classes.filter(c => c.level === 'lower_primary' || ['Basic 1', 'Basic 2', 'Basic 3'].includes(c.level)).length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#003B5C] dark:text-blue-300 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Lower Primary (Basic 1 – 3)</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/50">
                      Class Teacher Model
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {classes.filter(c => c.level === 'lower_primary' || ['Basic 1', 'Basic 2', 'Basic 3'].includes(c.level)).map(cls => {
                      const isChecked = assignedClasses.includes(cls.id)

                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center justify-between p-3 rounded-xl border transition cursor-pointer active:scale-[0.99] select-none ${
                            isChecked
                              ? 'border-[#003B5C] bg-[#003B5C]/5 dark:border-blue-400 dark:bg-blue-950/20'
                              : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40'
                          }`}
                        >
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{cls.name}</span>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleClassAssignment(cls.id)}
                            className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Upper Primary Tier */}
              {classes.filter(c => c.level === 'upper_primary' || ['Basic 4', 'Basic 5', 'Basic 6'].includes(c.level)).length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#003B5C] dark:text-blue-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-500" />
                      <span>Upper Primary (Basic 4 – 6)</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50">
                      {upperPrimaryModel === 'class_teacher' ? 'Class Teacher Model' : 'Subject Teacher Model'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {classes.filter(c => c.level === 'upper_primary' || ['Basic 4', 'Basic 5', 'Basic 6'].includes(c.level)).map(cls => {
                      const isAssigned = assignedClasses.includes(cls.id)
                      const isClassTeacher = classTeacherFor.includes(cls.id)

                      return (
                        <div
                          key={cls.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2.5 transition ${
                            isAssigned
                              ? 'border-[#003B5C]/50 bg-blue-50/40 dark:border-blue-500/40 dark:bg-blue-950/20'
                              : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleClassAssignment(cls.id)}
                              className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{cls.name}</span>
                          </label>

                          {upperPrimaryModel === 'subject_teacher' && isAssigned && (
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[11px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer self-start sm:self-auto select-none">
                              <input
                                type="checkbox"
                                checked={isClassTeacher}
                                onChange={() => {
                                  if (isClassTeacher) {
                                    setClassTeacherFor(prev => prev.filter(id => id !== cls.id))
                                  } else {
                                    setClassTeacherFor(prev => [...prev, cls.id])
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                              />
                              <span>Designated Class Teacher</span>
                            </label>
                          )}

                          {upperPrimaryModel === 'class_teacher' && isAssigned && (
                            <span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">
                              ✓ All subjects mapped automatically
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* JHS Tier */}
              {classes.filter(c => c.level === 'jhs' || ['JHS 1', 'JHS 2', 'JHS 3'].includes(c.level)).length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#003B5C] dark:text-blue-300 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-purple-500" />
                      <span>Junior High School (JHS 1 – 3)</span>
                    </h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/50">
                      Subject Specialist Model
                    </span>
                  </div>

                  <div className="space-y-2">
                    {classes.filter(c => c.level === 'jhs' || ['JHS 1', 'JHS 2', 'JHS 3'].includes(c.level)).map(cls => {
                      const isAssigned = assignedClasses.includes(cls.id)
                      const isClassTeacher = classTeacherFor.includes(cls.id)

                      return (
                        <div
                          key={cls.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border gap-2.5 transition ${
                            isAssigned
                              ? 'border-[#003B5C]/50 bg-blue-50/40 dark:border-blue-500/40 dark:bg-blue-950/20'
                              : 'border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40'
                          }`}
                        >
                          <label className="flex items-center gap-2.5 cursor-pointer select-none min-w-0">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => toggleClassAssignment(cls.id)}
                              className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{cls.name}</span>
                          </label>

                          {isAssigned && (
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-[11px] font-bold text-amber-800 dark:text-amber-300 cursor-pointer self-start sm:self-auto select-none">
                              <input
                                type="checkbox"
                                checked={isClassTeacher}
                                onChange={() => {
                                  if (isClassTeacher) {
                                    setClassTeacherFor(prev => prev.filter(id => id !== cls.id))
                                  } else {
                                    setClassTeacherFor(prev => [...prev, cls.id])
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                              />
                              <span>Designated Class Teacher</span>
                            </label>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* Section 4: Subject Allocations */}
          {subjectTeacherClassesAssigned.length > 0 && (
            <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                    <span>4. Departmental Subject Allocations</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Restricted to Subject Teacher model cohorts</p>
                </div>

                <button
                  type="button"
                  onClick={addSubjectAssignment}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition active:scale-95 self-start sm:self-auto shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Assign Subject</span>
                </button>
              </div>

              <div className="space-y-3">
                {assignedSubjects.map((assignment, index) => {
                  const assignedClass = classes.find(c => c.id === assignment.class_id)
                  
                  return (
                    <div 
                      key={index}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80"
                    >
                      {/* Class Dropdown */}
                      <div className="relative flex-1">
                        <select
                          value={assignment.class_id}
                          onChange={(e) => updateSubjectAssignment(index, 'class_id', e.target.value)}
                          className="w-full appearance-none px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] pr-8 cursor-pointer"
                        >
                          <option value="">Select Cohort...</option>
                          {subjectTeacherClassesAssigned.map(classId => {
                            const cls = classes.find(c => c.id === classId)
                            return cls ? <option key={cls.id} value={cls.id}>{cls.name}</option> : null
                          })}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Subject Dropdown */}
                      <div className="relative flex-1">
                        <select
                          value={assignment.subject_id}
                          onChange={(e) => updateSubjectAssignment(index, 'subject_id', e.target.value)}
                          disabled={!assignment.class_id}
                          className="w-full appearance-none px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] pr-8 disabled:opacity-50 cursor-pointer"
                        >
                          <option value="">Select Curriculum Subject...</option>
                          {subjects
                            .filter(sub => {
                              if (!assignedClass?.level) return true
                              if (sub.level) return sub.level === assignedClass.level
                              return true
                            })
                            .map(sub => (
                              <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Can Edit Switch */}
                      <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={assignment.can_edit !== false}
                          onChange={(e) => updateSubjectAssignment(index, 'can_edit', e.target.checked)}
                          className="w-3.5 h-3.5 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 cursor-pointer"
                        />
                        <span>Score Edits</span>
                      </label>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeSubjectAssignment(index)}
                        className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition border border-rose-200/60 dark:border-rose-900/40 shrink-0 flex items-center justify-center"
                        title="Remove allocation"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}

                {assignedSubjects.length === 0 && (
                  <div className="p-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                    No individual subject specializations assigned. Click &quot;Assign Subject&quot; above to allocate courses.
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Action Row for Tablet/Desktop */}
          <div className="hidden sm:flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/teachers"
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || deleting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Committing Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Save Teacher Record</span>
                </>
              )}
            </button>
          </div>

        </form>
      </main>

      {/* Floating Sticky Mobile Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting || saving}
            className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 disabled:opacity-50 shrink-0"
            aria-label="Delete Teacher"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <Link
            href="/admin/teachers"
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold text-center truncate"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || deleting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer truncate"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Password Reset Modal (Bottom Sheet on Mobile, Centered Dialog on Tablet+) */}
      {showPasswordModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowPasswordModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 max-h-[92vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Reset Faculty Password
                  </h3>
                  <p className="text-xs text-slate-400">
                    Staff user: <code className="font-mono text-slate-600 dark:text-slate-300 font-bold">{formData.username}</code>
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                Notice: The staff member will be required to change their credentials upon next authentication.
              </div>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={resettingPassword}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50"
              >
                {resettingPassword ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Set Reset Flag</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <PortalFooter />
    </div>
  )
}

function EditTeacherSkeleton() {
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
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-56 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}