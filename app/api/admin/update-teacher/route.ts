import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
      lastName,
      phone,
      specialization,
      qualification,
      hireDate,
      status,
      username,
      email
    } = await request.json()

    if (!teacherId || !profileId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify requester is admin
    if (requesterId) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', requesterId)
        .single()

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: Only admins can update teachers' }, { status: 403 })
      }
    }

    // Update teacher record
    const { error: teacherError } = await supabaseAdmin
      .from('teachers')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: phone,
        specialization: specialization,
        qualification: qualification,
        hire_date: hireDate,
        status: status,
      })
      .eq('teacher_id', teacherId)

    if (teacherError) throw teacherError

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        username: username,
        email: email,
        full_name: `${firstName} ${lastName}`,
      })
      .eq('id', profileId)

    if (profileError) throw profileError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating teacher:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
