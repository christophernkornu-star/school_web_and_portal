const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchemas() {
  console.log('='.repeat(60))
  console.log('CHECKING TABLE SCHEMAS')
  console.log('='.repeat(60))
  
  // Check scores table
  console.log('\n📊 SCORES TABLE:')
  console.log('-'.repeat(60))
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('*')
    .limit(1)
  
  if (scoresError) {
    console.error('Error:', scoresError.message)
  } else if (scores && scores.length > 0) {
    console.log('Columns:', Object.keys(scores[0]).join(', '))
  } else {
    console.log('No records found')
  }
  
  // Check attendance table
  console.log('\n📅 ATTENDANCE TABLE:')
  console.log('-'.repeat(60))
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('*')
    .limit(1)
  
  if (attendanceError) {
    console.error('Error:', attendanceError.message)
  } else if (attendance && attendance.length > 0) {
    console.log('Columns:', Object.keys(attendance[0]).join(', '))
  } else {
    console.log('No records found')
  }
  
  // Check assessments table
  console.log('\n📝 ASSESSMENTS TABLE:')
  console.log('-'.repeat(60))
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('*')
    .limit(1)
  
  if (assessmentsError) {
    console.error('Error:', assessmentsError.message)
  } else if (assessments && assessments.length > 0) {
    console.log('Columns:', Object.keys(assessments[0]).join(', '))
  } else {
    console.log('No records found')
  }
  
  console.log('\n' + '='.repeat(60))
}

checkSchemas()
