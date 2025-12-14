const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyRLSPolicies() {
  console.log('Applying RLS policies...\n')
  
  const sql = fs.readFileSync('./database/fix-rls-policies.sql', 'utf8')
  
  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (statement.length === 0) continue
    
    console.log('Executing:', statement.substring(0, 100) + '...')
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
    
    if (error) {
      console.error('Error:', error.message)
    } else {
      console.log('✓ Success\n')
    }
  }
  
  console.log('Done! Teachers should now be able to view students.')
}

applyRLSPolicies()
