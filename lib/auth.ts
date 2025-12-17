import { getSupabaseBrowserClient } from './supabase-browser'

// Get the browser Supabase client (uses cookies for session)
function getBrowserSupabase() {
  return getSupabaseBrowserClient()
}

export async function signInWithUsername(username: string, password: string) {
  console.log('🔐 Attempting login with username:', username)
  
  // Use cookie-based client for browser auth
  const browserSupabase = getBrowserSupabase()
  
  // Try to find user by username in profiles first
  const { data: profileData } = await browserSupabase
    .from('profiles')
    .select('email, role')
    .eq('username', username)
    .single() as { data: any }

  let emailToUse = profileData?.email || `${username}@school.local`
  
  console.log('🔑 Attempting auth with email:', emailToUse)
  
  const { data, error } = await browserSupabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  })

  if (error) {
    console.error('❌ Auth sign in error:', error)
    return { data: null, error, role: null }
  }

  console.log('✅ Auth sign in successful')

  // Get role from profile or derive from username
  let role = profileData?.role || null
  if (!role) {
    if (username.startsWith('admin.')) {
      role = 'admin'
    } else if (username.startsWith('teacher.')) {
      role = 'teacher'
    } else if (username.startsWith('student.')) {
      role = 'student'
    }
  }

  // Ensure user metadata has the role (crucial for middleware)
  if (role && data.user && data.user.user_metadata?.role !== role) {
    console.log('🔄 Updating user metadata with role:', role)
    await browserSupabase.auth.updateUser({
      data: { role: role }
    })
  }

  return { data, error: null, role }
}

export async function signIn(email: string, password: string) {
  const browserSupabase = getBrowserSupabase()
  const { data, error } = await browserSupabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export async function signOut() {
  const browserSupabase = getBrowserSupabase()
  const { error } = await browserSupabase.auth.signOut()
  return { error }
}

export async function getCurrentUser() {
  const browserSupabase = getBrowserSupabase()
  try {
    const { data: { user }, error } = await browserSupabase.auth.getUser()
    
    // If there's a session error, clear it
    if (error && error.message.includes('refresh_token')) {
      await browserSupabase.auth.signOut()
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    // Clear invalid session
    const browserSupabase = getBrowserSupabase()
    await browserSupabase.auth.signOut()
    return null
  }
}

export async function getUserProfile(userId: string) {
  const browserSupabase = getBrowserSupabase()
  const { data, error } = await browserSupabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  return { data, error }
}

export async function getStudentData(userId: string) {
  const browserSupabase = getBrowserSupabase()
  const { data, error } = await browserSupabase
    .from('students')
    .select(`
      *,
      profiles(*),
      classes(id, name, level, category)
    `)
    .eq('profile_id', userId)
    .maybeSingle()
  
  return { data: data as any, error }
}

export async function getTeacherData(userId: string) {
  const browserSupabase = getBrowserSupabase()
  const { data, error } = await browserSupabase
    .from('teachers')
    .select(`
      *,
      profiles(*)
    `)
    .eq('profile_id', userId)
    .maybeSingle()
  
  return { data: data as any, error }
}

export async function getTeacherAssignments(teacherId: string) {
  const browserSupabase = getBrowserSupabase()
  const { data, error } = await browserSupabase
    .from('teacher_subject_assignments')
    .select(`
      *,
      subjects(*),
      classes(*)
    `)
    .eq('teacher_id', teacherId)
  
  return { data, error }
}

export async function getStudentResults(studentId: string, termId?: string) {
  const browserSupabase = getBrowserSupabase()
  let query = browserSupabase
    .from('term_results')
    .select(`
      *,
      subjects(*),
      terms(*)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  
  if (termId) {
    query = query.eq('term_id', termId)
  }
  
  const { data, error } = await query
  return { data, error }
}

export async function getStudentReportCard(studentId: string, termId: string) {
  const browserSupabase = getBrowserSupabase()
  const { data, error } = await browserSupabase
    .from('report_cards')
    .select(`
      *,
      terms(*),
      students(
        *,
        profiles(*),
        classes(*)
      )
    `)
    .eq('student_id', studentId)
    .eq('term_id', termId)
    .single()
  
  return { data, error }
}
