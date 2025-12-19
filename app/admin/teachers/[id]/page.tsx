'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, Key, Plus, X } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function EditTeacherPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const teacherId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [teacher, setTeacher] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [assignedClasses, setAssignedClasses] = useState<string[]>([])
  const [classTeacherFor, setClassTeacherFor] = useState<string[]>([]) // Classes where this teacher is class teacher
  const [assignedSubjects, setAssignedSubjects] = useState<Array<{subject_id: string, class_id: string, can_edit?: boolean}>>([])
  const [teachingModels, setTeachingModels] = useState<Record<string, string>>({}) // class_id -> teaching_model
  const [upperPrimaryModel, setUpperPrimaryModel] = useState<string>('class_teacher')
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    specialization: '',
    qualification: '',
    hire_date: '',
    status: 'active',
    username: '',
    email: '',
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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
        last_name: teacherData.last_name || '',
        phone: teacherData.phone || '',
        specialization: teacherData.specialization || '',
        qualification: teacherData.qualification || '',
        hire_date: teacherData.hire_date || '',
        status: teacherData.status || 'active',
        username: teacherData.profiles?.username || '',
        email: teacherData.profiles?.email || '',
      })
    }

    // Load teaching model configuration
    const { data: settingData } = (await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'upper_primary_teaching_model')
      .single()) as { data: any }
    
    if (settingData) {
      setUpperPrimaryModel(settingData.setting_value)
    }

    // Load all classes
    const { data: classesData } = (await supabase
      .from('classes')
      .select('*')
      .order('level')) as { data: any[] | null }
    
    if (classesData) {
      setClasses(classesData)
      
      // Determine teaching model for each class
      const models: Record<string, string> = {}
      classesData.forEach((cls: any) => {
        if (['KG 1', 'KG 2'].includes(cls.level)) {
          models[cls.id] = 'class_teacher'
        } else if (['Basic 1', 'Basic 2', 'Basic 3'].includes(cls.level)) {
          models[cls.id] = 'class_teacher'
        } else if (['Basic 4', 'Basic 5', 'Basic 6'].includes(cls.level)) {
          models[cls.id] = settingData?.setting_value || 'class_teacher'
        } else if (['JHS 1', 'JHS 2', 'JHS 3'].includes(cls.level)) {
          models[cls.id] = 'subject_teacher'
        } else {
          models[cls.id] = 'class_teacher'
        }
      })
      setTeachingModels(models)
    }

    // Load all subjects
    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .order('name')
    if (subjectsData) setSubjects(subjectsData)

    // Load assigned classes (use teacher UUID id from teacherData)
    if (teacherData) {
      const { data: classAssignments } = (await supabase
        .from('teacher_class_assignments')
        .select('class_id, is_class_teacher')
        .eq('teacher_id', teacherData.id)) as { data: any[] | null }
      
      if (classAssignments) {
        setAssignedClasses(classAssignments.map((a: any) => a.class_id))
        setClassTeacherFor(classAssignments.filter((a: any) => a.is_class_teacher).map((a: any) => a.class_id))
      }

      // Load assigned subjects (use teacher UUID id from teacherData)
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
      // Get current user for auth check
      const user = await getCurrentUser()

      // Call API to update teacher and profile (bypassing RLS for profile update)
      const response = await fetch('/api/admin/update-teacher', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teacherId,
          profileId: teacher.profile_id,
          requesterId: user?.id,
          firstName: formData.first_name,
          lastName: formData.last_name,
          phone: formData.phone,
          specialization: formData.specialization,
          qualification: formData.qualification,
          hireDate: formData.hire_date,
          status: formData.status,
          username: formData.username,
          email: formData.email,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update teacher')
      }

      // Validate: Check if any class already has a class teacher (excluding current teacher)
      if (classTeacherFor.length > 0) {
        const { data: existingClassTeachers, error: checkError } = (await supabase
          .from('teacher_class_assignments')
          .select('class_id, teacher_id')
          .in('class_id', classTeacherFor)
          .eq('is_class_teacher', true)
          .neq('teacher_id', teacher.id)) as { data: any[] | null; error: any }

        if (checkError) throw checkError

        if (existingClassTeachers && existingClassTeachers.length > 0) {
          const conflictClasses = existingClassTeachers.map((ct: any) => {
            const className = classes.find((c: any) => c.id === ct.class_id)?.name || 'Unknown'
            return className
          })
          throw new Error(`Cannot assign as class teacher. The following classes already have a class teacher: ${conflictClasses.join(', ')}. Please remove the existing class teacher first.`)
        }
      }

      // Update class assignments (use teacher UUID id, not teacher_id string)
      await supabase
        .from('teacher_class_assignments')
        .delete()
        .eq('teacher_id', teacher.id)

      if (assignedClasses.length > 0) {
        const classInserts = assignedClasses.map(class_id => ({
          teacher_id: teacher.id,
          class_id,
          is_class_teacher: classTeacherFor.includes(class_id),
          is_primary: classTeacherFor.includes(class_id), // First class teacher assignment is primary
        }))
        await supabase.from('teacher_class_assignments').insert(classInserts)
      }

      // Update subject assignments (use teacher UUID id, not teacher_id string)
      await supabase
        .from('teacher_subject_assignments')
        .delete()
        .eq('teacher_id', teacher.id)

      if (assignedSubjects.length > 0) {
        const subjectInserts = assignedSubjects.map(assignment => ({
          teacher_id: teacher.id,
          subject_id: assignment.subject_id,
          class_id: assignment.class_id,
          can_edit: assignment.can_edit !== false, // Default true
        }))
        await supabase.from('teacher_subject_assignments').insert(subjectInserts)
      }

      // Auto-assign all subjects for class teacher model
      for (const class_id of assignedClasses) {
        const model = teachingModels[class_id]
        if (model === 'class_teacher' && classTeacherFor.includes(class_id)) {
          // Get all subjects for this class level
          const classInfo = classes.find(c => c.id === class_id)
          if (classInfo) {
            // For class teachers, they teach all subjects
            const allSubjectInserts = subjects.map(subject => ({
              teacher_id: teacher.id,
              subject_id: subject.id,
              class_id: class_id,
              can_edit: true,
            }))
            await supabase.from('teacher_subject_assignments').insert(allSubjectInserts)
          }
        }
      }

      alert('Teacher updated successfully!')
      router.push('/admin/teachers')
    } catch (error: any) {
      console.error('Error updating teacher:', error)
      alert('Failed to update teacher: ' + (error.message || 'Please try again'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordReset() {
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!')
      return
    }

    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long')
      return
    }

    try {
      // Note: This requires admin privileges - you may need to use Supabase Admin API
      // For now, we'll just mark that password reset is required
      const { error } = await supabase
        .from('profiles')
        .update({
          password_reset_required: true,
        })
        .eq('id', teacher.profile_id)

      if (error) throw error

      alert('Password reset request created. The teacher will be prompted to change their password on next login.')
      setShowPasswordModal(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      alert('Failed to reset password: ' + error.message)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone.')) {
      return
    }

    try {
      // Delete teacher (cascade will handle assignments)
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('teacher_id', teacherId)

      if (error) throw error

      alert('Teacher deleted successfully')
      router.push('/admin/teachers')
    } catch (error: any) {
      alert('Failed to delete teacher: ' + error.message)
    }
  }

  function toggleClassAssignment(classId: string) {
    setAssignedClasses(prev =>
      prev.includes(classId)
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    )
  }

  function addSubjectAssignment() {
    setAssignedSubjects(prev => [...prev, { subject_id: '', class_id: '' }])
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-methodist-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teacher details...</p>
        </div>
      </div>
    )
  }

  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Teacher not found</p>
          <Link href="/admin/teachers" className="text-methodist-blue hover:underline mt-4 inline-block">
            Back to Teachers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <Link href="/admin/teachers" className="text-ghana-green hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Edit Teacher</h1>
                <p className="text-xs md:text-sm text-gray-600">
                  {teacher.staff_id} - {teacher.first_name} {teacher.last_name}
                </p>
              </div>
            </div>
            <button
              onClick={handleDelete}
              className="w-full md:w-auto justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Teacher</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Personal Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Hire Date *</label>
                <input
                  type="date"
                  required
                  value={formData.hire_date}
                  onChange={(e) => setFormData({...formData, hire_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                <input
                  type="text"
                  value={formData.specialization}
                  onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qualification</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({...formData, qualification: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">Login Credentials</h2>
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="px-4 py-2 bg-methodist-gold text-white rounded-lg hover:bg-yellow-600 flex items-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>Reset Password</span>
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
            </div>
          </div>

          {/* Class Assignments */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Assigned Classes</h2>
            <div className="space-y-4">
              {/* Kindergarten */}
              {classes.filter(c => c.level === 'kindergarten').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-pink-700 mb-2 flex items-center">
                    Kindergarten (KG 1-2)
                    <span className="ml-2 px-2 py-0.5 bg-pink-100 text-pink-700 text-xs rounded">Class Teacher Model</span>
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">One teacher teaches all subjects. Automatically assigned all subjects when selected.</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {classes.filter(c => c.level === 'kindergarten').map(cls => (
                      <label
                        key={cls.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-pink-50"
                      >
                        <input
                          type="checkbox"
                          checked={assignedClasses.includes(cls.id)}
                          onChange={() => {
                            toggleClassAssignment(cls.id)
                            if (!assignedClasses.includes(cls.id)) {
                              setClassTeacherFor([...classTeacherFor, cls.id])
                            } else {
                              setClassTeacherFor(classTeacherFor.filter(id => id !== cls.id))
                            }
                          }}
                          className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                        />
                        <span className="text-gray-700">{cls.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Lower Primary */}
              {classes.filter(c => c.level === 'lower_primary').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
                    Lower Primary (Basic 1-3)
                    <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">Class Teacher Model</span>
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">One teacher teaches all subjects. Automatically assigned all subjects when selected.</p>
                  <div className="grid md:grid-cols-3 gap-4">
                    {classes.filter(c => c.level === 'lower_primary').map(cls => (
                      <label
                        key={cls.id}
                        className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-blue-50"
                      >
                        <input
                          type="checkbox"
                          checked={assignedClasses.includes(cls.id)}
                          onChange={() => {
                            toggleClassAssignment(cls.id)
                            if (!assignedClasses.includes(cls.id)) {
                              setClassTeacherFor([...classTeacherFor, cls.id])
                            } else {
                              setClassTeacherFor(classTeacherFor.filter(id => id !== cls.id))
                            }
                          }}
                          className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                        />
                        <span className="text-gray-700">{cls.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Upper Primary */}
              {classes.filter(c => c.level === 'upper_primary').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                    Upper Primary (Basic 4-6)
                    <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      {upperPrimaryModel === 'class_teacher' ? 'Class Teacher Model' : 'Subject Teacher Model'}
                    </span>
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">
                    {upperPrimaryModel === 'class_teacher' 
                      ? 'One teacher teaches all subjects. Automatically assigned all subjects when selected.'
                      : 'Multiple teachers teach specific subjects. Check "Class Teacher" for the main teacher.'}
                  </p>
                  <div className="space-y-3">
                    {classes.filter(c => c.level === 'upper_primary').map(cls => (
                      <div key={cls.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={assignedClasses.includes(cls.id)}
                            onChange={() => toggleClassAssignment(cls.id)}
                            className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                          />
                          <span className="text-gray-700 font-medium">{cls.name}</span>
                        </label>
                        {upperPrimaryModel === 'subject_teacher' && assignedClasses.includes(cls.id) && (
                          <label className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={classTeacherFor.includes(cls.id)}
                              onChange={() => {
                                if (classTeacherFor.includes(cls.id)) {
                                  setClassTeacherFor(classTeacherFor.filter(id => id !== cls.id))
                                } else {
                                  setClassTeacherFor([...classTeacherFor, cls.id])
                                }
                              }}
                              className="w-4 h-4 text-methodist-gold rounded"
                            />
                            <span className="text-xs font-medium text-gray-700">Class Teacher</span>
                          </label>
                        )}
                        {upperPrimaryModel === 'class_teacher' && assignedClasses.includes(cls.id) && (
                          <span className="text-xs text-blue-600">✓ All subjects auto-assigned</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JHS */}
              {classes.filter(c => c.level === 'jhs').length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-purple-700 mb-2 flex items-center">
                    Junior High School (JHS 1-3)
                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">Subject Teacher Model</span>
                  </h3>
                  <p className="text-xs text-gray-600 mb-3">Multiple teachers teach specific subjects. Check "Class Teacher" for the main teacher.</p>
                  <div className="space-y-3">
                    {classes.filter(c => c.level === 'jhs').map(cls => (
                      <div key={cls.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                        <label className="flex items-center space-x-3 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={assignedClasses.includes(cls.id)}
                            onChange={() => toggleClassAssignment(cls.id)}
                            className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                          />
                          <span className="text-gray-700 font-medium">{cls.name}</span>
                        </label>
                        {assignedClasses.includes(cls.id) && (
                          <label className="flex items-center space-x-2 px-3 py-1 bg-yellow-50 border border-yellow-200 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={classTeacherFor.includes(cls.id)}
                              onChange={() => {
                                if (classTeacherFor.includes(cls.id)) {
                                  setClassTeacherFor(classTeacherFor.filter(id => id !== cls.id))
                                } else {
                                  setClassTeacherFor([...classTeacherFor, cls.id])
                                }
                              }}
                              className="w-4 h-4 text-methodist-gold rounded"
                            />
                            <span className="text-xs font-medium text-gray-700">Class Teacher</span>
                          </label>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subject Assignments - Only for Subject Teacher Model */}
          {assignedClasses.some(classId => teachingModels[classId] === 'subject_teacher') && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Subject Assignments</h2>
                  <p className="text-sm text-gray-600">For subject teacher model classes only</p>
                </div>
                <button
                  type="button"
                  onClick={addSubjectAssignment}
                  className="px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Subject</span>
                </button>
              </div>
              <div className="space-y-4">
                {assignedSubjects.map((assignment, index) => {
                  const assignedClass = classes.find(c => c.id === assignment.class_id)
                  const isSubjectTeacherClass = assignedClass && teachingModels[assignedClass.id] === 'subject_teacher'
                  
                  return (
                    <div key={index} className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 p-4 border rounded-lg md:border-0 md:p-0 bg-gray-50 md:bg-transparent">
                      <select
                        value={assignment.class_id}
                        onChange={(e) => updateSubjectAssignment(index, 'class_id', e.target.value)}
                        className="w-full md:flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                      >
                        <option value="">Select Class</option>
                        {assignedClasses
                          .filter(classId => teachingModels[classId] === 'subject_teacher')
                          .map(classId => {
                            const cls = classes.find(c => c.id === classId)
                            return cls ? <option key={cls.id} value={cls.id}>{cls.name}</option> : null
                          })}
                      </select>
                      <select
                        value={assignment.subject_id}
                        onChange={(e) => updateSubjectAssignment(index, 'subject_id', e.target.value)}
                        className="w-full md:flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                        disabled={!assignment.class_id}
                      >
                        <option value="">Select Subject</option>
                        {subjects
                          .filter(subject => {
                            if (!assignedClass) return false
                            
                            // Determine target level from class
                            const targetLevel = assignedClass.level
                            
                            if (!targetLevel) return true
                            
                            // Filter by level if subject has it
                            if (subject.level) {
                              return subject.level === targetLevel
                            }
                            
                            // Fallback: Filter by name convention
                            if (targetLevel === 'jhs') return !subject.name.includes('(LP)') && !subject.name.includes('(UP)')
                            if (targetLevel === 'lower_primary') return !subject.name.includes('(JHS)') && !subject.name.includes('(UP)')
                            if (targetLevel === 'upper_primary') return !subject.name.includes('(JHS)') && !subject.name.includes('(LP)')
                            
                            return true
                          })
                          .map(subject => (
                          <option key={subject.id} value={subject.id}>{subject.name}</option>
                        ))}
                      </select>
                      {isSubjectTeacherClass && (
                        <label className="flex items-center space-x-2 px-3 py-2 bg-gray-50 border rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assignment.can_edit !== false}
                            onChange={(e) => updateSubjectAssignment(index, 'can_edit', e.target.checked)}
                            className="w-4 h-4 text-ghana-green rounded"
                          />
                          <span className="text-sm text-gray-700">Can Edit</span>
                        </label>
                      )}
                      <button
                        type="button"
                        onClick={() => removeSubjectAssignment(index)}
                        className="self-end md:self-auto p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  )
                })}
                {assignedSubjects.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No subjects assigned. Click "Add Subject" to assign specific subjects.</p>
                )}
              </div>
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-methodist-blue rounded">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> For class teacher model (Lower Primary and configured Upper Primary), 
                  all subjects are automatically assigned when you select a class. Subject assignments here are 
                  only for subject teacher model classes (configured Upper Primary and all JHS classes).
                </p>
              </div>
            </div>
          )}

          {/* Info box for class teacher model */}
          {assignedClasses.some(classId => teachingModels[classId] === 'class_teacher') && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">✓ Class Teacher Model Classes</h3>
              <p className="text-sm text-green-700 mb-2">
                The following classes use the class teacher model and will automatically have all subjects assigned:
              </p>
              <ul className="list-disc list-inside text-sm text-green-700">
                {assignedClasses
                  .filter(classId => teachingModels[classId] === 'class_teacher')
                  .map(classId => {
                    const cls = classes.find(c => c.id === classId)
                    return cls ? <li key={cls.id}>{cls.name}</li> : null
                  })}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <Link
              href="/admin/teachers"
              className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </main>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Reset Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="Minimum 8 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="Re-enter password"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordReset}
                className="px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700"
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
