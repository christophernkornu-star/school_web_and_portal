const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateRLSPolicies() {
  console.log('🔒 Updating RLS policies for student_attendance...\n')

  const policies = [
    {
      name: 'Students can view own attendance',
      sql: `
        DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;
        CREATE POLICY "Students can view own attendance" 
        ON student_attendance
        FOR SELECT
        USING (
          student_id IN (
            SELECT id FROM students WHERE profile_id = auth.uid()
          )
        );
      `
    },
    {
      name: 'Teachers can view class attendance',
      sql: `
        DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance;
        CREATE POLICY "Teachers can view class attendance" 
        ON student_attendance
        FOR SELECT
        USING (
          class_id IN (
            SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (
              SELECT id FROM teachers WHERE profile_id = auth.uid()
            )
          )
        );
      `
    },
    {
      name: 'Teachers can manage class attendance',
      sql: `
        DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance;
        CREATE POLICY "Teachers can manage class attendance" 
        ON student_attendance
        FOR ALL
        USING (
          class_id IN (
            SELECT class_id FROM teacher_class_assignments 
            WHERE teacher_id IN (
              SELECT id FROM teachers WHERE profile_id = auth.uid()
            )
            AND is_class_teacher = true
          )
        );
      `
    }
  ]

  for (const policy of policies) {
    console.log(`📝 Updating: ${policy.name}`)
    const { error } = await supabase.rpc('exec', { sql: policy.sql }).catch(async () => {
      // If rpc doesn't work, try direct query
      const { error } = await supabase.from('_sql').insert({ query: policy.sql })
      return { error }
    })

    if (error) {
      console.log(`   ⚠️  Could not update via script: ${error.message}`)
      console.log(`   📋 Please run this SQL manually in Supabase Dashboard:\n`)
      console.log(policy.sql)
      console.log('\n' + '='.repeat(60) + '\n')
    } else {
      console.log(`   ✅ Updated successfully`)
    }
  }

  console.log('\n💡 If you saw errors, copy the SQL above and run it in:')
  console.log('   Supabase Dashboard → SQL Editor → New Query')
}

updateRLSPolicies().then(() => process.exit(0))
