import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

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
    // 1. Fetch all students
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id, first_name, last_name, middle_name, date_of_birth, profile_id, created_at')
      .order('created_at', { ascending: true }) // Oldest first

    if (studentsError) {
      throw new Error('Failed to fetch students: ' + studentsError.message)
    }

    if (!students || students.length === 0) {
      return NextResponse.json({ message: 'No students found' })
    }

    const duplicatesRemoved = []
    const errors = []
    
    // Group by unique key: firstname|lastname|dob
    const groups = new Map<string, any[]>()

    for (const student of students) {
      const key = `${student.first_name?.trim().toLowerCase()}|${student.last_name?.trim().toLowerCase()}|${student.date_of_birth}`
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)?.push(student)
    }

    // Process groups with multiple records
    for (const [key, group] of groups.entries()) {
      if (group.length > 1) {
        // We have duplicates
        // Strategy: Keep the one with a middle name. If multiple have middle names, keep the latest one (assuming it's the correction). 
        // If none have middle names, keep the oldest one.
        
        // Sort group: 
        // 1. Has middle name (priority)
        // 2. Created recently (if both have middle name, maybe the new one is better? or maybe the old one has data?)
        // Actually, usually the one with the middle name is the "correct" one from the second upload.
        
        let bestRecord = group[0]
        
        // Find record with middle name
        const withMiddle = group.filter(s => s.middle_name && s.middle_name.trim().length > 0)
        
        if (withMiddle.length > 0) {
          // If we have records with middle names, pick the most recent one of them
          // (Assuming the user re-uploaded to fix details)
          bestRecord = withMiddle[withMiddle.length - 1]
        } else {
          // If no middle names, keep the oldest record (original)
          bestRecord = group[0]
        }

        // Identify records to delete
        const toDelete = group.filter(s => s.id !== bestRecord.id)

        for (const duplicate of toDelete) {
          try {
            // Delete student record
            const { error: delError } = await supabaseAdmin
              .from('students')
              .delete()
              .eq('id', duplicate.id)

            if (delError) throw delError

            // Delete profile (cascade should handle this usually, but let's be explicit if needed, 
            // or if profile exists but student deleted)
            if (duplicate.profile_id) {
               // Delete auth user (this will cascade delete profile and student usually, but we deleted student first)
               // Actually, deleting auth user is the cleanest way to remove everything.
               const { error: authDelError } = await supabaseAdmin.auth.admin.deleteUser(duplicate.profile_id)
               if (authDelError) {
                 console.error('Error deleting auth user:', authDelError)
                 // If auth delete fails, try deleting profile manually
                 await supabaseAdmin.from('profiles').delete().eq('id', duplicate.profile_id)
               }
            }

            duplicatesRemoved.push({
              kept: `${bestRecord.first_name} ${bestRecord.middle_name || ''} ${bestRecord.last_name}`,
              removed: `${duplicate.first_name} ${duplicate.middle_name || ''} ${duplicate.last_name}`,
              reason: bestRecord.middle_name ? 'Kept record with middle name' : 'Kept original record'
            })

          } catch (err: any) {
            errors.push({ student: duplicate.id, error: err.message })
          }
        }
      }
    }

    return NextResponse.json({
      message: 'Duplicate removal process completed',
      total_students: students.length,
      duplicates_found: duplicatesRemoved.length,
      duplicates_removed: duplicatesRemoved,
      errors
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
