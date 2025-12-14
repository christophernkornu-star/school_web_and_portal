const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkClasses() {
  console.log('Checking classes table...\n')
  
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log('Classes in database:')
  data.forEach(cls => {
    console.log(`- ID: ${cls.id}, Name: ${cls.name}`)
  })
  
  console.log('\n--- Classes that need updating ---')
  data.forEach(cls => {
    if (cls.name.includes('Primary') || cls.name.includes('JHS')) {
      console.log(`${cls.name} should be renamed`)
    }
  })
}

checkClasses()
