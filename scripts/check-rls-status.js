const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRLSStatus() {
  console.log('=== Checking RLS Status on Tables ===\n');

  // Check if RLS is enabled on each table
  const tables = ['classes', 'subjects', 'class_subjects', 'students', 'mock_scores', 'teacher_subject_assignments'];
  
  for (const table of tables) {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: "SELECT '" + table + "' as tbl, " +
        "c.relrowsecurity, c.relhasrules " +
        "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace " +
        "WHERE c.relname = '" + table + "' AND n.nspname = 'public'"
    });
    
    if (error) {
      console.log(table + ': RPC Error: ' + error.message);
      // Try direct fetch
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      try {
        const res = await fetch(url + '/rest/v1/' + table + '?select=count&limit=0', {
          headers: { apikey: key, Authorization: 'Bearer ' + key }
        });
        console.log(table + ': accessible via PostgREST (status ' + res.status + ')');
      } catch(e) {
        console.log(table + ': ' + e.message);
      }
    } else {
      console.log(table + ': RLS=' + (data ? 'ON' : 'OFF'));
    }
  }
  
  console.log('\nNote: exec_sql returns void, so we get no results from queries.');
  console.log('Direct verification via PostgREST below:\n');

  // Test: Try to insert into classes as anonymous (should fail)
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  console.log('Testing anonymous INSERT (should FAIL with 401/403):');
  const res = await fetch(url + '/rest/v1/classes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey,
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ name: 'Test Class', level: 99, category: 'Test' })
  });
  console.log('  INSERT classes: Status ' + res.status + ' ' + (res.status >= 400 ? 'BLOCKED' : 'ALLOWED'));
  const text = await res.text();
  if (text) console.log('  Response: ' + text.substring(0, 200));

  // Test anonymous SELECT on classes (should return 0 rows if RLS works)
  console.log('\nTesting anonymous SELECT (should return EMPTY array if RLS blocks):');
  const res2 = await fetch(url + '/rest/v1/classes?select=id&limit=5', {
    headers: {
      'apikey': anonKey,
      'Authorization': 'Bearer ' + anonKey
    }
  });
  const data2 = await res2.json();
  console.log('  SELECT classes: ' + (Array.isArray(data2) ? data2.length + ' rows returned' : JSON.stringify(data2)));
  
  if (Array.isArray(data2) && data2.length > 0) {
    console.log('\n⚠️  ISSUE: Anonymous users can still read classes!');
    console.log('   This means RLS policies are NOT properly restricting access.');
    console.log('\n   Possible causes:');
    console.log('   1. The policies were created with syntax errors we could not see');
    console.log('   2. exec_sql() swallowed the errors silently');
    console.log('   3. There are some other policies overriding ours');
    console.log('\n   RECOMMENDATION: Run the SQL directly in Supabase SQL Editor!');
  } else {
    console.log('\n✅ RLS is working! Anonymous users are blocked.');
  }
}

checkRLSStatus().finally(() => process.exit(0));
