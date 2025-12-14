const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixRLS() {
  console.log('🔒 Fixing RLS policies...\n')

  const sqlStatements = [
    `DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance`,
    `DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance`,
    `DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance`,
    `CREATE POLICY "Students can view own attendance" 
     ON student_attendance FOR SELECT
     USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()))`,
    `CREATE POLICY "Teachers can view class attendance" 
     ON student_attendance FOR SELECT
     USING (class_id IN (SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())))`,
    `CREATE POLICY "Teachers can manage class attendance" 
     ON student_attendance FOR ALL
     USING (class_id IN (SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()) AND is_class_teacher = true))`
  ]

  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i]
    const isDrop = sql.startsWith('DROP')
    console.log(`${i + 1}. ${isDrop ? 'Dropping' : 'Creating'} policy...`)
    
    const { error } = await supabase.rpc('query', { query_text: sql })
      .catch(() => ({ error: { message: 'RPC not available' } }))

    if (error && error.message !== 'RPC not available') {
      console.log(`   ⚠️  ${error.message}`)
    } else if (!error) {
      console.log(`   ✅ Success`)
    }
  }

  console.log('\n📋 Please manually run this SQL in Supabase Dashboard:')
  console.log('   Go to: SQL Editor → New Query')
  console.log('   File: database/fix-attendance-rls-policies.sql\n')
  
  const sqlFile = fs.readFileSync('./database/fix-attendance-rls-policies.sql', 'utf8')
  console.log('='.repeat(60))
  console.log(sqlFile)
  console.log('='.repeat(60))
}

fixRLS().then(() => process.exit(0))
