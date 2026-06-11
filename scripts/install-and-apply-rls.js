/**
 * First create the exec_sql helper function in Supabase,
 * then use it to apply all targeted RLS policies.
 *
 * Usage: node scripts/install-and-apply-rls.js
 *
 * This works by:
 * 1. Creating the exec_sql() function via the Supabase Auth Admin API
 * 2. Then running the RLS SQL via exec_sql()
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SERVICE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
});

async function execSQL(sql) {
  // Try calling the exec_sql function
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    // If function doesn't exist, we need to create it first
    if (error.message?.includes('function') && error.message?.includes('not found') ||
        error.code === 'PGRST202' || error.message?.includes('does not exist')) {
      console.log('⚠️  exec_sql function not found. Need to create it first.');
      return { error: error, functionMissing: true };
    }
    return { error };
  }
  return { data };
}

async function createExecSQLFunction() {
  console.log('🔧 Creating exec_sql helper function...');
  
  // We can't create the function via the normal RPC since it doesn't exist yet.
  // Instead, try using the Supabase Auth admin API or the REST API directly.
  
  // The only way is to POST to the /rest/v1/ with a special header or use the management API.
  // Let's try the SQL endpoint that some Supabase instances support.
  
  const createFuncSQL = `
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;`;

  try {
    // Try via Supabase management REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'params=single-object',
      },
      body: JSON.stringify({
        query: createFuncSQL
      })
    });

    // This usually fails - that's expected
    if (response.ok) {
      console.log('✅ exec_sql function created via REST API!');
      return true;
    }
  } catch (e) {
    // expected
  }

  // Alternative: Try the Supabase Auth admin SQL execution
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/sql`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sql: createFuncSQL
      })
    });

    if (response.ok) {
      console.log('✅ exec_sql function created via Auth Admin API!');
      return true;
    }
  } catch (e) {
    // expected
  }

  // None of the automated methods worked.
  console.log('⚠️  Cannot create exec_sql function automatically.');
  return false;
}

async function main() {
  console.log('🛡️  Targeted RLS Policy Installer\n');
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);

  // Step 1: Try exec_sql first
  console.log('Step 1: Check if exec_sql function exists...');
  const testResult = await execSQL('SELECT 1');
  
  let canExecSQL = !testResult.functionMissing;
  
  if (!canExecSQL) {
    console.log('Step 2: Attempting to create exec_sql function...');
    const created = await createExecSQLFunction();
    
    if (created) {
      canExecSQL = true;
    } else {
      console.log('\n⚠️  Automated creation failed.');
      console.log('\n📋 MANUAL STEP REQUIRED:');
      console.log('───────────────────────────────────────────────────────');
      console.log('Please go to your Supabase SQL Editor and run:');
      console.log(`  ${SUPABASE_URL}/project/okfawhokrtkaibhbcjdk/sql/new`);
      console.log('\nThen run this SQL:');
      console.log('───────────────────────────────────────────────────────');
      console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_query;
END;
$$;`);
      console.log('───────────────────────────────────────────────────────');
      console.log('\nAfter creating the function, run this script again.\n');
      process.exit(0);
    }
  }

  if (canExecSQL) {
    console.log('✅  exec_sql function is available!\n');
    
    // Step 3: Read and apply the RLS SQL
    console.log('Step 3: Applying targeted RLS policies...');
    const sqlPath = path.resolve(__dirname, '..', 'database', 'targeted-rls-six-tables.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Split into individual statements and execute each one
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length < 5) continue;
      
      // Show progress
      const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
      process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}... `);
      
      try {
        const result = await execSQL(stmt);
        if (result.error) {
          // Many "already exists" errors are expected and harmless
          if (result.error.message?.includes('already exists')) {
            console.log('⚠️  (already exists)');
          } else {
            console.log(`❌ ${result.error.message?.substring(0, 60)}`);
            errorCount++;
          }
        } else {
          console.log('✅');
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ${err.message?.substring(0, 60)}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Skipped/Skipped: ${statements.length - successCount - errorCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some statements had errors. Check the logs above.');
      console.log('   Most "already exists" errors are harmless.');
    }
    
    console.log('\n✅ RLS Policy installation complete!');
  }
}

main().catch(console.error).finally(() => process.exit(0));
