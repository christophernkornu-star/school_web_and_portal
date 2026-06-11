const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUnrestricted() {
  console.log('Fixing unrestricted tables - replacing USING(true) with role-based policies...\n');

  // Drop the overly permissive "Anyone can view" policies
  const dropStatements = [
    'DROP POLICY IF EXISTS "Anyone can view classes" ON classes;',
    'DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;',
    'DROP POLICY IF EXISTS "Anyone can view class_subjects" ON class_subjects;',
    'DROP POLICY IF EXISTS "Anyone can view students" ON students;',
    'DROP POLICY IF EXISTS "Anyone can view teacher_subject_assignments" ON teacher_subject_assignments;',
  ];

  for (const stmt of dropStatements) {
    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
    console.log(`  DROP: ${stmt.substring(0, 60)}... ${error ? '❌ ' + error.message.substring(0, 50) : '✅'}`);
  }

  // Create properly restricted SELECT policies
  const createStatements = [
    'CREATE POLICY "Authenticated users can view classes" ON classes FOR SELECT USING (auth.role() = \'authenticated\');',
    'CREATE POLICY "Authenticated users can view subjects" ON subjects FOR SELECT USING (auth.role() = \'authenticated\');',
    'CREATE POLICY "Auth users can view class_subjects" ON class_subjects FOR SELECT USING (auth.role() = \'authenticated\');',
    'CREATE POLICY "Authenticated users can view students" ON students FOR SELECT USING (auth.role() = \'authenticated\');',
    'CREATE POLICY "Authenticated users can view teacher_subject_assignments" ON teacher_subject_assignments FOR SELECT USING (auth.role() = \'authenticated\');',
  ];

  for (const stmt of createStatements) {
    const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
    console.log(`  CREATE: ${stmt.substring(0, 70)}... ${error ? '❌ ' + error.message.substring(0, 50) : '✅'}`);
  }

  console.log('\nDone! The tables should no longer show as "unrestricted" in Supabase.');
  console.log('Note: mock_scores already had proper restricted policies - no change needed.');
}

fixUnrestricted().finally(() => process.exit(0));

