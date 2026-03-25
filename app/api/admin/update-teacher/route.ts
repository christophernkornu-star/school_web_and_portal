import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

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
    const { 
      teacherId, 
      profileId,
      requesterId,
      firstName,
      middleName,
      lastName,
      phone,
      specialization,
      qualification,
      hireDate,
      status,
      username,
      email,
      gender // Add gender
    } = await request.json()

    if (!teacherId || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify requester is an authenticated admin via session
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

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can update teachers' }, { status: 403 })
    }

    // Update teacher record
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .update({
        first_name: firstName,
        middle_name: middleName || null,
        last_name: lastName,
        phone: phone || null,
        specialization: specialization || null,
        qualification: qualification || null,
        hire_date: hireDate,
        status: status,
        gender: gender || null, // Update gender
        updated_at: new Date().toISOString(),
      })
      .eq('teacher_id', teacherId) // Using string ID

    if (teacherError) throw teacherError

    // Update profile
    const fullName = middleName 
      ? `${firstName} ${middleName} ${lastName}`
      : `${firstName} ${lastName}`

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username,
        email: email,
        full_name: fullName,
      })
      .eq('id', profileId)

    if (profileError) throw profileError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating teacher:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
