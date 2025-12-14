import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Define a loose database type to avoid 'never' type errors
// This allows any table/column access without strict typing
type Database = {
  public: {
    Tables: Record<string, any>
    Views: Record<string, any>
    Functions: Record<string, any>
  }
}

// Create single instance to avoid multiple client warnings
let supabaseInstance: SupabaseClient<Database> | null = null

export const supabase: SupabaseClient<Database> = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabaseInstance
})()

export function createClient(): SupabaseClient<Database> {
  return supabase
}

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent'

export interface Profile {
  id: string
  email: string
  username: string
  full_name: string
  role: UserRole
  phone_number?: string
  address?: string
  date_of_birth?: string
  gender?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  user_id: string
  student_id: string
  admission_date: string
  current_class_id: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  emergency_contact?: string
  medical_conditions?: string
  hometown?: string
  region?: string
  nationality: string
  status: string
}

export interface Teacher {
  id: string
  user_id: string
  teacher_id: string
  qualification?: string
  specialization?: string
  hire_date: string
  license_number?: string
  employment_status: string
}

export interface Class {
  id: string
  class_name: string
  class_level: number
  class_section?: string
  capacity: number
}

export interface Subject {
  id: string
  subject_name: string
  subject_code: string
  description?: string
}

export interface Assessment {
  id: string
  subject_id: string
  class_id: string
  teacher_id: string
  term_id: string
  assessment_type_id: string
  assessment_name: string
  max_score: number
  assessment_date?: string
  description?: string
}

export interface StudentScore {
  id: string
  assessment_id: string
  student_id: string
  score: number
  remarks?: string
  entered_by: string
  entered_at: string
}

export interface TermResult {
  id: string
  student_id: string
  subject_id: string
  term_id: string
  class_score?: number
  exam_score?: number
  total_score?: number
  grade?: string
  position?: number
  remarks?: string
  teacher_id: string
}

export interface ReportCard {
  id: string
  student_id: string
  term_id: string
  total_score?: number
  average_score?: number
  overall_position?: number
  attendance_days?: number
  total_school_days?: number
  class_teacher_remarks?: string
  headteacher_remarks?: string
  promoted_to_class?: string
}
