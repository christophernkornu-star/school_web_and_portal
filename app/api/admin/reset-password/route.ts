import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Create a Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword, newUsername } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 })
    }

    // Verify Authentication & Authorization via Session
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the requester's profile using the session ID
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('role, username')
        .eq('id', session.user.id) // Use session ID, not body param
        .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Requester profile not found' }, { status: 403 })
    }

    // Check if requester is admin or teacher
    if (profile.role !== 'admin' && profile.role !== 'teacher') {
       return NextResponse.json({ error: 'Unauthorized to reset passwords' }, { status: 403 })
    }

    // Role-based logic
    if (profile.role === 'teacher') {
       // 1. Get Teacher ID
       const { data: teacher } = await supabaseAdmin
          .from('teachers')
          .select('id')
          .eq('profile_id', session.user.id)
          .single();
       
       if (!teacher) {
          return NextResponse.json({ error: 'Teacher profile incomplete' }, { status: 403 })
       }

       // 2. Get Target Student Class
       const { data: student } = await supabaseAdmin
          .from('students')
          .select('class_id')
          .eq('profile_id', userId)
          .single()

       if (!student) {
          return NextResponse.json({ error: 'Target user is not a student' }, { status: 400 })
       }

       // 3. Check Assignment
       const { data: assignment } = await supabaseAdmin
          .from('teacher_class_assignments')
          .select('*')
          .eq('teacher_id', teacher.id)
          .eq('class_id', student.class_id)
          .single()
          
       if (!assignment) {
          return NextResponse.json({ error: 'You are not assigned to this student\'s class' }, { status: 403 })
       }
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Update username in profiles table if provided
    if (newUsername) {
      const { error: usernameError } = await supabaseAdmin
        .from('profiles')
        .update({ username: newUsername })
        .eq('id', userId)

      if (usernameError) {
        console.error('Error updating username:', usernameError)
        return NextResponse.json({ error: `Failed to update username: ${usernameError.message}` }, { status: 500 })
      }
    }

    // Use admin client to update the user's password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    )

    if (error) {
      console.error('Error resetting password:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: `Password${newUsername ? ' and username' : ''} reset successfully` 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
