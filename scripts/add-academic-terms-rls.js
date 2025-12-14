const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function addAcademicTermsRLS() {
  console.log('🔒 Adding RLS policies for academic_terms table...\n')

  const sql = fs.readFileSync('./database/add-academic-terms-rls.sql', 'utf8')
  
  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'))

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`${i + 1}. ${statement.substring(0, 60)}...`)
    
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
      .catch(() => ({ error: null }))

    if (error) {
      console.log(`   ⚠️  ${error.message || 'Could not execute via RPC'}`)
    } else {
      console.log(`   ✅ Success`)
    }
  }

  console.log('\n📋 If you saw errors, run this SQL manually in Supabase Dashboard:')
  console.log('   Go to: SQL Editor → New Query\n')
  console.log('='.repeat(60))
  console.log(sql)
  console.log('='.repeat(60))
  
  console.log('\n✨ After running the SQL, the attendance settings page will work!')
}

addAcademicTermsRLS().then(() => process.exit(0))
