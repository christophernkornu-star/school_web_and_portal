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

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each student
    for (let i = 0; i < students.length; i++) {
      const student = students[i]

      try {
        // Validate required fields
        if (!student.first_name || !student.last_name || !student.date_of_birth || 
            !student.gender || !student.guardian_name || !student.guardian_phone) {
          results.failed++
          results.errors.push(`Row ${i + 2}: Missing required fields`)
          continue
        }

        // Create user account or find existing one
        // Generate unique email with timestamp and random string to avoid conflicts
        const email = student.guardian_email || `student.${student.first_name.toLowerCase()}.${student.last_name.toLowerCase()}.${Date.now()}.${Math.random().toString(36).slice(-6)}@school.temp`
        
        // Password: firstname + date of birth (e.g., John2010-05-15)
        const password = `${student.first_name}${student.date_of_birth}`

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
        // Username: first 3 letters of lastname + first 3 letters of firstname (Ghanaian order)
        const lastThree = student.last_name.substring(0, 3).toLowerCase()
        const firstThree = student.first_name.substring(0, 3).toLowerCase()
        const baseUsername = `${lastThree}${firstThree}`
        const username = `${baseUsername}${Date.now()}` // Add timestamp to ensure uniqueness
        
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
