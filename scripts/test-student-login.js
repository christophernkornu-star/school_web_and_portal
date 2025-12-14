require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testStudentLogin() {
  const studentId = 'STU2030'
  const email = 'ama.mensah@example.com'
  
  console.log('\n=== Testing Student Login ===')
  console.log('Username:', studentId)
  console.log('Email:', email)
  
  // Check if user can sign in (we'll test with a known password)
  console.log('\nTo test login, use these credentials in the login page:')
  console.log('Username: STU2030')
  console.log('Password: <the password set when creating this user>')
  
  // Check the student record
  const { data: student } = await supabase
    .from('students')
    .select('*, profiles(*), classes(*)')
    .eq('student_id', studentId)
    .single()
  
  if (student) {
    console.log('\n✅ Student record exists:')
    console.log('Name:', student.first_name, student.last_name)
    console.log('Class:', student.classes?.name)
    console.log('Profile ID:', student.profile_id)
    console.log('Email:', student.profiles?.email)
  } else {
    console.log('\n❌ No student record found')
  }
  
  // Reset password for testing
  console.log('\n=== Resetting password for testing ===')
  try {
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      student.profile_id,
      { password: 'Student123!' }
    )
    
    if (updateError) {
      console.error('Error resetting password:', updateError.message)
    } else {
      console.log('✅ Password reset successfully!')
      console.log('\nYou can now login with:')
      console.log('Username: STU2030')
      console.log('Password: Student123!')
    }
  } catch (err) {
    console.error('Error:', err.message)
  }
}

testStudentLogin().catch(console.error).finally(() => process.exit(0))
