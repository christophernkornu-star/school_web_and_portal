const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSubjects() {
  console.log('Checking subjects access with Anon Key...');
  const { data, error } = await supabase
    .from('subjects')
    .select('id, name')
    .limit(5);

  if (error) {
    console.error('Error fetching subjects:', error);
  } else {
    console.log(`Success! Found ${data.length} subjects.`);
    console.log(data);
  }
}

checkSubjects();
