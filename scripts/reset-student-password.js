require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function resetStudentPassword() {
  const email = 'mensah.quaye@example.com'
  const newPassword = 'Student123!'

  console.log(`Resetting password for ${email}...`)

  // Get the user by email
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
  
  const user = users?.find(u => u.email === email)
  
  if (!user) {
    console.log('❌ User not found')
    return
  }

  console.log('User ID:', user.id)

  // Update password
  const { data, error } = await supabase.auth.admin.updateUserById(
    user.id,
    { password: newPassword }
  )

  if (error) {
    console.log('❌ Error:', error.message)
  } else {
    console.log('✅ Password reset successfully!')
    console.log(`   Login: ${email}`)
    console.log(`   Password: ${newPassword}`)
  }
}

resetStudentPassword().catch(console.error)
