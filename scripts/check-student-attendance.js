require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStudentAttendance() {
  console.log('Checking student attendance data...\n')

  // Get all students
  const { data: students } = await supabase
    .from('students')
    .select('id, first_name, last_name, profile_id, class_id')
    .order('first_name')

  console.log(`Found ${students?.length || 0} students\n`)

  // Check attendance for each student
  for (const student of students || []) {
    const { data: records } = await supabase
      .from('student_attendance')
      .select(`
        *,
        academic_terms(name, academic_year, total_days),
        classes(name)
      `)
      .eq('student_id', student.id)

    if (records && records.length > 0) {
      console.log(`✅ ${student.first_name} ${student.last_name} (ID: ${student.id.substring(0, 8)}...)`)
      console.log(`   Profile ID: ${student.profile_id?.substring(0, 8)}...`)
      console.log(`   Attendance records: ${records.length}`)
      records.forEach(r => {
        console.log(`   - ${r.academic_terms?.name}: ${r.days_present}/${r.academic_terms?.total_days} days in ${r.classes?.name}`)
      })
      console.log()
    } else {
      console.log(`❌ ${student.first_name} ${student.last_name} - No attendance records`)
    }
  }

  // Check if there are orphaned attendance records
  const { data: allRecords } = await supabase
    .from('student_attendance')
    .select('student_id')

  const studentIds = new Set((students || []).map(s => s.id))
  const orphaned = (allRecords || []).filter(r => !studentIds.has(r.student_id))
  
  if (orphaned.length > 0) {
    console.log(`\n⚠️ Warning: ${orphaned.length} orphaned attendance records (student not found)`)
  }
}

checkStudentAttendance().catch(console.error)
