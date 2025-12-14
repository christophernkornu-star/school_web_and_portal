const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkStudentData() {
  console.log('Checking student data structure...\n')

  // First check what columns classes table has
  console.log('Checking classes table structure...')
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .limit(1)
    .single()
  
  if (classError) {
    console.error('Classes error:', classError)
  } else {
    console.log('Classes table columns:', Object.keys(classData))
    console.log('Sample class data:', classData)
  }

  console.log('\n---\n')

  // Get a sample student with all relationships
  const { data, error } = await supabase
    .from('students')
    .select(`
      *
    `)
    .limit(1)
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Sample student data:')
  console.log(JSON.stringify(data, null, 2))
}

checkStudentData()
