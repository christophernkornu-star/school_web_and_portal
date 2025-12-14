require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkAcademicSettings() {
  console.log('Checking academic_settings table...\n')
  
  const { data, error } = await supabase
    .from('academic_settings')
    .select('*')
    .single()
  
  if (error) {
    console.log('❌ Error:', error.message)
    console.log('\nThe academic_settings table may not exist.')
    console.log('You need to run the migration: database/add-settings-tables.sql')
    return
  }
  
  if (!data) {
    console.log('❌ No data found in academic_settings table')
    return
  }
  
  console.log('✅ Academic Settings found:')
  console.log('  ID:', data.id)
  console.log('  Current Academic Year:', data.current_academic_year || 'Not set')
  console.log('  Current Term:', data.current_term || 'Not set')
  console.log('  Term Start Date:', data.term_start_date || 'Not set')
  console.log('  Term End Date:', data.term_end_date || 'Not set')
  console.log('  Vacation Start Date:', data.vacation_start_date || '❌ NOT SET')
  console.log('  School Reopening Date:', data.school_reopening_date || '❌ NOT SET')
  console.log('  Next Term Starts:', data.next_term_starts || 'Not set')
  
  if (!data.vacation_start_date || !data.school_reopening_date) {
    console.log('\n⚠️ ACTION REQUIRED:')
    console.log('The vacation and reopening dates are not set.')
    console.log('\nRun this SQL in Supabase SQL Editor to set them:\n')
    console.log(`UPDATE academic_settings SET 
  vacation_start_date = '2024-12-20',
  school_reopening_date = '2025-01-13'
WHERE id = '${data.id}';`)
    console.log('\nOr adjust the dates as needed.')
  } else {
    console.log('\n✅ All dates are set!')
  }
}

checkAcademicSettings()
