const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function diagnose() {
  console.log('=== DIAGNOSIS: Checking RLS Policies ===\n');

  // Test with the anon key
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  console.log('Testing anonymous access (should be BLOCKED for restricted tables):\n');

  const tables = ['classes', 'subjects', 'class_subjects', 'students', 'mock_scores', 'teacher_subject_assignments'];

  for (const table of tables) {
    const res = await fetch(url + '/rest/v1/' + table + '?select=count&limit=0', {
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey,
        'Accept': 'application/json'
      }
    });
    const body = await res.text();
    const status = res.status;
    const isBlocked = status === 401 || status === 403 || body.includes('"error"') || body.includes('"message"');
    console.log('  ' + table.padEnd(35) + ' Status: ' + status + ' ' + (isBlocked ? 'BLOCKED' : 'OPEN'));
  }

  // Now try with service role (should always work)
  console.log('\nTesting service role access (should always work):\n');

  for (const table of tables) {
    const res = await fetch(url + '/rest/v1/' + table + '?select=count&limit=0', {
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY,
        'Accept': 'application/json'
      }
    });
    const body = await res.text();
    const status = res.status;
    console.log('  ' + table.padEnd(35) + ' Status: ' + status + ' OK');
  }

  console.log('\n=== Diagnosis Complete ===');
}

diagnose().finally(() => process.exit(0));

