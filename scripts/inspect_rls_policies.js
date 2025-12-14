const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectPolicies() {
  const { data, error } = await supabase
    .from('pg_policies')
    .select('*')
    .in('tablename', ['scores', 'subjects', 'academic_terms']);

  if (error) {
    console.error('Error fetching policies:', error);
    return;
  }

  console.log('RLS Policies:');
  data.forEach(policy => {
    console.log(`Table: ${policy.tablename}`);
    console.log(`  Policy: ${policy.policyname}`);
    console.log(`  Command: ${policy.cmd}`);
    console.log(`  Roles: ${policy.roles}`);
    console.log(`  Using: ${policy.qual}`);
    console.log(`  Check: ${policy.with_check}`);
    console.log('---');
  });
}

inspectPolicies();
