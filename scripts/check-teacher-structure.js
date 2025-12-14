const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkTeacherStructure() {
  console.log('🔍 Checking teachers table structure...\n')

  // Get one teacher record to see the schema
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error querying teachers:', error.message)
    return
  }

  if (teachers && teachers.length > 0) {
    console.log('✅ Teachers table columns:', Object.keys(teachers[0]))
    console.log('\n📋 Sample teacher record:')
    console.log(JSON.stringify(teachers[0], null, 2))
  } else {
    console.log('⚠️  No teachers found in database')
  }

  // Check teacher_class_assignments
  console.log('\n🔍 Checking teacher_class_assignments...\n')
  const { data: assignments, error: assignError } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      teacher:teachers(id, first_name, last_name),
      class:classes(id, name)
    `)
    .eq('is_class_teacher', true)
    .limit(5)

  if (assignError) {
    console.error('❌ Error querying assignments:', assignError.message)
  } else if (assignments && assignments.length > 0) {
    console.log(`✅ Found ${assignments.length} class teacher assignments:`)
    assignments.forEach(a => {
      console.log(`   - ${a.teacher?.first_name} ${a.teacher?.last_name} → ${a.class?.name}`)
    })
  } else {
    console.log('⚠️  No class teacher assignments found')
  }
}

checkTeacherStructure().then(() => process.exit(0))
