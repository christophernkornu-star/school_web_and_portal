// Check all policies on scores table using service role
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkPolicies() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'scores')
  
  console.log('=== ALL POLICIES ON SCORES TABLE ===')
  console.log('Total policies:', data?.length)
  console.log('Error:', error)
  console.log('\nPolicies:')
  data?.forEach(p => {
    console.log(`\nName: ${p.policyname}`)
    console.log(`  Command: ${p.cmd}`)
    console.log(`  Roles: ${p.roles}`)
    console.log(`  Using: ${p.qual?.substring(0, 100)}...`)
    console.log(`  With Check: ${p.with_check?.substring(0, 100) || 'N/A'}...`)
  })
}

checkPolicies()
