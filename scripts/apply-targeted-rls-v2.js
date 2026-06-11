/**
 * Apply targeted RLS policies via Supabase Management API (pgmgr endpoint)
 * 
 * Usage: node scripts/apply-targeted-rls-v2.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Extract project ref from URL: https://<ref>.supabase.co
const PROJECT_REF = SUPABASE_URL ? SUPABASE_URL.match(/https:\/\/(.+)\.supabase\.co/)?.[1] : null;

async function applyViaManagementAPI() {
  console.log('🛡️  Applying Targeted RLS Policies\n');

  if (!SUPABASE_URL || !SERVICE_KEY || !PROJECT_REF) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const sqlPath = path.resolve(__dirname, '..', 'database', 'targeted-rls-six-tables.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log(`📡 Project: ${PROJECT_REF}`);
  console.log(`📄 SQL size: ${sqlContent.length} characters\n`);

  // Method 1: Try the pgmgr endpoint (Supabase Management API)
  try {
    console.log('Method 1: Trying pgmgr endpoint...');
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sqlContent })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully applied via Management API!\n');
      if (result && result.length > 0) {
        console.log('📊 Result:', JSON.stringify(result, null, 2));
      }
      return;
    }

    const errorText = await response.text();
    console.log(`⚠️  pgmgr endpoint failed: ${response.status} ${errorText.substring(0, 200)}`);
  } catch (err) {
    console.log(`⚠️  pgmgr endpoint error: ${err.message}`);
  }

  // Method 2: Try direct database connection via the Supabase REST API SQL endpoint
  try {
    console.log('\nMethod 2: Trying direct REST API...');
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query: sqlContent })
    });

    if (response.ok) {
      console.log('✅ Successfully applied via REST API!');
      return;
    }
    console.log(`⚠️  REST API response: ${response.status}`);
  } catch (err) {
    console.log(`⚠️  REST API error: ${err.message}`);
  }

  // Method 3: Try to create exec_sql function first, then use it
  try {
    console.log('\nMethod 3: Attempting to create exec_sql RPC function...');
    
    // First check if exec_sql exists
    const checkResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_sql_function`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // If that failed, we can't use RPC approach
    console.log('⚠️  RPC approach not viable (no exec_sql function exists)');
  } catch (err) {
    console.log(`⚠️  ${err.message}`);
  }

  // All methods failed - provide manual instructions
  console.log('\n⚠️  ═══════════════════════════════════════════════');
  console.log('⚠️  AUTOMATED EXECUTION NOT POSSIBLE');
  console.log('⚠️  ═══════════════════════════════════════════════');
  console.log('');
  console.log('📋 Please run the SQL manually:');
  console.log('');
  console.log('   Step 1: Open Supabase Dashboard');
  console.log(`   ${SUPABASE_URL}/project/${PROJECT_REF}/sql/new`);
  console.log('');
  console.log('   Step 2: Open this file in a text editor:');
  console.log(`   ${sqlPath}`);
  console.log('');
  console.log('   Step 3: Copy the entire contents and paste into the SQL Editor');
  console.log('');
  console.log('   Step 4: Click "Run" or press Ctrl+Enter');
  console.log('');
}

applyViaManagementAPI().catch(console.error).finally(() => {
  console.log('\nDone.');
  process.exit(0);
});
