const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testStudentAccess() {
  console.log('Testing student report card access...\n')

  // Login as Kojo Lamptey
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'kojo.lamptey@student.biriwamethodist.edu.gh',
    password: '28-02-2016'
  })

  if (authError) {
    console.error('Login failed:', authError.message)
    return
  }

  console.log('✓ Logged in as Kojo Lamptey')
  console.log('User ID:', authData.user.id)

  // Test direct query to students table
  console.log('\n1. Testing direct students query...')
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, first_name, last_name, profile_id, class_id')
    .eq('profile_id', authData.user.id)
    .single()

  if (studentError) {
    console.error('✗ Error:', studentError.message)
    console.error('Details:', studentError)
  } else {
    console.log('✓ Student found:', student)
  }

  // Test with classes join
  console.log('\n2. Testing students query with classes join...')
  const { data: studentWithClass, error: joinError } = await supabase
    .from('students')
    .select(`
      id,
      first_name,
      last_name,
      classes (name, section)
    `)
    .eq('profile_id', authData.user.id)
    .single()

  if (joinError) {
    console.error('✗ Error:', joinError.message)
    console.error('Details:', joinError)
  } else {
    console.log('✓ Student with class found:', studentWithClass)
  }

  // Check RLS policies
  console.log('\n3. Checking students table RLS policies...')
  const { data: policies, error: policiesError } = await supabase
    .rpc('exec_sql', {
      query: `SELECT * FROM pg_policies WHERE tablename = 'students'`
    })
    .catch(() => {
      // If RPC not available, we can't check policies from client
      console.log('Note: Cannot check policies from client (requires admin access)')
      return { data: null, error: null }
    })

  await supabase.auth.signOut()
}

testStudentAccess()
