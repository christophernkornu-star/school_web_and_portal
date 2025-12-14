import { getSupabaseBrowserClient } from './supabase-browser'

// Teacher permission types
export interface SubjectTaught {
  subject_id: string
  subject_name?: string
}

export interface TeacherClassAccess {
  class_id: string
  class_name: string
  level: 'lower_primary' | 'upper_primary' | 'jhs'
  is_class_teacher: boolean
  teaching_model: 'class_teacher' | 'subject_teacher'
  subjects_taught: SubjectTaught[]
  can_view_all_subjects: boolean
  can_edit_all_subjects: boolean
  can_mark_attendance: boolean
}

export interface SubjectAccess {
  subject_id: string
  subject_name: string
  can_view: boolean
  can_edit: boolean
  can_delete: boolean
  is_assigned_teacher: boolean
}

// Teaching model types
type TeachingModel = 'class_teacher' | 'subject_teacher'

/**
 * Get the teaching model for a class based on its level
 */
export async function getTeachingModelForClass(classLevel: string): Promise<TeachingModel> {
  // Lower Primary (Basic 1-3): Always class teacher
  if (['Basic 1', 'Basic 2', 'Basic 3'].includes(classLevel)) {
    return 'class_teacher'
  }
  
  // JHS (JHS 1-3): Always subject teacher
  if (['JHS 1', 'JHS 2', 'JHS 3'].includes(classLevel)) {
    return 'subject_teacher'
  }
  
  // Upper Primary (Basic 4-6): Check configuration
  if (['Basic 4', 'Basic 5', 'Basic 6'].includes(classLevel)) {
    const supabase = getSupabaseBrowserClient()
    const { data } = (await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'upper_primary_teaching_model')
      .single()) as { data: any }
    
    return (data?.setting_value as TeachingModel) || 'class_teacher'
  }
  
  // Default to class teacher for unknown levels
  return 'class_teacher'
}

/**
 * Check if a teacher is assigned to a specific class
 */
export async function isTeacherAssignedToClass(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('teacher_class_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('class_id', classId)
    .maybeSingle()

  if (error) {
    console.error('Error checking teacher assignment:', error)
    return false
  }

  return !!data
}

/**
 * Get all classes a teacher has access to
 */
export async function getTeacherClassAccess(profileId: string): Promise<TeacherClassAccess[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_teacher_classes', {
    p_profile_id: profileId
  })

  if (error) {
    console.error('Error getting teacher class access:', error)
    return []
  }

  // Supabase automatically parses JSONB to JavaScript objects
  return (data || []) as TeacherClassAccess[]
}

/**
 * Get subject access for a teacher in a specific class
 */
export async function getTeacherSubjectAccess(
  teacherId: string,
  classId: string
): Promise<SubjectAccess[]> {
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase.rpc('get_teacher_subject_access', {
    p_teacher_id: teacherId,
    p_class_id: classId
  })

  if (error) {
    console.error('Error getting teacher subject access:', error)
    return []
  }

  return data || []
}

/**
 * Check if teacher can view scores for a subject
 */
export async function canViewSubjectScores(
  teacherId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const subjects = await getTeacherSubjectAccess(teacherId, classId)
  const subject = subjects.find(s => s.subject_id === subjectId)
  return subject?.can_view || false
}

/**
 * Check if teacher can edit scores for a subject
 */
export async function canEditSubjectScores(
  teacherId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const subjects = await getTeacherSubjectAccess(teacherId, classId)
  const subject = subjects.find(s => s.subject_id === subjectId)
  return subject?.can_edit || false
}

/**
 * Check if teacher can delete scores for a subject
 */
export async function canDeleteSubjectScores(
  teacherId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const subjects = await getTeacherSubjectAccess(teacherId, classId)
  const subject = subjects.find(s => s.subject_id === subjectId)
  return subject?.can_delete || false
}

/**
 * Check if teacher can mark attendance for a class
 */
export async function canMarkAttendance(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const classes = await getTeacherClassAccess(teacherId)
  const classAccess = classes.find(c => c.class_id === classId)
  return classAccess?.can_mark_attendance || false
}

/**
 * Check if teacher is class teacher
 */
export async function isClassTeacher(
  teacherId: string,
  classId: string
): Promise<boolean> {
  const classes = await getTeacherClassAccess(teacherId)
  const classAccess = classes.find(c => c.class_id === classId)
  return classAccess?.is_class_teacher || false
}

/**
 * Get all students in classes accessible to teacher
 */
export async function getTeacherStudents(teacherId: string) {
  // First get accessible classes
  const classes = await getTeacherClassAccess(teacherId)
  const classIds = classes.map(c => c.class_id)

  if (classIds.length === 0) {
    return { data: [], error: null }
  }

  // Get students in those classes
  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      classes(*)
    `)
    .in('class_id', classIds)
    .eq('status', 'active')
    .order('first_name')

  return { data, error }
}

/**
 * Get students in a specific class (if teacher has access)
 */
export async function getClassStudents(teacherId: string, classId: string) {
  // Verify teacher has access to this class
  const classes = await getTeacherClassAccess(teacherId)
  const hasAccess = classes.some(c => c.class_id === classId)

  if (!hasAccess) {
    return { data: [], error: { message: 'No access to this class' } }
  }

  const supabase = getSupabaseBrowserClient()
  const { data, error } = await supabase
    .from('students')
    .select(`
      *,
      classes(*)
    `)
    .eq('class_id', classId)
    .eq('status', 'active')
    .order('first_name')

  return { data, error }
}

/**
 * Get permission summary for UI display
 */
export function getPermissionSummary(classAccess: TeacherClassAccess): string {
  if (classAccess.level === 'lower_primary') {
    return 'Full Access (All Subjects)'
  }

  if (classAccess.is_class_teacher) {
    if (classAccess.can_edit_all_subjects) {
      return 'Class Teacher (Full Access)'
    } else {
      return 'Class Teacher (View All, Edit Assigned Only)'
    }
  }

  return `Subject Teacher (${classAccess.subjects_taught.length} subject${classAccess.subjects_taught.length !== 1 ? 's' : ''})`
}

/**
 * Get badge color based on permission level
 */
export function getPermissionBadgeColor(classAccess: TeacherClassAccess): string {
  if (classAccess.level === 'lower_primary' || classAccess.can_edit_all_subjects) {
    return 'bg-green-100 text-green-800'
  }

  if (classAccess.is_class_teacher) {
    return 'bg-blue-100 text-blue-800'
  }

  return 'bg-gray-100 text-gray-800'
}

/**
 * Check if teacher can manage students (add, delete, modify details)
 * Only class teachers can manage student details
 */
export async function canManageStudents(profileId: string, classId: string): Promise<boolean> {
  const classAccess = await getTeacherClassAccess(profileId)
  const access = classAccess.find(c => c.class_id === classId)
  return access?.is_class_teacher || false
}

/**
 * Check if teacher can edit scores for a specific subject
 * Class teachers can edit all subjects, subject teachers can only edit their assigned subjects
 */
export async function canEditSubjectScore(
  profileId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const classAccess = await getTeacherClassAccess(profileId)
  const access = classAccess.find(c => c.class_id === classId)
  
  if (!access) return false
  
  // Class teachers can edit all subjects
  if (access.is_class_teacher && access.can_edit_all_subjects) {
    return true
  }
  
  // Check if subject is in assigned subjects
  return access.subjects_taught.some(s => s.subject_id === subjectId)
}

/**
 * Get list of subjects a teacher can edit scores for in a class
 */
export async function getEditableSubjects(
  profileId: string,
  classId: string
): Promise<string[]> {
  const classAccess = await getTeacherClassAccess(profileId)
  const access = classAccess.find(c => c.class_id === classId)
  
  if (!access) return []
  
  // Class teachers with full access can edit all subjects
  if (access.is_class_teacher && access.can_edit_all_subjects) {
    // Return all subjects for the class
    const supabase = getSupabaseBrowserClient()
    const { data: subjects } = (await supabase
      .from('subjects')
      .select('id')
      .eq('class_id', classId)) as { data: any[] | null }
    
    return subjects?.map((s: any) => s.id) || []
  }
  
  // Return only assigned subjects
  return access.subjects_taught.map(s => s.subject_id)
}
