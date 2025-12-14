const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

// Create admin client to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function insertTeacherRecord() {
  console.log('🔧 Creating teacher record with admin privileges...\n')
  return executeManually()
}

async function executeManually() {
  // Insert teacher record
  console.log('1️⃣  Inserting teacher record...')
  const { data: teacher, error: teacherError } = await supabase
    .from('teachers')
    .upsert({
      profile_id: '0a6c6272-9a1b-45cb-97af-c7431110ff72',
      first_name: 'Test',
      last_name: 'Teacher',
      phone: '+233200000000',
      specialization: 'General Studies',
      qualification: 'Bachelor of Education',
      hire_date: '2024-01-01',
      status: 'active'
    }, {
      onConflict: 'profile_id'
    })
    .select()
    .single()

  if (teacherError) {
    console.error('   ❌ Error:', teacherError.message)
    return
  }

  console.log('   ✅ Teacher record created!')
  console.log(`      Teacher ID: ${teacher.teacher_id}`)
  console.log(`      Name: ${teacher.first_name} ${teacher.last_name}\n`)

  // Get KG 1 class ID
  const { data: kg1Class } = await supabase
    .from('classes')
    .select('id, name')
    .eq('name', 'KG 1')
    .single()

  if (!kg1Class) {
    console.log('   ⚠️  Could not find KG 1 class')
    return
  }

  // Assign teacher to class
  console.log('2️⃣  Assigning teacher to KG 1...')
  const { error: assignError } = await supabase
    .from('teacher_class_assignments')
    .upsert({
      teacher_id: teacher.id,
      class_id: kg1Class.id,
      is_class_teacher: true,
      academic_year: '2024/2025'
    }, {
      onConflict: 'teacher_id,class_id,academic_year'
    })

  if (assignError) {
    console.error('   ❌ Error:', assignError.message)
    return
  }

  console.log('   ✅ Teacher assigned as class teacher for KG 1!\n')

  // Verify the setup
  console.log('3️⃣  Verifying setup...')
  const { data: assignments } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      class:classes(name)
    `)
    .eq('teacher_id', teacher.id)

  if (assignments && assignments.length > 0) {
    console.log('   ✅ Assignments verified:')
    assignments.forEach(a => {
      console.log(`      - ${a.class.name} (Class Teacher: ${a.is_class_teacher ? 'Yes' : 'No'})`)
    })
  }

  console.log('\n✨ Setup complete! You can now login as:')
  console.log('   Username: teacher.test')
  console.log('   Password: Teacher123!')
  console.log('   Then go to Teacher → Mark Attendance')
}

insertTeacherRecord().then(() => process.exit(0))
