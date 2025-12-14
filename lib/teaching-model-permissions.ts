import { getSupabaseBrowserClient } from './supabase-browser'

/**
 * Enhanced teacher permissions that integrate with teaching model system
 */

export type TeachingModel = 'class_teacher' | 'subject_teacher'
export type SchoolSection = 'lower_primary' | 'upper_primary' | 'jhs'

export interface TeacherClassAssignment {
  class_id: string
  class_name: string
  class_level: string
  school_section: SchoolSection
  teaching_model: TeachingModel
  is_class_teacher: boolean
  is_primary: boolean
}

export interface TeacherSubjectAssignment {
  subject_id: string
  subject_name: string
  class_id: string
  class_name: string
  can_edit: boolean
  is_assigned: boolean
}

export interface TeacherPermissions {
  class_id: string
  class_name: string
  teaching_model: TeachingModel
  is_class_teacher: boolean
  subjects: {
    subject_id: string
    subject_name: string
    can_view: boolean
    can_edit: boolean
  }[]
  can_mark_attendance: boolean
  can_manage_students: boolean
}

/**
 * Determine teaching model based on class level
 */
export function getTeachingModelForLevel(level: string, upperPrimaryModel: TeachingModel = 'class_teacher'): TeachingModel {
  if (['Basic 1', 'Basic 2', 'Basic 3'].includes(level)) {
    return 'class_teacher'
  }
  if (['Basic 4', 'Basic 5', 'Basic 6'].includes(level)) {
    return upperPrimaryModel
  }
  if (['JHS 1', 'JHS 2', 'JHS 3'].includes(level)) {
    return 'subject_teacher'
  }
  return 'class_teacher'
}

/**
 * Determine school section from class level
 */
export function getSchoolSection(level: string): SchoolSection {
  if (['Basic 1', 'Basic 2', 'Basic 3'].includes(level)) {
    return 'lower_primary'
  }
  if (['Basic 4', 'Basic 5', 'Basic 6'].includes(level)) {
    return 'upper_primary'
  }
  return 'jhs'
}

/**
 * Get teaching model configuration from system settings
 */
export async function getTeachingModelConfig(): Promise<{
  lower_primary: TeachingModel
  upper_primary: TeachingModel
  jhs: TeachingModel
}> {
  const supabase = getSupabaseBrowserClient()
  const { data } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['lower_primary_teaching_model', 'upper_primary_teaching_model', 'jhs_teaching_model']) as { data: any[] | null }
  
  const config = {
    lower_primary: 'class_teacher' as TeachingModel,
    upper_primary: 'class_teacher' as TeachingModel,
    jhs: 'subject_teacher' as TeachingModel,
  }
  
  if (data) {
    data.forEach(setting => {
      if (setting.setting_key === 'lower_primary_teaching_model') {
        config.lower_primary = setting.setting_value as TeachingModel
      } else if (setting.setting_key === 'upper_primary_teaching_model') {
        config.upper_primary = setting.setting_value as TeachingModel
      } else if (setting.setting_key === 'jhs_teaching_model') {
        config.jhs = setting.setting_value as TeachingModel
      }
    })
  }
  
  return config
}

/**
 * Get all class assignments for a teacher with teaching model context
 */
export async function getTeacherClassAssignments(teacherUUID: string): Promise<TeacherClassAssignment[]> {
  const config = await getTeachingModelConfig()
  const supabase = getSupabaseBrowserClient()

  const { data, error } = await supabase
    .from('teacher_class_assignments')
    .select(`
      class_id,
      is_class_teacher,
      is_primary,
      classes (
        id,
        name,
        level
      )
    `)
    .eq('teacher_id', teacherUUID) as { data: any[] | null, error: any }
  
  if (error) {
    console.error('Error loading teacher class assignments:', error)
    return []
  }
  
  if (!data) return []
  
  return data.map(assignment => {
    const cls = assignment.classes as any
    const level = cls.level
    const section = getSchoolSection(level)
    const teachingModel = getTeachingModelForLevel(level, config.upper_primary)
    
    return {
      class_id: cls.id,
      class_name: cls.name,
      class_level: level,
      school_section: section,
      teaching_model: teachingModel,
      is_class_teacher: assignment.is_class_teacher || false,
      is_primary: assignment.is_primary || false,
    }
  })
}

/**
 * Get subject assignments for a teacher in a specific class
 */
export async function getTeacherSubjectAssignments(
  teacherUUID: string,
  classId?: string
): Promise<TeacherSubjectAssignment[]> {
  const supabase = getSupabaseBrowserClient()
  let query = supabase
    .from('teacher_subject_assignments')
    .select(`
      subject_id,
      class_id,
      can_edit,
      subjects (
        id,
        name
      ),
      classes (
        id,
        name
      )
    `)
    .eq('teacher_id', teacherUUID)
  
  if (classId) {
    query = query.eq('class_id', classId)
  }
  
  const { data, error } = await query as { data: any[] | null, error: any }
  
  if (error) {
    console.error('Error loading teacher subject assignments:', error)
    return []
  }
  
  if (!data) return []
  
  return data.map((assignment: any) => ({
    subject_id: assignment.subject_id,
    subject_name: (assignment.subjects as any)?.name || 'Unknown',
    class_id: assignment.class_id,
    class_name: (assignment.classes as any)?.name || 'Unknown',
    can_edit: assignment.can_edit !== false,
    is_assigned: true,
  }))
}

/**
 * Get comprehensive permissions for a teacher
 */
export async function getTeacherPermissions(teacherUUID: string): Promise<TeacherPermissions[]> {
  const classAssignments = await getTeacherClassAssignments(teacherUUID)
  const subjectAssignments = await getTeacherSubjectAssignments(teacherUUID)
  const supabase = getSupabaseBrowserClient()
  
  // Load all subjects for reference
  const { data: allSubjects } = await supabase
    .from('subjects')
    .select('id, name')
    .order('name') as { data: any[] | null }
  
  const permissions: TeacherPermissions[] = []
  
  for (const classAssignment of classAssignments) {
    const classSubjects = subjectAssignments.filter(s => s.class_id === classAssignment.class_id)
    
    let subjectPermissions: TeacherPermissions['subjects'] = []
    
    if (classAssignment.teaching_model === 'class_teacher') {
      // Class teacher model: Can view and edit all subjects
      subjectPermissions = (allSubjects || []).map(subject => ({
        subject_id: subject.id,
        subject_name: subject.name,
        can_view: true,
        can_edit: true,
      }))
    } else {
      // Subject teacher model
      if (classAssignment.is_class_teacher) {
        // Class teacher in subject model: Can view all, edit only assigned
        subjectPermissions = (allSubjects || []).map(subject => {
          const assignment = classSubjects.find(s => s.subject_id === subject.id)
          return {
            subject_id: subject.id,
            subject_name: subject.name,
            can_view: true,
            can_edit: assignment ? assignment.can_edit : false,
          }
        })
      } else {
        // Regular subject teacher: Can only view/edit assigned subjects
        subjectPermissions = classSubjects.map(assignment => ({
          subject_id: assignment.subject_id,
          subject_name: assignment.subject_name,
          can_view: true,
          can_edit: assignment.can_edit,
        }))
      }
    }
    
    permissions.push({
      class_id: classAssignment.class_id,
      class_name: classAssignment.class_name,
      teaching_model: classAssignment.teaching_model,
      is_class_teacher: classAssignment.is_class_teacher,
      subjects: subjectPermissions,
      can_mark_attendance: classAssignment.is_class_teacher,
      can_manage_students: classAssignment.is_class_teacher,
    })
  }
  
  return permissions
}

/**
 * Check if teacher can edit scores for a specific subject in a class
 */
export async function canTeacherEditSubject(
  teacherUUID: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const permissions = await getTeacherPermissions(teacherUUID)
  const classPermission = permissions.find(p => p.class_id === classId)
  
  if (!classPermission) return false
  
  const subjectPermission = classPermission.subjects.find(s => s.subject_id === subjectId)
  return subjectPermission ? subjectPermission.can_edit : false
}

/**
 * Check if teacher can mark attendance for a class
 */
export async function canTeacherMarkAttendance(
  teacherUUID: string,
  classId: string
): Promise<boolean> {
  const permissions = await getTeacherPermissions(teacherUUID)
  const classPermission = permissions.find(p => p.class_id === classId)
  
  return classPermission ? classPermission.can_mark_attendance : false
}

/**
 * Get classes where teacher can mark attendance
 */
export async function getClassesForAttendance(teacherUUID: string): Promise<string[]> {
  const classAssignments = await getTeacherClassAssignments(teacherUUID)
  return classAssignments
    .filter(assignment => assignment.is_class_teacher)
    .map(assignment => assignment.class_id)
}

/**
 * Get subjects a teacher can access for a class (for filtering dropdowns)
 */
export async function getAccessibleSubjects(
  teacherUUID: string,
  classId: string
): Promise<{ subject_id: string; subject_name: string; can_edit: boolean }[]> {
  const permissions = await getTeacherPermissions(teacherUUID)
  const classPermission = permissions.find(p => p.class_id === classId)
  
  if (!classPermission) return []
  
  return classPermission.subjects.filter(s => s.can_view)
}
