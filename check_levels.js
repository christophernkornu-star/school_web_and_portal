
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listClassLevels() {
  const { data, error } = await supabase
    .from('classes')
    .select('level')
    .order('level');

  if (error) {
    console.error('Error fetching classes:', error);
    return;
  }

  const levels = [...new Set(data.map(c => c.level))];
  console.log('Unique Class Levels:', levels);
}

listClassLevels();
