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
      .select(`
        id,
        first_name,
        last_name,
        profile_id,
        profiles:profile_id (
          username
        )
      `)

    if (studentsError) {
      throw new Error('Failed to fetch students: ' + studentsError.message)
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ message: 'No students found' })
    }

    const updates = []
    const errors = []
    
    // Keep track of usernames we've assigned in this batch to ensure uniqueness
    // Initialize with existing usernames from the database to be safe, 
    // but for this batch script we'll check against DB for each update to be sure.
    // However, checking DB for every single one might be slow. 
    // A better approach for a fix script:
    
    for (const student of students) {
      if (!student.profile_id) continue

      const fName = student.first_name.trim().toLowerCase()
      const lName = student.last_name.trim().toLowerCase()
      
      const firstPart = fName.substring(0, 3)
      const lastPart = lName.length > 3 ? lName.slice(-3) : lName
      
      let baseUsername = `${firstPart}${lastPart}`
      let newUsername = baseUsername
      
      // Check if current username is already correct (ignoring the counter for a moment, 
      // but actually we want to strip the old timestamp ones)
      // If the current username starts with the baseUsername and is short (no timestamp), maybe keep it?
      // But the user specifically wants to remove the long string of numbers.
      // So we should regenerate all of them.

      // Ensure uniqueness
      let counter = 1
      let isUnique = false
      
      while (!isUnique) {
        // Check against DB
        // We need to exclude the current user from the check in case they already have this username
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('username', newUsername)
          .neq('id', student.profile_id) // Don't count self
        
        if (!existing || existing.length === 0) {
          isUnique = true
        } else {
          newUsername = `${baseUsername}${counter}`
          counter++
        }
      }

      // Update if changed
      // @ts-ignore
      if (student.profiles?.username !== newUsername) {
        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ username: newUsername })
          .eq('id', student.profile_id)

        if (updateError) {
          errors.push({ student: `${student.first_name} ${student.last_name}`, error: updateError.message })
        } else {
          updates.push({ 
            student: `${student.first_name} ${student.last_name}`, 
            old: (student.profiles as any)?.username, 
            new: newUsername 
          })
        }
      }
    }

    return NextResponse.json({
      message: 'Username update process completed',
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
