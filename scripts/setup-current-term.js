const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addCurrentTermSetting() {
  console.log('Setting up current_term in system_settings...\n')
  
  // Get the first term (Term 1, 2024/2025)
  const { data: terms } = await supabase
    .from('academic_terms')
    .select('*')
    .order('academic_year', { ascending: false })
    .limit(1)
  
  if (!terms || terms.length === 0) {
    console.error('❌ No terms found')
    return
  }
  
  const currentTerm = terms[0]
  console.log(`Using term: ${currentTerm.name} (${currentTerm.academic_year})`)
  console.log(`Term ID: ${currentTerm.id}\n`)
  
  // Check if current_term setting exists
  const { data: existing } = await supabase
    .from('system_settings')
    .select('*')
    .eq('setting_key', 'current_term')
    .maybeSingle()
  
  if (existing) {
    console.log('Current term setting already exists. Updating...')
    const { error } = await supabase
      .from('system_settings')
      .update({ 
        setting_value: currentTerm.id,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'current_term')
    
    if (error) {
      console.error('❌ Error updating:', error)
    } else {
      console.log('✅ Updated current_term setting')
    }
  } else {
    console.log('Creating new current_term setting...')
    const { error } = await supabase
      .from('system_settings')
      .insert({
        setting_key: 'current_term',
        setting_value: currentTerm.id,
        setting_type: 'uuid',
        description: 'Currently active academic term'
      })
    
    if (error) {
      console.error('❌ Error inserting:', error)
    } else {
      console.log('✅ Created current_term setting')
    }
  }
  
  // Verify
  console.log('\n--- Verification ---')
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
  
  console.log('All system settings:')
  settings?.forEach(s => {
    console.log(`- ${s.setting_key}: ${s.setting_value}`)
  })
}

addCurrentTermSetting()
