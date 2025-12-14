require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAttendanceTable() {
  console.log('Checking student_attendance table structure...\n')

  // Try a simple query to see what columns exist
  const { data: sample, error: sampleError } = await supabase
    .from('student_attendance')
    .select('*')
    .limit(1)

  if (sampleError) {
    console.error('Error querying student_attendance:', sampleError)
  } else {
    console.log('Sample record structure:')
    if (sample && sample.length > 0) {
      console.log(JSON.stringify(sample[0], null, 2))
      console.log('\nAvailable columns:')
      console.log(Object.keys(sample[0]).join(', '))
    } else {
      console.log('No records found in student_attendance table')
    }
  }

  // Check if the query from the dashboard would work
  console.log('\n\nTesting the query from dashboard...')
  
  const testStudentIds = ['test-id-1', 'test-id-2']
  const testTermId = '8db2b137-a264-4d30-9549-70eb316d8103'
  
  const { data: testData, error: testError } = await supabase
    .from('student_attendance')
    .select('days_present, days_absent')
    .in('student_id', testStudentIds)
    .eq('term_id', testTermId)

  if (testError) {
    console.error('Test query error:', testError)
  } else {
    console.log('Test query successful! Returned', testData?.length || 0, 'records')
  }
}

checkAttendanceTable()
