const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStudents() {
  // Get Basic 3 class
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name')
    .eq('name', 'Basic 3')
    .single()
  
  console.log('Basic 3 class:', classes)
  
  if (classes) {
    const classId = classes.id
    
    // Get ALL students in this class (no status filter)
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, first_name, last_name, student_id, status')
      .eq('class_id', classId)
    
    console.log('\n=== ALL STUDENTS IN BASIC 3 ===')
    console.log('Total students:', allStudents?.length)
    console.log('\nStudent List:')
    allStudents?.forEach(s => {
      console.log(`- ${s.first_name} ${s.last_name} (${s.student_id}) - Status: "${s.status}"`)
    })
    
    // Count by status
    const statusCounts = {}
    allStudents?.forEach(s => {
      const status = s.status || 'NULL'
      statusCounts[status] = (statusCounts[status] || 0) + 1
    })
    
    console.log('\nStatus Breakdown:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- "${status}": ${count}`)
    })
  }
}

checkStudents()
