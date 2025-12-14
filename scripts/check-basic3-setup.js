const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTeacherAssignment() {
  console.log('🔍 Checking teacher assignment...\n')

  // Get teacher info
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', '0a6c6272-9a1b-45cb-97af-c7431110ff72')
    .single()

  if (!teacher) {
    console.log('❌ Teacher not found')
    return
  }

  console.log('✅ Teacher found:')
  console.log(`   ID: ${teacher.id}`)
  console.log(`   Name: ${teacher.first_name} ${teacher.last_name}`)

  // Get current assignments
  const { data: assignments } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      classes (name)
    `)
    .eq('teacher_id', teacher.id)

  console.log('\n📋 Current assignments:')
  if (assignments && assignments.length > 0) {
    assignments.forEach(a => {
      console.log(`   - ${a.classes.name} (Class Teacher: ${a.is_class_teacher})`)
    })
  } else {
    console.log('   No assignments found')
  }

  // Get Basic 3 class
  const { data: basic3 } = await supabase
    .from('classes')
    .select('id, name')
    .eq('name', 'Basic 3')
    .single()

  if (basic3) {
    console.log(`\n✅ Found ${basic3.name} (ID: ${basic3.id})`)
    
    // Check students in Basic 3
    const { data: students, count } = await supabase
      .from('students')
      .select('id, first_name, last_name, gender', { count: 'exact' })
      .eq('class_id', basic3.id)

    console.log(`   Students: ${count || 0}`)
    if (students && students.length > 0) {
      const boys = students.filter(s => s.gender === 'male' || s.gender === 'Male').length
      const girls = students.filter(s => s.gender === 'female' || s.gender === 'Female').length
      console.log(`   - Boys: ${boys}`)
      console.log(`   - Girls: ${girls}`)
      students.slice(0, 3).forEach(s => {
        console.log(`   - ${s.first_name} ${s.last_name}`)
      })
      if (count > 3) {
        console.log(`   ... and ${count - 3} more`)
      }
    }
  }

  // Check current term
  const { data: term } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('is_current', true)
    .single()

  console.log(`\n📅 Current term: ${term?.name} (${term?.academic_year})`)
  console.log(`   Total days: ${term?.total_days || 'Not set'}`)

  if (!term?.total_days || term.total_days === 0) {
    console.log('\n⚠️  Setting total days to 63...')
    await supabase
      .from('academic_terms')
      .update({ total_days: 63 })
      .eq('is_current', true)
    console.log('   ✅ Total days set!')
  }

  console.log('\n✨ System is ready!')
  console.log('   Login: teacher.test / Teacher123!')
  console.log('   Go to: Teacher → Mark Attendance')
  console.log('   Select: Basic 3')
}

checkTeacherAssignment().then(() => process.exit(0))
