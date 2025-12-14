require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkStudents() {
  console.log('=== Checking Students ===\n')
  
  // Check total students
  const { data: allStudents, count } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .limit(5)
  
  console.log(`Total students: ${count}`)
  console.log('Sample students:', JSON.stringify(allStudents, null, 2))
  
  // Group by class_id
  const { data: byClass } = await supabase
    .from('students')
    .select('class_id')
  
  const grouped = {}
  byClass?.forEach(s => {
    grouped[s.class_id] = (grouped[s.class_id] || 0) + 1
  })
  console.log('\nStudents grouped by class_id:', grouped)
}

checkStudents().then(() => process.exit(0))
