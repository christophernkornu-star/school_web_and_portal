require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
  // First check profiles
  console.log('=== Checking profiles table ===')
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(5)
  
  console.log('Profiles:', JSON.stringify(profilesData, null, 2))
  if (profilesError) console.log('Profiles Error:', profilesError)
  
  // Then check students
  console.log('\n=== Checking students table ===')
  const { data, error } = await supabase
    .from('students')
    .select('student_id, profile_id')
    .limit(5)
  
  console.log('Students:', JSON.stringify(data, null, 2))
  if (error) console.log('Students Error:', error)
}

check().then(() => process.exit(0))
