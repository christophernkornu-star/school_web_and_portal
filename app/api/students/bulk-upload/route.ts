import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const { students, classId } = await request.json()

    if (!students || !Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: 'Invalid students data' },
        { status: 400 }
      )
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Get class capacity and current count
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('capacity')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    const { count: currentCount, error: countError } = await supabaseAdmin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'active')

    if (countError) {
      return NextResponse.json(
        { error: 'Failed to check class capacity' },
        { status: 500 }
      )
    }

    const capacity = classData.capacity
    let currentStudentCount = currentCount || 0

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i]

      // Trim inputs
      if (student.first_name) student.first_name = student.first_name.trim()
      if (student.last_name) student.last_name = student.last_name.trim()
      if (student.middle_name) student.middle_name = student.middle_name.trim()

      try {
        // Validate required fields
        if (!student.first_name || !student.last_name || !student.date_of_birth || !student.gender) {
          results.failed++
          results.errors.push(`Row ${i + 2}: Missing required fields`)
          continue
        }

        // Check for duplicates in the system (same name, middle name and DOB)
        // We check for (Middle Name matches OR Middle Name is NULL) to handle cases where 
        // a student was previously uploaded without a middle name (due to a bug or omission)
        let duplicateQuery = supabaseAdmin
          .from('students')
          .select('id')
          .ilike('first_name', student.first_name)
          .ilike('last_name', student.last_name)
          .eq('date_of_birth', student.date_of_birth)

        if (student.middle_name) {
          // If CSV has middle name, match if DB has same middle name OR DB has NULL
          duplicateQuery = duplicateQuery.or(`middle_name.ilike.${student.middle_name},middle_name.is.null`)
        } else {
          // If CSV has no middle name, match if DB has NULL
          duplicateQuery = duplicateQuery.is('middle_name', null)
        }
          
        const { data: existingStudents } = await duplicateQuery
          
        if (existingStudents && existingStudents.length > 0) {
           results.failed++
           results.errors.push(`Row ${i + 2}: Student already exists in the system`)
           continue
        }

        // Check capacity
        if (currentStudentCount >= capacity) {
           results.failed++
           results.errors.push(`Row ${i + 2}: Class capacity reached (${capacity})`)
           continue
        }

        // Create user account or find existing one
        // Always generate a unique email for the student account to avoid conflicts with guardian emails
        // The guardian_email will only be used for contact purposes in the students table
        const email = `student.${student.first_name.toLowerCase()}.${student.last_name.toLowerCase()}.${Date.now()}.${Math.random().toString(36).slice(-6)}@school.temp`
        
        // Password: date of birth in DD-MM-YYYY format
        let password = student.date_of_birth
        if (password && password.includes('-')) {
          const parts = password.split('-')
          if (parts.length === 3 && parts[0].length === 4) {
             // Convert YYYY-MM-DD to DD-MM-YYYY
             password = `${parts[2]}-${parts[1]}-${parts[0]}`
          }
        }

        let authData: any = null
        let authError: any = null

        // Try to create the user
        const createResult = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true,
          user_metadata: {
            role: 'student',
            first_name: student.first_name,
            last_name: student.last_name
          }
        })

        if (createResult.error) {
          // If user already exists, try to find them
          if (createResult.error.message.includes('already been registered')) {
            const { data: users } = await supabaseAdmin.auth.admin.listUsers()
            const existingUser = users?.users?.find(u => u.email === email)
            
            if (existingUser) {
              authData = { user: existingUser }
            } else {
              results.failed++
              results.errors.push(`Row ${i + 2}: User exists but couldn't be found`)
              continue
            }
          } else {
            results.failed++
            results.errors.push(`Row ${i + 2}: Failed to create user - ${createResult.error.message}`)
            continue
          }
        } else {
          authData = createResult.data
        }

        if (!authData?.user) {
          results.failed++
          results.errors.push(`Row ${i + 2}: No user data returned`)
          continue
        }

        // Create profile record
        // Username: first 3 letters of first name + last 3 letters of last name
        const fName = student.first_name.trim().toLowerCase()
        const lName = student.last_name.trim().toLowerCase()
        
        const firstPart = fName.substring(0, 3)
        const lastPart = lName.length > 3 ? lName.slice(-3) : lName
        
        let username = `${firstPart}${lastPart}`
        
        // Ensure uniqueness by appending a counter only if necessary
        let counter = 1
        let isUnique = false
        while (!isUnique) {
          const { data: existing } = await supabaseAdmin
            .from('profiles')
            .select('username')
            .eq('username', username)
          
          if (!existing || existing.length === 0) {
            isUnique = true
          } else {
            username = `${firstPart}${lastPart}${counter}`
            counter++
          }
        }
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: email,
            username: username,
            full_name: `${student.last_name} ${student.first_name}`,
            phone: student.guardian_phone,
            role: 'student'
          }, {
            onConflict: 'id'
          })

        if (profileError) {
          results.failed++
          results.errors.push(`Row ${i + 2}: Failed to create profile - ${profileError.message}`)
          // Clean up: delete the auth user
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
          continue
        }

        // Insert student record
        const studentData = {
          profile_id: authData.user.id,
          first_name: student.first_name,
          middle_name: student.middle_name || null,
          last_name: student.last_name,
          date_of_birth: student.date_of_birth,
          gender: student.gender.charAt(0).toUpperCase() + student.gender.slice(1).toLowerCase(),
          class_id: classId,
          guardian_name: student.guardian_name,
          guardian_phone: student.guardian_phone,
          guardian_email: student.guardian_email || null,
          admission_date: new Date().toISOString().split('T')[0],
          status: 'active'
        }

        const { error: insertError } = await supabaseAdmin
          .from('students')
          .insert(studentData)

        if (insertError) {
          results.failed++
          results.errors.push(`Row ${i + 2}: ${insertError.message}`)
          
          // Clean up: delete the auth user if student insert failed
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        } else {
          results.success++
          currentStudentCount++
        }

        // Add delay to avoid rate limits
        if (i % 5 === 0 && i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      } catch (error: any) {
        results.failed++
        results.errors.push(`Row ${i + 2}: ${error.message}`)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to process bulk upload' },
      { status: 500 }
    )
  }
}
