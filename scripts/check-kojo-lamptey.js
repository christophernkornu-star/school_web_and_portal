require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkStudentAttendance() {
  const firstName = 'Kojo'
  const lastName = 'Lamptey'
  
  console.log(`Checking attendance for ${firstName} ${lastName}...\n`)

  // Get student
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*, profiles(*)')
    .eq('first_name', firstName)
    .eq('last_name', lastName)
    .single()

  if (studentError || !student) {
    console.log('❌ Student not found:', studentError?.message)
    return
  }

  console.log('Student Info:')
  console.log('  ID:', student.id)
  console.log('  Name:', `${student.first_name} ${student.last_name}`)
  console.log('  Student ID:', student.student_id)
  console.log('  Profile ID:', student.profile_id)
  console.log('  Username:', student.profiles?.username)
  console.log('  Email:', student.profiles?.email)

  // Check attendance records
  console.log('\n📊 Checking attendance records...')
  const { data: attendance, error: attError } = await supabase
    .from('student_attendance')
    .select(`
      *,
      academic_terms(name, academic_year, total_days),
      classes(name)
    `)
    .eq('student_id', student.id)

  console.log('Records found:', attendance?.length || 0)
  
  if (attError) {
    console.log('❌ Error:', attError.message)
  }

  if (attendance && attendance.length > 0) {
    console.log('\nAttendance Details:')
    attendance.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.academic_terms?.name} (${a.academic_terms?.academic_year})`)
      console.log(`     Class: ${a.classes?.name}`)
      console.log(`     Days: ${a.days_present}/${a.academic_terms?.total_days}`)
      console.log(`     Remarks: ${a.remarks || 'None'}`)
    })
  } else {
    console.log('\n⚠️ No attendance records found for this student')
    
    // Check if there are ANY records in the table
    const { data: allRecords, error: allError } = await supabase
      .from('student_attendance')
      .select('student_id, academic_terms(name)')
      .limit(5)

    console.log('\nSample records in student_attendance table:', allRecords?.length || 0)
    if (allRecords && allRecords.length > 0) {
      console.log('Student IDs in table:', allRecords.map(r => r.student_id.substring(0, 8)))
    }
  }

  // Test authentication
  console.log('\n🔐 Testing authentication...')
  const testClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const { data: authData, error: authError } = await testClient.auth.signInWithPassword({
    email: student.profiles.email,
    password: '28-02-2016' // From the earlier script output
  })

  if (authError) {
    console.log('❌ Auth failed:', authError.message)
  } else {
    console.log('✅ Auth successful')
    
    // Test query as authenticated user
    const { data: authAttendance, error: authAttError } = await testClient
      .from('student_attendance')
      .select(`
        *,
        academic_terms(name, academic_year, total_days),
        classes(name)
      `)
      .eq('student_id', student.id)

    console.log('Records accessible to authenticated user:', authAttendance?.length || 0)
    if (authAttError) {
      console.log('Error:', authAttError.message)
    }

    await testClient.auth.signOut()
  }

  console.log('\n' + '='.repeat(60))
  console.log('LOGIN CREDENTIALS:')
  console.log('Username:', student.profiles?.username)
  console.log('Password: 28-02-2016')
  console.log('='.repeat(60))
}

checkStudentAttendance().catch(console.error)
