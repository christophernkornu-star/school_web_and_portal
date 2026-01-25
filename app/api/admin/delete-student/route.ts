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
    // Defense-in-Depth: Verify Admin Session
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { studentId } = await request.json()

    if (!studentId) {
      return NextResponse.json({ error: 'Missing studentId' }, { status: 400 })
    }

    // Get student's profile_id
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('profile_id')
      .eq('id', studentId)
      .single()

    if (studentError || !student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Delete in this order:
    // 1. Delete student record
    const { error: deleteStudentError } = await supabaseAdmin
      .from('students')
      .delete()
      .eq('id', studentId)

    if (deleteStudentError) {
      console.error('Error deleting student:', deleteStudentError)
      return NextResponse.json({ error: deleteStudentError.message }, { status: 500 })
    }

    // 2. Delete profile
    if (student.profile_id) {
      const { error: deleteProfileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', student.profile_id)

      if (deleteProfileError) {
        console.error('Error deleting profile:', deleteProfileError)
        // Continue anyway, as student is already deleted
      }

      // 3. Delete auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(
        student.profile_id
      )

      if (deleteAuthError) {
        console.error('Error deleting auth user:', deleteAuthError)
        // Continue anyway, as student and profile are already deleted
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Student deleted successfully'
    })

  } catch (error: any) {
    console.error('Error in delete student API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
