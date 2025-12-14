const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStudentData() {
  console.log('Checking student Kojo Lamptey data...\n')

  // Get Kojo's profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', 'kojo.lamptey@student.biriwamethodist.edu.gh')
    .single()

  if (profileError) {
    console.log('Profile not found with that email, checking students table...')
    
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('*, profiles(*)')
      .or('first_name.ilike.%kojo%,last_name.ilike.%lamptey%')
    
    if (studentsError) {
      console.error('Error:', studentsError)
    } else {
      console.log('Found students:', JSON.stringify(students, null, 2))
    }
  } else {
    console.log('Profile found:', profile)
    
    // Get student record
    const { data: student, error: studentError } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('profile_id', profile.id)
      .single()
    
    if (studentError) {
      console.error('Student error:', studentError)
    } else {
      console.log('\nStudent record:', student)
    }
  }

  // Check RLS policies on students table
  console.log('\n\nChecking RLS policies on students table...')
  const { data: policies, error: policiesError } = await supabaseAdmin
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'students')

  if (policiesError) {
    console.error('Cannot query policies:', policiesError.message)
  } else {
    console.log(`Found ${policies?.length || 0} policies:`)
    policies?.forEach(p => {
      console.log(`- ${p.policyname}: ${p.cmd}`)
    })
  }
}

checkStudentData()
