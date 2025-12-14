const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration to add results_withheld columns...');

  // We can't run raw SQL directly via the JS client easily without a stored procedure or direct SQL access.
  // However, we can try to use the RPC interface if there's a generic SQL runner, but usually there isn't one by default.
  // A common workaround for these environments is to just ask the user to run it, OR if we are lucky, we might have a way.
  
  // Since I cannot execute raw SQL via the JS client without a specific setup, 
  // I will try to check if the columns exist first to confirm the diagnosis.
  
  const { data, error } = await supabase
    .from('students')
    .select('results_withheld')
    .limit(1);

  if (error) {
    console.log('Confirmed: columns do not exist (or other error).');
    console.log('Error details:', error.message);
    
    if (error.code === 'PGRST303' || error.message.includes('does not exist')) {
        console.log('\n!!! ACTION REQUIRED !!!');
        console.log('The "results_withheld" column is missing.');
        console.log('Please go to your Supabase SQL Editor and run the following command:');
        console.log(`
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS results_withheld BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS withheld_reason TEXT;
        `);
    }
  } else {
    console.log('Columns appear to exist already.');
  }
}

runMigration();
