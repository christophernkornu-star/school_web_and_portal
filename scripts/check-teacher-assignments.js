const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTeacherAssignments() {
  console.log('Checking teacher class assignments...\n')
  
  // Get all teachers
  const { data: teachers, error: teacherError } = await supabase
    .from('teachers')
    .select('*')

  if (teacherError) {
    console.error('Error fetching teachers:', teacherError)
    return
  }

  console.log(`Found ${teachers.length} teachers\n`)

  for (const teacher of teachers) {
    console.log(`Teacher: ${teacher.first_name} ${teacher.last_name} (ID: ${teacher.teacher_id})`)
    
    // Get their class assignments
    const { data: assignments } = await supabase
      .from('teacher_class_assignments')
      .select('*, classes(name)')
      .eq('teacher_id', teacher.teacher_id)

    if (assignments && assignments.length > 0) {
      console.log('  Assigned classes:')
      assignments.forEach(a => {
        console.log(`    - ${a.classes.name}`)
      })
    } else {
      console.log('  No class assignments')
    }
    console.log('')
  }

  // Show Primary 3 info
  console.log('\nPrimary 3 Class Info:')
  const { data: primary3 } = await supabase
    .from('classes')
    .select('*')
    .eq('name', 'Primary 3')
    .single()

  if (primary3) {
    console.log(`  ID: ${primary3.id}`)
    console.log(`  Name: ${primary3.name}`)
  }
}

checkTeacherAssignments()
