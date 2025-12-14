require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixStudentAuth() {
  console.log('Checking Araba Quaye authentication...\n')

  // Get the student
  const { data: student } = await supabase
    .from('students')
    .select('*, profiles(*)')
    .eq('first_name', 'Araba')
    .eq('last_name', 'Quaye')
    .single()

  if (!student) {
    console.log('❌ Student not found')
    return
  }

  console.log('Student:', {
    id: student.id,
    name: `${student.first_name} ${student.last_name}`,
    student_id: student.student_id,
    profile_id: student.profile_id
  })

  console.log('\nProfile:', {
    id: student.profiles?.id,
    email: student.profiles?.email,
    username: student.profiles?.username,
    role: student.profiles?.role
  })

  // Get auth user
  const { data: { users } } = await supabase.auth.admin.listUsers()
  const authUser = users.find(u => u.id === student.profile_id)

  if (!authUser) {
    console.log('\n❌ No auth user found!')
    return
  }

  console.log('\nAuth User:', {
    id: authUser.id,
    email: authUser.email,
    email_confirmed: authUser.email_confirmed_at ? 'Yes' : 'No',
    created_at: authUser.created_at
  })

  // Check if email is confirmed
  if (!authUser.email_confirmed_at) {
    console.log('\n⚠️ Email not confirmed, confirming now...')
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      email_confirm: true
    })
    if (error) {
      console.log('❌ Error confirming email:', error.message)
    } else {
      console.log('✅ Email confirmed')
    }
  }

  // Reset password to ensure it works
  console.log('\n🔧 Resetting password...')
  const newPassword = 'Student123!'
  const { error: pwdError } = await supabase.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
    email_confirm: true
  })

  if (pwdError) {
    console.log('❌ Error setting password:', pwdError.message)
  } else {
    console.log('✅ Password set successfully')
  }

  // Test login with email
  console.log('\n🧪 Testing login with email...')
  const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
    email: authUser.email,
    password: newPassword
  })

  if (loginError) {
    console.log('❌ Email login failed:', loginError.message)
  } else {
    console.log('✅ Email login works!')
    await supabase.auth.signOut()
  }

  console.log('\n' + '='.repeat(50))
  console.log('LOGIN CREDENTIALS:')
  console.log('='.repeat(50))
  console.log('Username:', student.profiles?.username)
  console.log('Email:   ', authUser.email)
  console.log('Password:', newPassword)
  console.log('='.repeat(50))
}

fixStudentAuth().catch(console.error)
