require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSetup() {
  console.log('Checking attendance system setup...\n')

  // Check if student_attendance table exists
  const { data: attendance, error: attError } = await supabase
    .from('student_attendance')
    .select('*')
    .limit(1)

  console.log('1. student_attendance table:', attError ? '❌ NOT FOUND' : '✅ EXISTS')
  if (attError) console.log('   Error:', attError.message)

  // Check if total_days column exists
  const { data: terms, error: termsError } = await supabase
    .from('academic_terms')
    .select('id, name, total_days')
    .limit(1)

  console.log('2. academic_terms.total_days column:', 
    (!termsError && terms && terms.length > 0 && 'total_days' in terms[0]) ? '✅ EXISTS' : '❌ NOT FOUND')
  
  if (terms && terms.length > 0) {
    console.log('   Sample term:', terms[0])
  }

  // Check if any attendance records exist
  const { data: records, error: recordsError } = await supabase
    .from('student_attendance')
    .select('*')

  console.log('\n3. Attendance records count:', 
    recordsError ? '❌ ERROR' : `✅ ${records?.length || 0} records`)

  if (records && records.length > 0) {
    console.log('   Sample record:', records[0])
  }

  // Get current user's student info
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: student } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('profile_id', user.id)
      .single()

    if (student) {
      console.log('\n4. Current student:', student)
      
      const { data: studentRecords } = await supabase
        .from('student_attendance')
        .select(`
          *,
          academic_terms(name, academic_year, total_days),
          classes(name)
        `)
        .eq('student_id', student.id)

      console.log('   Student attendance records:', studentRecords?.length || 0)
      if (studentRecords && studentRecords.length > 0) {
        console.log('   Records:', JSON.stringify(studentRecords, null, 2))
      }
    }
  }
}

checkSetup().catch(console.error)
