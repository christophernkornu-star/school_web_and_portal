const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTermSettings() {
  console.log('Checking system settings for current term...\n')
  
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')
    .limit(1)
  
  if (settingsError) {
    console.error('Error fetching settings:', settingsError)
    return
  }
  
  console.log('System Settings:')
  console.log(JSON.stringify(settings, null, 2))
  
  if (settings.current_term) {
    console.log('\n--- Fetching term details ---')
    const { data: term, error: termError } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('id', settings.current_term)
      .single()
    
    if (termError) {
      console.error('Error fetching term:', termError)
    } else {
      console.log('Current Term Details:')
      console.log(JSON.stringify(term, null, 2))
    }
  }
  
  console.log('\n--- All Academic Terms ---')
  const { data: allTerms, error: termsError } = await supabase
    .from('academic_terms')
    .select('*')
    .order('academic_year', { ascending: false })
  
  if (termsError) {
    console.error('Error fetching terms:', termsError)
  } else {
    allTerms.forEach(t => {
      console.log(`${t.name} (${t.academic_year}) - ID: ${t.id}`)
    })
  }
}

checkTermSettings()
