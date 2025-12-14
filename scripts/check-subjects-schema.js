const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSubjects() {
  console.log('Checking subjects table schema...\n')
  
  // Get one subject to see available columns
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('Available columns in subjects table:')
    console.log(Object.keys(data[0]))
    console.log('\nSample subject:')
    console.log(JSON.stringify(data[0], null, 2))
  } else {
    console.log('No subjects found')
  }
  
  // Try to get all subjects
  const { data: allData, error: allError } = await supabase
    .from('subjects')
    .select('*')
  
  if (allError) {
    console.error('\nError fetching all subjects:', allError)
  } else {
    console.log(`\nTotal subjects: ${allData.length}`)
  }
}

checkSubjects()
