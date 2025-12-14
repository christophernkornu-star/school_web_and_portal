const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function updateAssignment() {
  console.log('🔄 Updating teacher assignment...\n')

  // Get teacher
  const { data: teacher } = await supabase
    .from('teachers')
    .select('id')
    .eq('profile_id', '0a6c6272-9a1b-45cb-97af-c7431110ff72')
    .single()

  // Get Basic 3 class
  const { data: basic3 } = await supabase
    .from('classes')
    .select('id')
    .eq('name', 'Basic 3')
    .single()

  if (!teacher || !basic3) {
    console.log('❌ Teacher or class not found')
    return
  }

  // Delete old assignment
  console.log('1️⃣  Removing KG 1 assignment...')
  await supabase
    .from('teacher_class_assignments')
    .delete()
    .eq('teacher_id', teacher.id)

  console.log('   ✅ Done')

  // Add new assignment to Basic 3
  console.log('\n2️⃣  Assigning to Basic 3...')
  const { error } = await supabase
    .from('teacher_class_assignments')
    .insert({
      teacher_id: teacher.id,
      class_id: basic3.id,
      is_class_teacher: true,
      academic_year: '2024/2025'
    })

  if (error) {
    console.error('   ❌ Error:', error.message)
  } else {
    console.log('   ✅ Teacher assigned to Basic 3 as class teacher!')
  }

  // Verify
  const { data: assignments } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      classes (name)
    `)
    .eq('teacher_id', teacher.id)

  console.log('\n3️⃣  Current assignments:')
  assignments?.forEach(a => {
    console.log(`   ✅ ${a.classes.name} (Class Teacher: ${a.is_class_teacher})`)
  })

  console.log('\n✨ Done! Now update the RLS policies.')
}

updateAssignment().then(() => process.exit(0))
