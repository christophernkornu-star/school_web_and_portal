require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function assignTeacher() {
  try {
    console.log('Looking for teacher and Basic 3 class...\n')

    // Get the teacher
    const { data: teachers, error: teacherError } = await supabase
      .from('teachers')
      .select('id, teacher_id, profile_id, first_name, last_name')

    if (teacherError || !teachers || teachers.length === 0) {
      console.error('No teachers found:', teacherError)
      return
    }

    const teacher = teachers[0]
    console.log(`Found teacher: ${teacher.first_name} ${teacher.last_name} (UUID: ${teacher.id}, teacher_id: ${teacher.teacher_id})`)

    // Get Basic 3 class
    const { data: basicClass, error: classError } = await supabase
      .from('classes')
      .select('id, name, level')
      .ilike('name', '%basic 3%')
      .maybeSingle()

    if (classError || !basicClass) {
      console.error('Basic 3 class not found:', classError)
      return
    }

    console.log(`Found class: ${basicClass.name} (ID: ${basicClass.id})`)

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('teacher_class_assignments')
      .select('id')
      .eq('teacher_id', teacher.id)
      .eq('class_id', basicClass.id)
      .maybeSingle()

    if (existing) {
      console.log('\n✅ Teacher is already assigned to this class')
      return
    }

    // Create the assignment as class teacher (use UUID id, not teacher_id string)
    const { data: assignment, error: assignError } = await supabase
      .from('teacher_class_assignments')
      .insert({
        teacher_id: teacher.id,
        class_id: basicClass.id,
        is_class_teacher: true,
        is_primary: true
      })
      .select()

    if (assignError) {
      console.error('\n❌ Error assigning teacher:', assignError)
      return
    }

    console.log('\n✅ Successfully assigned teacher as class teacher of Basic 3')
    console.log(JSON.stringify(assignment, null, 2))
  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

assignTeacher()
