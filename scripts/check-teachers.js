require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTeachers() {
  console.log('\n=== Checking Teachers ===\n')
  
  const { data: teachers, error } = await supabase
    .from('teachers')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  console.log(`Total teachers: ${teachers?.length || 0}\n`)
  
  if (teachers && teachers.length > 0) {
    teachers.forEach(teacher => {
      console.log(`Teacher ID: ${teacher.teacher_id}`)
      console.log(`Name: ${teacher.first_name} ${teacher.last_name}`)
      console.log(`Status: ${teacher.status}`)
      console.log(`Hire Date: ${teacher.hire_date}`)
      console.log(`Specialization: ${teacher.specialization || 'N/A'}`)
      console.log('---')
    })
  } else {
    console.log('No teachers found in database')
  }
}

checkTeachers()
