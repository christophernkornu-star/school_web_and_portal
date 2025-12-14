const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueries() {
  console.log('Testing table queries...\n')
  
  // Test scores
  console.log('1. SCORES TABLE:')
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select('id, created_at, subject_id, class_id')
    .limit(1)
  
  if (scoresError) {
    console.error('❌ Error:', scoresError.message)
  } else {
    console.log('✅ Query successful')
    if (scores && scores.length > 0) {
      console.log('Sample:', JSON.stringify(scores[0], null, 2))
    } else {
      console.log('No records')
    }
  }
  
  // Test attendance
  console.log('\n2. ATTENDANCE TABLE:')
  const { data: attendance, error: attendanceError } = await supabase
    .from('attendance')
    .select('id, created_at, class_id')
    .limit(1)
  
  if (attendanceError) {
    console.error('❌ Error:', attendanceError.message)
  } else {
    console.log('✅ Query successful')
    if (attendance && attendance.length > 0) {
      console.log('Sample:', JSON.stringify(attendance[0], null, 2))
    } else {
      console.log('No records')
    }
  }
  
  // Test assessments
  console.log('\n3. ASSESSMENTS TABLE:')
  const { data: assessments, error: assessmentsError } = await supabase
    .from('assessments')
    .select('id, created_at, title, subject_id')
    .limit(1)
  
  if (assessmentsError) {
    console.error('❌ Error:', assessmentsError.message)
  } else {
    console.log('✅ Query successful')
    if (assessments && assessments.length > 0) {
      console.log('Sample:', JSON.stringify(assessments[0], null, 2))
    } else {
      console.log('No records')
    }
  }
  
  // Test with teacher_id filter
  console.log('\n4. TESTING WITH teacher_id FILTER:')
  const testTeacherId = '7e05f750-4dbc-43c9-a348-00b78f8280e9'
  
  const { data: scoresFiltered, error: scoresFilterError } = await supabase
    .from('scores')
    .select('*')
    .eq('teacher_id', testTeacherId)
    .limit(1)
  
  if (scoresFilterError) {
    console.error('❌ Scores with teacher_id:', scoresFilterError.message)
  } else {
    console.log('✅ Scores with teacher_id: Query successful')
    if (scoresFiltered && scoresFiltered.length > 0) {
      console.log('Columns:', Object.keys(scoresFiltered[0]).join(', '))
    }
  }
}

testQueries()
