const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testClassesJoin() {
  console.log('Testing classes join in students query...\n')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'efe.lamptey@example.com',
    password: '28-02-2016'
  })

  if (authError) {
    console.error('Login failed:', authError.message)
    return
  }

  console.log('✓ Logged in as Kojo')

  // Test without join
  console.log('\n1. Query WITHOUT classes join:')
  const { data: data1, error: error1 } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .eq('profile_id', authData.user.id)
    .single()

  if (error1) {
    console.error('✗ Error:', error1.message)
  } else {
    console.log('✓ Success:', data1)
  }

  // Test with join (name only)
  console.log('\n2. Query WITH classes(name) join:')
  const { data: data2, error: error2 } = await supabase
    .from('students')
    .select('id, first_name, last_name, classes(name)')
    .eq('profile_id', authData.user.id)
    .single()

  if (error2) {
    console.error('✗ Error:', error2.message)
    console.error('Details:', error2)
  } else {
    console.log('✓ Success:', data2)
  }

  // Test with join (name, section)
  console.log('\n3. Query WITH classes(name, section) join:')
  const { data: data3, error: error3 } = await supabase
    .from('students')
    .select(`
      id,
      first_name,
      last_name,
      classes (name, section)
    `)
    .eq('profile_id', authData.user.id)
    .single()

  if (error3) {
    console.error('✗ Error:', error3.message)
    console.error('Details:', error3)
  } else {
    console.log('✓ Success:', data3)
  }

  await supabase.auth.signOut()
}

testClassesJoin()
