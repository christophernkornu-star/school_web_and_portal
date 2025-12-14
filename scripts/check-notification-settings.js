const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error, count } = await supabase
    .from('notification_settings')
    .select('*', { count: 'exact' });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Count:', count);
  console.log('Data:', JSON.stringify(data, null, 2));

  if (data.length > 1) {
    console.log('More than 1 row found. Deleting extras...');
    // Keep the first one, delete the rest
    const toKeep = data[0].id;
    const toDelete = data.slice(1).map(d => d.id);
    
    const { error: deleteError } = await supabase
      .from('notification_settings')
      .delete()
      .in('id', toDelete);
      
    if (deleteError) console.error('Delete Error:', deleteError);
    else console.log('Deleted extra rows.');
  } else if (data.length === 0) {
    console.log('No rows found. Inserting default...');
    const { error: insertError } = await supabase
      .from('notification_settings')
      .insert([{ 
        email_enabled: true, 
        sms_enabled: false,
        notify_attendance: true,
        notify_results: true,
        notify_fees: true,
        notify_announcements: true
      }]);
      
    if (insertError) console.error('Insert Error:', insertError);
    else console.log('Inserted default row.');
  }
}

run();
