require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function migrateStudentLogins() {
  console.log('Starting student login migration...')

  // 1. Fetch all students
  const { data: students, error: fetchError } = await supabase
    .from('students')
    .select('id, first_name, last_name, date_of_birth, profile_id')

  if (fetchError) {
    console.error('Error fetching students:', fetchError)
    return
  }

  console.log(`Found ${students.length} students to update.`)

  let successCount = 0
  let errorCount = 0

  for (const student of students) {
    try {
      if (!student.profile_id) {
        console.log(`Skipping student ${student.first_name} ${student.last_name} (No profile_id)`)
        continue
      }

      // 2. Generate new credentials
      const sanitizedFirst = student.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      const sanitizedLast = student.last_name.toLowerCase().replace(/[^a-z0-9]/g, '')
      
      const firstPart = sanitizedFirst.substring(0, 3)
      const lastPart = sanitizedLast.substring(Math.max(0, sanitizedLast.length - 3))
      let baseUsername = `${firstPart}${lastPart}`.toLowerCase()
      
      // Ensure username is at least 3 chars if names are very short
      if (baseUsername.length < 3) {
         baseUsername = (sanitizedFirst + sanitizedLast).substring(0, 6).toLowerCase()
      }

      let username = baseUsername
      let counter = 1

      // Check for uniqueness (simple check against what we are about to set, 
      // ideally we check DB but for batch migration we might hit race conditions if we don't track locally 
      // or just rely on DB constraints. Here we'll just try to update and if it fails on unique constraint, we'd need to handle it.
      // But for simplicity in this script, let's assume we might need to append numbers if we process duplicates.)
      
      // Actually, checking DB for every user is slow. 
      // Let's just try to update. If it fails, we log it.
      
      // Password from DOB
      let password = 'Student123!' // Fallback
      if (student.date_of_birth) {
        // date_of_birth is usually YYYY-MM-DD in DB
        const parts = student.date_of_birth.split('-')
        if (parts.length === 3) {
          const [year, month, day] = parts
          password = `${day}-${month}-${year}`
        }
      }

      const email = `${username}@school.local`

      console.log(`Updating ${student.first_name} ${student.last_name}...`)
      console.log(`  - New Username: ${username}`)
      console.log(`  - New Password: ${password}`)
      console.log(`  - New Email: ${email}`)

      // 3. Update Auth User (Email & Password)
      const { error: authError } = await supabase.auth.admin.updateUserById(
        student.profile_id,
        {
          email: email,
          password: password,
          user_metadata: {
            username: username
          }
        }
      )

      if (authError) {
        throw new Error(`Auth update failed: ${authError.message}`)
      }

      // 4. Update Profile (Username & Email)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: username,
          email: email
        })
        .eq('id', student.profile_id)

      if (profileError) {
        throw new Error(`Profile update failed: ${profileError.message}`)
      }

      console.log(`  ✅ Success`)
      successCount++

    } catch (err) {
      console.error(`  ❌ Failed to update student ${student.first_name} ${student.last_name}:`, err.message)
      errorCount++
    }
  }

  console.log('\nMigration complete.')
  console.log(`Successfully updated: ${successCount}`)
  console.log(`Failed: ${errorCount}`)
}

migrateStudentLogins()
