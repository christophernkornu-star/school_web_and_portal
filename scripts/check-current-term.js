const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCurrentTerm() {
  console.log('Checking current term setup...\n')
  
  // Get current term ID from system_settings
  const { data: setting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'current_term')
    .single()
  
  console.log('Current term ID from system_settings:', setting?.setting_value)
  
  if (setting?.setting_value) {
    // Get the term details
    const { data: term } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('id', setting.setting_value)
      .single()
    
    console.log('\nCurrent Term Details:')
    console.log(JSON.stringify(term, null, 2))
  }
  
  // Get academic year from system_settings
  const { data: yearSetting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'current_academic_year')
    .single()
  
  console.log('\nCurrent academic year from system_settings:', yearSetting?.setting_value)
  
  // Show all terms
  console.log('\n--- All Academic Terms ---')
  const { data: allTerms } = await supabase
    .from('academic_terms')
    .select('*')
    .order('academic_year', { ascending: false })
  
  allTerms?.forEach(t => {
    console.log(`${t.name} (${t.academic_year}) - ID: ${t.id}`)
  })
}

checkCurrentTerm()
