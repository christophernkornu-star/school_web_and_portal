require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkAllClasses() {
  const { data: classesData } = await supabase
    .from('classes')
    .select('id, name, level, level_old, category')
    .order('level_old')
  
  console.log('All Classes:')
  classesData?.forEach(c => {
    console.log(`${c.name}: level="${c.level}", level_old=${c.level_old}, category="${c.category}"`)
  })
}

checkAllClasses().then(() => process.exit(0))
