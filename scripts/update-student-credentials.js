require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateUsername(firstName, lastName) {
  const first3 = firstName.substring(0, 3).toLowerCase()
  const last3 = lastName.substring(lastName.length - 3).toLowerCase()
  return first3 + last3
}

function formatDatePassword(dateOfBirth) {
  // Convert YYYY-MM-DD to DD-MM-YYYY
  const date = new Date(dateOfBirth)
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

async function updateAllStudentCredentials() {
  console.log('Updating all student credentials...\n')

  // Get all students
  const { data: students, error } = await supabase
    .from('students')
    .select('*, profiles(*)')
    .order('first_name')

  if (error) {
    console.error('Error fetching students:', error)
    return
  }

  console.log(`Found ${students.length} students\n`)

  const updates = []

  for (const student of students) {
    const newUsername = generateUsername(student.first_name, student.last_name)
    const newPassword = formatDatePassword(student.date_of_birth)

    console.log(`Processing: ${student.first_name} ${student.last_name}`)
    console.log(`  Old username: ${student.profiles?.username}`)
    console.log(`  New username: ${newUsername}`)
    console.log(`  New password: ${newPassword}`)

    // Update profile username
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ username: newUsername })
      .eq('id', student.profile_id)

    if (profileError) {
      console.log(`  ❌ Error updating profile: ${profileError.message}`)
      continue
    }

    // Update auth password
    const { error: authError } = await supabase.auth.admin.updateUserById(
      student.profile_id,
      { 
        password: newPassword,
        email_confirm: true
      }
    )

    if (authError) {
      console.log(`  ❌ Error updating password: ${authError.message}`)
      continue
    }

    console.log(`  ✅ Updated successfully\n`)

    updates.push({
      name: `${student.first_name} ${student.last_name}`,
      username: newUsername,
      password: newPassword,
      email: student.profiles?.email
    })
  }

  console.log('\n' + '='.repeat(80))
  console.log('UPDATED STUDENT CREDENTIALS')
  console.log('='.repeat(80))
  console.log('Format: Username = first 3 letters + last 3 letters')
  console.log('        Password = Date of birth (DD-MM-YYYY)')
  console.log('='.repeat(80) + '\n')

  updates.forEach(u => {
    console.log(`${u.name.padEnd(25)} | Username: ${u.username.padEnd(10)} | Password: ${u.password}`)
  })

  console.log('\n' + '='.repeat(80))
  console.log(`✅ Successfully updated ${updates.length} students`)
  console.log('='.repeat(80))
}

updateAllStudentCredentials().catch(console.error)
