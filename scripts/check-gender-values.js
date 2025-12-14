require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkGenderValues() {
  console.log('Checking gender values in students table...\n')

  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name, gender, class_id')
    .order('first_name')

  console.log('Total students:', students?.length || 0)

  const genderCounts = {}
  students?.forEach(s => {
    const gender = s.gender || 'null'
    genderCounts[gender] = (genderCounts[gender] || 0) + 1
  })

  console.log('\nGender distribution:')
  Object.entries(genderCounts).forEach(([gender, count]) => {
    console.log(`  ${gender}: ${count}`)
  })

  console.log('\nSample students:')
  students?.slice(0, 5).forEach(s => {
    console.log(`  ${s.first_name} ${s.last_name}: gender="${s.gender}" (type: ${typeof s.gender})`)
  })

  // Check Basic 3 specifically
  console.log('\n--- Basic 3 Students ---')
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('name', 'Basic 3')
    .single()

  if (classes) {
    const { data: basic3Students } = await supabase
      .from('students')
      .select('first_name, last_name, gender')
      .eq('class_id', classes.id)
      .order('first_name')

    console.log(`Total: ${basic3Students?.length || 0}`)
    
    const boys = basic3Students?.filter(s => s.gender?.toLowerCase() === 'male') || []
    const girls = basic3Students?.filter(s => s.gender?.toLowerCase() === 'female') || []

    console.log(`Boys: ${boys.length}`)
    console.log(`Girls: ${girls.length}`)

    console.log('\nAll Basic 3 students:')
    basic3Students?.forEach(s => {
      console.log(`  ${s.first_name} ${s.last_name}: "${s.gender}"`)
    })
  }
}

checkGenderValues().catch(console.error)
