const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateClassNames() {
  console.log('Updating class names from Primary/JHS to Basic 1-9...\n')
  
  const updates = [
    { old: 'Primary 1', new: 'Basic 1' },
    { old: 'Primary 2', new: 'Basic 2' },
    { old: 'Primary 3', new: 'Basic 3' },
    { old: 'Primary 4', new: 'Basic 4' },
    { old: 'Primary 5', new: 'Basic 5' },
    { old: 'Primary 6', new: 'Basic 6' },
    { old: 'JHS 1', new: 'Basic 7' },
    { old: 'JHS 2', new: 'Basic 8' },
    { old: 'JHS 3', new: 'Basic 9' }
  ]
  
  for (const update of updates) {
    const { data, error } = await supabase
      .from('classes')
      .update({ name: update.new })
      .eq('name', update.old)
      .select()
    
    if (error) {
      console.error(`❌ Error updating ${update.old}:`, error.message)
    } else if (data && data.length > 0) {
      console.log(`✅ Updated: ${update.old} → ${update.new}`)
    } else {
      console.log(`⚠️  No class found with name: ${update.old}`)
    }
  }
  
  console.log('\n--- Verification: Updated Classes ---')
  const { data: allClasses, error: fetchError } = await supabase
    .from('classes')
    .select('*')
    .order('name')
  
  if (fetchError) {
    console.error('Error fetching classes:', fetchError)
  } else {
    allClasses.forEach(cls => {
      console.log(`- ${cls.name}`)
    })
  }
}

updateClassNames()
