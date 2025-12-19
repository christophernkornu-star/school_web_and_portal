import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Create a Supabase client with service role (bypasses RLS)
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

export async function GET() {
  try {
    // 1. Fetch all students with their profile data
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, last_name, date_of_birth, profile_id')

    if (studentsError) {
      throw new Error('Failed to fetch students: ' + studentsError.message)
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ message: 'No students found' })
    }

    const updates = []
    const errors = []
    
    for (const student of students) {
      if (!student.profile_id || !student.date_of_birth) continue

      // Convert YYYY-MM-DD to DD-MM-YYYY
      let newPassword = student.date_of_birth
      if (newPassword.includes('-')) {
        const parts = newPassword.split('-')
        if (parts.length === 3 && parts[0].length === 4) {
           // Convert YYYY-MM-DD to DD-MM-YYYY
           newPassword = `${parts[2]}-${parts[1]}-${parts[0]}`
        }
      }

      try {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          student.profile_id,
          { password: newPassword }
        )

        if (updateError) {
          errors.push({ student: `${student.first_name} ${student.last_name}`, error: updateError.message })
        } else {
          updates.push({ 
            student: `${student.first_name} ${student.last_name}`, 
            password: newPassword 
          })
        }
        
        // Add a small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (err: any) {
        errors.push({ student: `${student.first_name} ${student.last_name}`, error: err.message })
      }
    }

    return NextResponse.json({
      message: 'Password update process completed',
      total_students: students.length,
      updated_count: updates.length,
      error_count: errors.length,
      updates,
      errors
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
