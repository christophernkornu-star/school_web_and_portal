
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSettings() {
  console.log('Checking system_settings...');
  const { data: systemSettings, error: sysError } = await supabase
    .from('system_settings')
    .select('*');
  
  if (sysError) console.error('Error fetching system_settings:', sysError);
  else console.table(systemSettings);

  console.log('\nChecking academic_settings...');
  const { data: academicSettings, error: acadError } = await supabase
    .from('academic_settings')
    .select('*');

  if (acadError) console.error('Error fetching academic_settings:', acadError);
  else console.table(academicSettings);
}

checkSettings();
