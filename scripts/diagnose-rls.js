require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function diagnoseRLS() {
  console.log('=== Diagnosing RLS Policies ===\n')

  // Check current policies
  const { data: policies, error: policiesError } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'students')

  if (policiesError) {
    console.error('Error fetching policies:', policiesError.message)
  } else if (policies && policies.length > 0) {
    console.log('Current policies on students table:')
    policies.forEach(policy => {
      console.log(`\n- ${policy.policyname}`)
      console.log(`  Command: ${policy.cmd}`)
      console.log(`  Roles: ${policy.roles}`)
    })
  } else {
    console.log('❌ No RLS policies found on students table!')
  }

  // Test access for the student
  console.log('\n\n=== Testing Student Access ===\n')
  
  // First, verify the student exists
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, student_id, profile_id, first_name, last_name')
    .eq('student_id', 'STU2030')
    .single()

  if (studentError) {
    console.error('Error fetching student:', studentError.message)
    return
  }

  console.log('Student found:', {
    id: student.id,
    student_id: student.student_id,
    name: `${student.first_name} ${student.last_name}`,
    profile_id: student.profile_id
  })

  // Now test if they can access their own record when authenticated
  console.log('\n=== Solution ===\n')
  console.log('The 400 error means RLS is blocking the query.')
  console.log('You need to run the SQL commands in: scripts/fix-student-rls.sql')
  console.log('\nSteps:')
  console.log('1. Open Supabase Dashboard')
  console.log('2. Go to SQL Editor')
  console.log('3. Copy contents of scripts/fix-student-rls.sql')
  console.log('4. Paste and run in SQL Editor')
  console.log('5. Try logging in again as student')
}

diagnoseRLS().catch(console.error).finally(() => process.exit(0))
