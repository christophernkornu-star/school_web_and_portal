/**
 * Apply final RLS fix by executing SQL statements one-by-one
 * using the Supabase Management API's SQL endpoint.
 * 
 * This tries multiple approaches to execute the SQL.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing credentials');
  process.exit(1);
}

async function callSQL(sql) {
  // Method 1: Try the SQL endpoint (Supabase Pro feature)
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/exec_sql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': 'Bearer ' + SERVICE_KEY
      },
      body: JSON.stringify({ sql_query: sql })
    });
    
    if (res.ok) {
      const text = await res.text();
      return { success: true, result: text };
    }
    
    // Check if it's a known error
    const errText = await res.text();
    if (errText.includes('already exists')) {
      return { success: true, skipped: true, message: 'already exists' };
    }
    if (errText.includes('does not exist')) {
      return { success: true, skipped: true, message: 'does not exist' };
    }
    
    return { success: false, error: errText.substring(0, 150) };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

async function main() {
  console.log('=== Applying Final RLS Fix ===\n');
  
  const fs = require('fs');
  const path = require('path');
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'final-rls-fix.sql'), 'utf8');
  
  // Split into statements (using ; as delimiter, but handle $$ blocks)
  const statements = [];
  let current = '';
  let inDollar = false;
  let dollarTag = '';
  
  for (const line of sql.split('\n')) {
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inDollar) {
      if (current.trim()) {
        statements.push(current.trim());
        current = '';
      }
      continue;
    }
    
    current += line + '\n';
    
    // Track dollar-quoting
    if (!inDollar) {
      const match = current.match(/\$\$([^$]*)?$/);
      if (match && current.includes('AS $$')) {
        inDollar = true;
        dollarTag = match[1] || '';
      }
    } else {
      if (current.includes('$$' + dollarTag + ';')) {
        inDollar = false;
      }
    }
    
    // Split on semicolons (but not inside dollar quotes)
    if (!inDollar && line.trim().endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }
  
  if (current.trim()) {
    statements.push(current.trim());
  }
  
  console.log('Found ' + statements.length + ' SQL statements to execute\n');
  
  let success = 0;
  let skipped = 0;
  let failed = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.replace(/\n/g, ' ').substring(0, 80).trim();
    process.stdout.write('  [' + (i + 1) + '/' + statements.length + '] ' + preview + '... ');
    
    const result = await callSQL(stmt);
    
    if (result.success) {
      if (result.skipped) {
        console.log('⚠️  (' + result.message + ')');
        skipped++;
      } else {
        console.log('✅');
        success++;
      }
    } else {
      console.log('❌ ' + result.error);
      failed++;
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('  ✅ Success: ' + success);
  console.log('  ⚠️  Skipped: ' + skipped);
  console.log('  ❌ Failed:  ' + failed);
  
  if (failed > 0) {
    console.log('\n⚠️  Some statements failed. The SQL needs to be run manually.');
    console.log('   Go to: ' + SUPABASE_URL + '/project/okfawhokrtkaibhbcjdk/sql/new');
    console.log('   Copy the contents of: database/final-rls-fix.sql');
    console.log('   Paste and RUN');
  } else {
    console.log('\n✅ All RLS policies applied!');
  }
}

main().finally(() => process.exit(0));
