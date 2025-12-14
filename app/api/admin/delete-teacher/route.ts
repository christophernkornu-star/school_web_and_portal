import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { teacherId, requesterId } = await request.json()

    if (!teacherId) {
      return NextResponse.json({ error: 'Missing teacherId' }, { status: 400 })
    }

    // Verify requester is admin
    if (requesterId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requesterId)
        .single()

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only admins can delete teachers' }, { status: 403 })
      }
    }

    // Get teacher's profile_id
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from('teachers')
      .select('profile_id')
      .eq('teacher_id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Delete in this order:
    // 1. Delete teacher record (this should cascade to assignments)
    const { error: deleteTeacherError } = await supabaseAdmin
      .from('teachers')
      .delete()
      .eq('teacher_id', teacherId)

    if (deleteTeacherError) {
      console.error('Error deleting teacher:', deleteTeacherError)
      return NextResponse.json({ error: deleteTeacherError.message }, { status: 500 })
    }

    // 2. Delete profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', teacher.profile_id)

    if (deleteProfileError) {
      console.error('Error deleting profile:', deleteProfileError)
      // Continue anyway, as teacher is already deleted
    }

    // 3. Delete auth user
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
      teacher.profile_id
    )

    if (deleteAuthError) {
      console.error('Error deleting auth user:', deleteAuthError)
      // Continue anyway, as teacher and profile are already deleted
    }

    return NextResponse.json({ 
      success: true,
      message: 'Teacher deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in delete teacher API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
