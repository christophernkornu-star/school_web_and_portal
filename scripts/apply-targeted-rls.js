/**
 * Apply targeted RLS policies for 6 tables via Supabase Management API
 * 
 * Usage: node scripts/apply-targeted-rls.js
 * 
 * This script reads the SQL from database/targeted-rls-six-tables.sql
 * and executes it via the Supabase SQL endpoint.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure .env.local has:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyRLS() {
  console.log('🛡️  Applying Targeted RLS Policies...\n');
  console.log(`📡 Connecting to: ${supabaseUrl}\n`);

  // Read the SQL file
  const sqlPath = path.resolve(__dirname, '..', 'database', 'targeted-rls-six-tables.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('📄 SQL File loaded successfully');
  console.log('----------------------------------------\n');

  // Supabase has a /rest/v1/rpc/ endpoint that can execute SQL
  // We'll use the raw REST API to run the SQL
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        command: sql
      })
    });

    // If RPC endpoint doesn't exist, try alternative approach
    if (response.status === 404) {
      console.log('ℹ️  RPC endpoint not available. Trying direct SQL execution...');
      
      // Alternative: Use the Supabase SQL query endpoint
      const sqlResponse = await fetch(`${supabaseUrl}/sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          query: sql
        })
      });

      if (!sqlResponse.ok) {
        const errorText = await sqlResponse.text();
        throw new Error(`SQL execution failed: ${errorText}`);
      }

      const result = await sqlResponse.json();
      console.log('✅ RLS Policies applied successfully via /sql endpoint!');
      console.log('\n📊 Result:', JSON.stringify(result, null, 2));
    } else if (response.ok) {
      const result = await response.json();
      console.log('✅ RLS Policies applied successfully!');
      console.log('\n📊 Result:', JSON.stringify(result, null, 2));
    } else {
      const errorText = await response.text();
      
      // Check if it's just that the RPC doesn't exist - in that case the SQL
      // likely already ran before this check.
      if (errorText.includes('function "rpc" does not exist') || errorText.includes('could not find')) {
        console.log('⚠️  The direct SQL execution API is not available via the client.');
        console.log('\n⚠️  PLEASE RUN THE SQL MANUALLY:');
        console.log('----------------------------------------');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Open SQL Editor');
        console.log('3. Copy the contents of: database/targeted-rls-six-tables.sql');
        console.log('4. Paste and Run\n');
      } else {
        throw new Error(`API error: ${errorText}`);
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    
    // If the fetch failed because the API is not available, provide manual instructions
    if (err.message.includes('fetch') || err.message.includes('ENOTFOUND')) {
      console.log('\n⚠️  Could not connect to Supabase API directly.');
    }
    
    console.log('\n📋 MANUAL INSTRUCTIONS:');
    console.log('----------------------------------------');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('\nOpen: https://supabase.com/dashboard/project/okfawhokrtkaibhbcjdk/sql/new');
    console.log('\nThen execute the contents of: database/targeted-rls-six-tables.sql\n');
  }
}

applyRLS();
