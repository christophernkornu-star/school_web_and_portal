const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

// Verify environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.log('Please ensure you have these set up to run this script automatically.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applySchema() {
  console.log('🚀 Applying Report Card Schema Fixes...\n')
  
  const sqlPath = path.join(__dirname, '..', 'database', 'add_student_remarks_and_attendance_column.sql')
  
  if (!fs.existsSync(sqlPath)) {
      console.error(`❌ SQL file not found at ${sqlPath}`)
      process.exit(1)
  }

  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  // Split by semicolons to execute statement by statement
  // This is a naive split but works for simple SQL files without dollar quotes containing semicolons
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let successCount = 0
  let errorCount = 0

  for (const statement of statements) {
    // skip empty lines
    if (!statement) continue

    console.log(`Executing: ${statement.substring(0, 50)}...`)
    
    // We try to use the 'exec_sql' RPC function if it exists
    // If not, we fall back to instructing the user
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
    
    if (error) {
      console.error(`❌ Error executing statement: ${error.message}`)
      
      // Check if it's because 'exec_sql' doesn't exist
      if (error.code === 'PGRST202' || error.message.includes('function not found')) {
          console.log('\n⚠️  The helper function "exec_sql" was not found in your database.')
          console.log('Please run the SQL manually in Supabase SQL Editor.')
          console.log(`File: ${sqlPath}`)
          process.exit(1)
      }
      
      errorCount++
    } else {
      console.log('✓ Success')
      successCount++
    }
  }

  console.log('\n' + '='.repeat(50))
  if (errorCount === 0) {
      console.log('✅ All schema changes applied successfully!')
  } else {
      console.log(`⚠️  Completed with ${errorCount} errors. Please review above.`)
  }
}

applySchema()