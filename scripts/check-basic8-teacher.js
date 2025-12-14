require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkBasic8Teacher() {
  console.log('=== Checking Basic 8 Teacher Setup ===\n')
  
  // Find Basic 8 class
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .ilike('name', '%basic 8%')
  
  if (classError) {
    console.error('Error fetching class:', classError)
    return
  }
  console.log('Basic 8 class:', JSON.stringify(classData, null, 2))
  
  if (!classData || classData.length === 0) {
    console.log('No Basic 8 class found')
    return
  }
  
  const classId = classData[0].id
  
  // Check teacher assignments for Basic 8
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      teachers(id, teacher_id, profile_id)
    `)
    .eq('class_id', classId)
  
  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError)
    return
  }
  console.log('\nTeacher Class Assignments for Basic 8:', JSON.stringify(assignmentsData, null, 2))
  
  // Check if there are any students in Basic 8
  const { data: studentsData, error: studentsError } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name')
    .eq('class_id', classId)
    .eq('status', 'active')
    .limit(5)
  
  if (studentsError) {
    console.error('Error fetching students:', studentsError)
    return
  }
  console.log('\nStudents in Basic 8:', JSON.stringify(studentsData, null, 2))
}

checkBasic8Teacher().then(() => process.exit(0))
