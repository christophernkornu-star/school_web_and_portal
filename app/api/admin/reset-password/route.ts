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

    // If requester is teacher, ensure they are not resetting an admin's password (optional, but good practice)
    // For now, keeping the logic simple as per original intent but secure.

      if (profileError || !profile) {
        return NextResponse.json({ 
          error: 'Profile not found',
          details: profileError?.message 
        }, { status: 404 })
      }

      if (profile.role !== 'admin' && profile.role !== 'teacher') {
        return NextResponse.json({ 
          error: `Forbidden: Only admins and teachers can reset passwords. Your role: ${profile.role}`,
          username: profile.username
        }, { status: 403 })
      }

      // Debug logging
      console.log('Reset password request:', {
        requesterId,
        userId,
        requesterRole: profile.role,
        requesterUsername: profile.username
      })

      // Check role-based permissions
      if (profile.role === 'admin') {
        // Admins can reset anyone's password
        console.log('Admin detected - allowing password reset')
      } else if (profile.role === 'teacher') {
        // Teachers can only reset student passwords in their assigned classes
        console.log('Teacher detected - checking student access')
        
        const { data: studentData } = await supabaseAdmin
          .from('students')
          .select(`
            id,
            class_id,
            classes!inner(id)
          `)
          .eq('profile_id', userId)
          .single()

        if (!studentData) {
          return NextResponse.json({ error: 'Teachers can only reset student passwords in their assigned classes' }, { status: 403 })
        }

        // Verify teacher has access to this class
        const { data: teacherData } = await supabaseAdmin
          .from('teachers')
          .select(`
            id,
            teacher_class_assignments!inner(class_id)
          `)
          .eq('profile_id', requesterId)
          .eq('teacher_class_assignments.class_id', studentData.class_id)
          .single()

        if (!teacherData) {
          return NextResponse.json({ error: 'Forbidden: You can only reset passwords for students in your assigned classes' }, { status: 403 })
        }
      } else {
        return NextResponse.json({ 
          error: `Forbidden: Invalid role '${profile.role}' for password reset` 
        }, { status: 403 })
      }
    } else {
      // If no requesterId provided, allow the reset (for admin operations without auth check)
      console.log('No requesterId - allowing password reset')
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
