const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.rpc('exec_sql', {
    sql_query: "SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('classes','subjects','class_subjects','students','mock_scores','teacher_subject_assignments') ORDER BY tablename, cmd"
  });

  if (error) {
    console.error('RPC error:', error.message);
    process.exit(1);
  }

  const rows = Array.isArray(data) ? data : [data];
  let currentTable = '';
  for (const row of rows) {
    if (row.tablename !== currentTable) {
      currentTable = row.tablename;
      console.log(`\n=== ${currentTable} ===`);
    }
    console.log(`  ${row.cmd}: ${row.policyname}`);
    if (row.qual) console.log(`    USING: ${row.qual.substring(0, 100)}`);
    if (row.with_check) console.log(`    CHECK: ${row.with_check.substring(0, 100)}`);
  }
}

check().finally(() => process.exit(0));
