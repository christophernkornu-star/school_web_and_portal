const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getStudentLoginInfo() {
  // Get Basic 3 class
  const { data: basicClass } = await supabase
    .from('classes')
    .select('id')
    .eq('name', 'Basic 3')
    .single()
  
  if (!basicClass) {
    console.log('Basic 3 class not found')
    return
  }
  
  // Get all students in Basic 3 with their actual profile data
  const { data: students } = await supabase
    .from('students')
    .select('first_name, last_name, date_of_birth, student_id, profile_id, profiles(username, email)')
    .eq('class_id', basicClass.id)
    .order('first_name')
  
  console.log('\n=== BASIC 3 STUDENT LOGIN CREDENTIALS ===\n')
  console.log('Login at: http://localhost:3000/login?portal=student\n')
  console.log('=' .repeat(70) + '\n')
  
  students?.forEach((s, index) => {
    // Use actual username from profiles table
    const username = s.profiles?.username || 'NO PROFILE'
    
    // Format DOB as DD-MM-YYYY
    let password = 'Unknown'
    if (s.date_of_birth) {
      const date = new Date(s.date_of_birth)
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = date.getFullYear()
      password = `${day}-${month}-${year}`
    }
    
    console.log(`${index + 1}. ${s.first_name} ${s.last_name} (${s.student_id})`)
    console.log(`   👤 Username: ${username}`)
    console.log(`   🔑 Password: ${password}`)
    console.log('')
  })
  
  console.log('=' .repeat(70))
}

getStudentLoginInfo()
