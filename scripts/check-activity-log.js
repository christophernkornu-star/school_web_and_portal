const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkActivityLog() {
  console.log('Checking for activity_log table...\n')
  
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Error (table may not exist):', error.message)
  } else {
    console.log('✅ Activity log table exists!')
    console.log('Sample records:', JSON.stringify(data, null, 2))
  }
}

checkActivityLog()
