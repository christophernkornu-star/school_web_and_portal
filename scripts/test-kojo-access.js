const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testWithKojo() {
  console.log('Testing with Kojo Lamptey credentials...\n')

  // Try login with username
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'efe.lamptey@example.com',
    password: '28-02-2016'
  })

  if (authError) {
    console.error('✗ Login failed:', authError.message)
    return
  }

  console.log('✓ Logged in successfully')
  console.log('User ID:', authData.user.id)
  console.log('Expected profile_id: 1e523147-4515-4c43-bf69-d1c22e4ec38b')
  console.log('Match:', authData.user.id === '1e523147-4515-4c43-bf69-d1c22e4ec38b' ? 'YES' : 'NO')

  // Test query
  console.log('\n Testing students table query...')
  const { data, error } = await supabase
    .from('students')
    .select('id, first_name, last_name, profile_id')
    .eq('profile_id', authData.user.id)

  if (error) {
    console.error('✗ Query error:', error.message)
    console.error('Error details:', JSON.stringify(error, null, 2))
  } else {
    console.log('✓ Query successful!')
    console.log('Data:', data)
  }

  await supabase.auth.signOut()
}

testWithKojo()
