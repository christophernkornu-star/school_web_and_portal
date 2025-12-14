require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCounts() {
  console.log('Checking database counts...\n')
  
  // Check students
  const { count: activeStudents, error: studentsError } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  console.log('Active Students:', activeStudents)
  if (studentsError) console.log('Students Error:', studentsError)
  
  // Check all students
  const { count: allStudents } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })
  
  console.log('Total Students (all statuses):', allStudents)
  
  // Check teachers
  const { count: activeTeachers, error: teachersError } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')
  
  console.log('Active Teachers:', activeTeachers)
  if (teachersError) console.log('Teachers Error:', teachersError)
  
  // Check all teachers
  const { count: allTeachers } = await supabase
    .from('teachers')
    .select('*', { count: 'exact', head: true })
  
  console.log('Total Teachers (all statuses):', allTeachers)
  
  // Check statistics settings
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .in('setting_key', ['founding_year', 'bece_pass_rate'])
  
  console.log('\nStatistics Settings:')
  settings?.forEach(s => {
    console.log(`  ${s.setting_key}: ${s.setting_value}`)
  })
}

checkCounts()
