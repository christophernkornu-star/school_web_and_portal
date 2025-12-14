const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testAssessments() {
  console.log('Testing assessments queries...\n')
  
  // Test 1: Get all columns
  console.log('1. Get all assessments (all columns):')
  const { data: all, error: allError } = await supabase
    .from('assessments')
    .select('*')
    .limit(1)
  
  if (allError) {
    console.error('❌ Error:', allError.message)
  } else if (all && all.length > 0) {
    console.log('✅ Columns:', Object.keys(all[0]).join(', '))
    console.log('Sample:', JSON.stringify(all[0], null, 2))
  } else {
    console.log('⚠️  No records found')
  }
  
  // Test 2: Try with teacher_id filter
  console.log('\n2. Try with teacher_id filter:')
  const testTeacherId = '7e05f750-4dbc-43c9-a348-00b78f8280e9'
  const { data: filtered, error: filteredError } = await supabase
    .from('assessments')
    .select('*')
    .eq('teacher_id', testTeacherId)
    .limit(1)
  
  if (filteredError) {
    console.error('❌ Error:', filteredError.message)
  } else {
    console.log('✅ Success - Found', filtered?.length || 0, 'records')
  }
  
  // Test 3: Try specific columns one by one
  console.log('\n3. Testing individual columns:')
  const testColumns = ['id', 'created_at', 'assessment_name', 'title', 'name', 'subject_id', 'class_id', 'teacher_id']
  
  for (const col of testColumns) {
    const { error } = await supabase
      .from('assessments')
      .select(col)
      .limit(1)
    
    if (error) {
      console.log(`❌ ${col}: does not exist`)
    } else {
      console.log(`✅ ${col}: exists`)
    }
  }
}

testAssessments()
