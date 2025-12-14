const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://okfawhokrtkaibhbcjdk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'

const supabase = createClient(supabaseUrl, supabaseKey)

async function syncAcademicYear() {
  console.log('Syncing academic year across all terms...\n')
  
  // Get the academic year from system_settings
  const { data: yearSetting } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'current_academic_year')
    .single()
  
  if (!yearSetting) {
    console.error('❌ No academic year found in system_settings')
    return
  }
  
  const academicYear = yearSetting.setting_value
  console.log(`Academic year from system_settings: ${academicYear}`)
  
  // Update all academic terms with this year
  const { data: updatedTerms, error } = await supabase
    .from('academic_terms')
    .update({ academic_year: academicYear })
    .neq('academic_year', academicYear)
    .select()
  
  if (error) {
    console.error('❌ Error updating terms:', error)
    return
  }
  
  if (updatedTerms && updatedTerms.length > 0) {
    console.log(`\n✅ Updated ${updatedTerms.length} term(s) to academic year: ${academicYear}`)
    updatedTerms.forEach(t => {
      console.log(`  - ${t.name}`)
    })
  } else {
    console.log('\n✅ All terms already have the correct academic year')
  }
  
  // Verify
  console.log('\n--- Verification: All Terms ---')
  const { data: allTerms } = await supabase
    .from('academic_terms')
    .select('*')
    .order('name')
  
  allTerms?.forEach(t => {
    console.log(`${t.name} - Academic Year: ${t.academic_year}`)
  })
}

syncAcademicYear()
