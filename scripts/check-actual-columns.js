const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmZ3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkColumns() {
  console.log('Checking actual table columns...\n')
  
  // Get a score with teacher_id to see columns
  const { data: score } = await supabase
    .from('scores')
    .select('*')
    .limit(1)
  
  if (score && score.length > 0) {
    console.log('SCORES columns:', Object.keys(score[0]).join(', '))
  }
  
  // Get attendance
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .limit(1)
  
  if (attendance && attendance.length > 0) {
    console.log('ATTENDANCE columns:', Object.keys(attendance[0]).join(', '))
  } else {
    console.log('ATTENDANCE: No records (checking schema differently...)')
    // Try to insert and rollback to see schema
  }
  
  // Get assessments
  const { data: assessment } = await supabase
    .from('assessments')
    .select('*')
    .limit(1)
  
  if (assessment && assessment.length > 0) {
    console.log('ASSESSMENTS columns:', Object.keys(assessment[0]).join(', '))
  } else {
    console.log('ASSESSMENTS: No records')
  }
}

checkColumns()
