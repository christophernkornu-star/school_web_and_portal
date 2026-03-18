require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: subjects } = await supabase
    .from('subjects')
    .select('id, name')
    .ilike('name', '%History%');
    
  console.log('Subjects related to History:', subjects);
}

main();