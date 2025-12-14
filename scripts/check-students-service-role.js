require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function checkWithServiceRole() {
  console.log('Checking students with SERVICE ROLE KEY (bypasses RLS)...\n')
  
  const { data, count, error } = await serviceSupabase
    .from('students')
    .select('id, student_id, class_id, status', { count: 'exact' })
  
  console.log('Total students:', count)
  console.log('Error:', error)
  console.log('Sample data:', JSON.stringify(data?.slice(0, 5), null, 2))
}

checkWithServiceRole().then(() => process.exit(0))
