const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function quickSetup() {
  console.log('🚀 Quick setup for attendance testing...\n')

  // 1. Set total days for current term
  console.log('1️⃣  Setting total days for current term...')
  const { error: termError } = await supabase
    .from('academic_terms')
    .update({ total_days: 63 })
    .eq('is_current', true)

  if (termError) {
    console.error('   ❌ Error:', termError.message)
  } else {
    console.log('   ✅ Total days set to 63\n')
  }

  // 2. Add test students to KG 1
  console.log('2️⃣  Adding test students to KG 1...')
  
  // Get KG 1 class ID
  const { data: kg1 } = await supabase
    .from('classes')
    .select('id')
    .eq('name', 'KG 1')
    .single()

  if (!kg1) {
    console.error('   ❌ KG 1 class not found')
    return
  }

  const testStudents = [
    { first_name: 'Kwame', last_name: 'Mensah', gender: 'male', dob: '2018-03-15' },
    { first_name: 'Akua', last_name: 'Asante', gender: 'female', dob: '2018-05-20' },
    { first_name: 'Kofi', last_name: 'Owusu', gender: 'male', dob: '2018-07-10' },
    { first_name: 'Ama', last_name: 'Boateng', gender: 'female', dob: '2018-04-25' },
    { first_name: 'Yaw', last_name: 'Agyeman', gender: 'male', dob: '2018-06-12' }
  ]

  for (const student of testStudents) {
    const { error: studentError } = await supabase
      .from('students')
      .insert({
        class_id: kg1.id,
        first_name: student.first_name,
        last_name: student.last_name,
        gender: student.gender,
        date_of_birth: student.dob,
        guardian_name: `Parent of ${student.first_name}`,
        guardian_phone: '+233200000000',
        admission_date: '2024-09-01'
      })

    if (studentError && !studentError.message.includes('duplicate')) {
      console.error(`   ❌ Error adding ${student.first_name}:`, studentError.message)
    } else {
      console.log(`   ✅ Added: ${student.first_name} ${student.last_name} (${student.gender})`)
    }
  }

  console.log('\n3️⃣  Verifying setup...')
  const { data: students, count } = await supabase
    .from('students')
    .select('*', { count: 'exact' })
    .eq('class_id', kg1.id)

  console.log(`   ✅ Total students in KG 1: ${count}`)
  
  const boys = students.filter(s => s.gender === 'male').length
  const girls = students.filter(s => s.gender === 'female').length
  console.log(`      - Boys: ${boys}`)
  console.log(`      - Girls: ${girls}`)

  console.log('\n✨ Setup complete!')
  console.log('   Now you can:')
  console.log('   1. Login as: teacher.test / Teacher123!')
  console.log('   2. Go to: Teacher → Mark Attendance')
  console.log('   3. Select: KG 1')
  console.log('   4. Enter days present for each student')
  console.log('   5. See statistics update automatically')
}

quickSetup().then(() => process.exit(0))
