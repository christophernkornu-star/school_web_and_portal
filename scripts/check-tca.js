require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function check() {
  const { data, error } = await supabase
    .from('teacher_class_assignments')
    .select('*')
    .limit(3)
  
  console.log('teacher_class_assignments data:', JSON.stringify(data, null, 2))
  if (error) console.log('Error:', error)
}

check().then(() => process.exit(0))
