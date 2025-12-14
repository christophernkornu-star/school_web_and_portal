require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStudent() {
  // Get a sample student
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name, profile_id, profiles(id, email, full_name)')
    .limit(5)
  
  if (studentsError) {
    console.error('Error fetching students:', studentsError)
    return
  }
  
  console.log('Sample students in database:')
  console.log(JSON.stringify(students, null, 2))
  
  if (students && students.length > 0) {
    const student = students[0]
    console.log('\n=== First Student Details ===')
    console.log('Student ID (number):', student.student_id)
    console.log('Database ID (UUID):', student.id)
    console.log('Profile ID:', student.profile_id)
    console.log('Email:', student.profiles?.email)
    console.log('Username should be:', student.student_id)
    
    // Check if auth user exists
    if (student.profile_id) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(student.profile_id)
      
      if (authError) {
        console.log('\nAuth user error:', authError.message)
      } else if (authUser) {
        console.log('\nAuth user exists:')
        console.log('- Email:', authUser.user.email)
        console.log('- Created:', authUser.user.created_at)
      } else {
        console.log('\nNo auth user found for this profile_id')
      }
    }
  } else {
    console.log('No students found in database')
  }
}

checkStudent().catch(console.error).finally(() => process.exit(0))
