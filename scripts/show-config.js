const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function showConfiguration() {
  console.log('='.repeat(60))
  console.log('SYSTEM CONFIGURATION VERIFICATION')
  console.log('='.repeat(60))
  
  // 1. System Settings
  console.log('\n📋 SYSTEM SETTINGS:')
  console.log('-'.repeat(60))
  const { data: settings } = await supabase
    .from('system_settings')
    .select('*')
    .in('setting_key', ['current_academic_year', 'current_term'])
  
  const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]))
  console.log(`Academic Year (from system_settings): ${settingsMap.get('current_academic_year')}`)
  console.log(`Current Term ID (from system_settings): ${settingsMap.get('current_term')}`)
  
  // 2. Current Term Details
  console.log('\n📅 CURRENT TERM DETAILS:')
  console.log('-'.repeat(60))
  const currentTermId = settingsMap.get('current_term')
  if (currentTermId) {
    const { data: currentTerm } = await supabase
      .from('academic_terms')
      .select('*')
      .eq('id', currentTermId)
      .single()
    
    if (currentTerm) {
      console.log(`Term Name: ${currentTerm.name}`)
      console.log(`Academic Year (from term record): ${currentTerm.academic_year}`)
      console.log(`Start Date: ${currentTerm.start_date}`)
      console.log(`End Date: ${currentTerm.end_date}`)
      console.log(`Is Current: ${currentTerm.is_current}`)
      console.log(`\n✨ This will display as: "${currentTerm.name} (${currentTerm.academic_year})"`)
    }
  } else {
    console.log('❌ No current term set!')
  }
  
  // 3. All Academic Terms
  console.log('\n📚 ALL ACADEMIC TERMS:')
  console.log('-'.repeat(60))
  const { data: allTerms } = await supabase
    .from('academic_terms')
    .select('*')
    .order('academic_year', { ascending: false })
  
  allTerms?.forEach(t => {
    const indicator = t.id === currentTermId ? '👉 ' : '   '
    console.log(`${indicator}${t.name} (${t.academic_year}) - ${t.start_date} to ${t.end_date}`)
  })
  
  // 4. Classes
  console.log('\n🏫 CLASSES:')
  console.log('-'.repeat(60))
  const { data: classes } = await supabase
    .from('classes')
    .select('name')
    .order('name')
  
  classes?.forEach(c => {
    console.log(`   - ${c.name}`)
  })
  
  console.log('\n' + '='.repeat(60))
  console.log('END OF CONFIGURATION REPORT')
  console.log('='.repeat(60))
}

showConfiguration()
