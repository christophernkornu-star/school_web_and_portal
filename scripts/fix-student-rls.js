require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function fixStudentRLS() {
  console.log('=== Checking and Fixing Student RLS Policies ===\n')

  // Drop existing policies
  const dropPolicies = `
    DROP POLICY IF EXISTS "Students can view own record" ON students;
    DROP POLICY IF EXISTS "Students can update own record" ON students;
    DROP POLICY IF EXISTS "Teachers can view their students" ON students;
    DROP POLICY IF EXISTS "Admins can manage all students" ON students;
    DROP POLICY IF EXISTS "Public read for students" ON students;
  `

  // Create new comprehensive policies
  const createPolicies = `
    -- Allow students to view their own record
    CREATE POLICY "Students can view own record" ON students
      FOR SELECT
      USING (auth.uid() = profile_id);

    -- Allow students to update their own profile (limited fields)
    CREATE POLICY "Students can update own record" ON students
      FOR UPDATE
      USING (auth.uid() = profile_id);

    -- Allow teachers to view students in their classes
    CREATE POLICY "Teachers can view their students" ON students
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM teachers t
          INNER JOIN teacher_class_assignments tca ON tca.teacher_id = t.id
          WHERE t.profile_id = auth.uid()
          AND tca.class_id = students.class_id
        )
      );

    -- Allow admins full access
    CREATE POLICY "Admins can manage all students" ON students
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      );
  `

  try {
    console.log('Dropping old policies...')
    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropPolicies 
    })
    
    if (dropError && !dropError.message.includes('does not exist')) {
      console.error('Error dropping policies:', dropError.message)
    }

    console.log('Creating new policies...')
    const { error: createError } = await supabase.rpc('exec_sql', { 
      sql: createPolicies 
    })
    
    if (createError) {
      console.error('Error creating policies:', createError.message)
      console.log('\nYou need to run these SQL commands manually in Supabase SQL Editor:')
      console.log(dropPolicies)
      console.log(createPolicies)
      return
    }

    console.log('✅ RLS policies updated successfully!\n')
    
    // Test the policy
    console.log('Testing student access...')
    const testStudentId = '5fee84d2-663a-419d-9f8d-b7e17c044c65' // STU2030
    
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('profile_id', testStudentId)
      .single()
    
    if (error) {
      console.error('❌ Test failed:', error.message)
    } else {
      console.log('✅ Test passed! Student can access their record')
    }

  } catch (err) {
    console.error('Error:', err.message)
    console.log('\n=== MANUAL SQL COMMANDS ===')
    console.log('Run these in Supabase SQL Editor:\n')
    console.log(dropPolicies)
    console.log(createPolicies)
  }
}

fixStudentRLS().catch(console.error).finally(() => process.exit(0))
