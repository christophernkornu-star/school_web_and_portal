require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkStudentsDetailed() {
  console.log('=== Checking Students Table ===\n')
  
  // Check all students (no filter)
  const { data: allData, count: allCount, error: allError } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
  
  console.log('Total students (no filter):', allCount)
  console.log('Error:', allError)
  console.log('Sample (first 3):', JSON.stringify(allData?.slice(0, 3), null, 2))
  
  if (allCount > 0) {
    // Check Basic 8 students
    const basic8ClassId = '4e955a2e-a77c-4ea5-ace0-e95c79ce824e'
    const { data: basic8Data, count: basic8Count } = await supabase
      .from('students')
      .select('id, student_id, first_name, last_name, class_id, status', { count: 'exact' })
      .eq('class_id', basic8ClassId)
    
    console.log('\nBasic 8 students:', basic8Count)
    console.log('Basic 8 sample:', JSON.stringify(basic8Data?.slice(0, 3), null, 2))
  }
}

checkStudentsDetailed().then(() => process.exit(0))
