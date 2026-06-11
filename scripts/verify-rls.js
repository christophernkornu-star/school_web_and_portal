const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT tablename, COUNT(*) as cnt,
        string_agg(cmd || ':' || policyname, ', ' ORDER BY cmd) as policies
      FROM pg_policies
      WHERE tablename IN ('classes','subjects','class_subjects','students','mock_scores','teacher_subject_assignments')
      GROUP BY tablename
      ORDER BY tablename
    `
  });

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('\n✅ RLS Policies Applied Successfully!\n');
  console.log('Table                    │ # Policies');
  console.log('─────────────────────────┼────────────');
  const rows = Array.isArray(data) ? data : [data];
  for (const row of rows) {
    console.log(`${(row.tablename || '').padEnd(24)} │ ${row.cnt}`);
    console.log(`  Policies: ${row.policies}`);
    console.log('');
  }
}

check().finally(() => process.exit(0));
