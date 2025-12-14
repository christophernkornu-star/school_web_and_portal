require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Test with service role (bypass RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Test with anon key (RLS enforced)
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testStudentRLS() {
  console.log('Testing RLS for Araba Quaye...\n')

  const studentProfileId = '5a42b96c-0400-4796-b4ad-2053690742ad'
  const studentId = '4be024d6-fc40-431a-9f73-859864e8dd34'

  // Test 1: Service role can see the records
  console.log('1. Testing with Service Role (bypass RLS):')
  const { data: adminData, error: adminError } = await supabaseAdmin
    .from('student_attendance')
    .select(`
      *,
      academic_terms(name, academic_year, total_days),
      classes(name)
    `)
    .eq('student_id', studentId)

  console.log('   Records found:', adminData?.length || 0)
  if (adminError) console.log('   Error:', adminError)
  if (adminData && adminData.length > 0) {
    console.log('   Sample:', {
      term: adminData[0].academic_terms?.name,
      days: `${adminData[0].days_present}/${adminData[0].academic_terms?.total_days}`,
      class: adminData[0].classes?.name
    })
  }

  // Test 2: Sign in as the student
  console.log('\n2. Signing in as Araba Quaye...')
  
  // First get the student's email
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .eq('id', studentProfileId)
    .single()

  if (!profile) {
    console.log('   ❌ Could not find profile')
    return
  }

  console.log('   Email:', profile.email)

  // Try to sign in
  const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword({
    email: profile.email,
    password: 'Student123!' // Default password
  })

  if (authError) {
    console.log('   ❌ Sign in failed:', authError.message)
    console.log('\n   Trying to get user by profile_id instead...')
    
    // Test with manual auth.uid() simulation
    console.log('\n3. Testing RLS policy directly:')
    const { data: policyTest, error: policyError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as count
        FROM student_attendance
        WHERE student_id IN (
          SELECT id FROM students WHERE profile_id = '${studentProfileId}'
        )
      `
    }).catch(err => {
      console.log('   RPC not available, testing differently...')
      return { data: null, error: null }
    })

    // Direct query as if we were the student
    const { data: students } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('profile_id', studentProfileId)
    
    console.log('   Student IDs for profile:', students?.map(s => s.id) || [])

    if (students && students.length > 0) {
      const { data: directData, error: directError } = await supabaseAdmin
        .from('student_attendance')
        .select(`
          *,
          academic_terms(name, academic_year, total_days),
          classes(name)
        `)
        .eq('student_id', students[0].id)

      console.log('   Direct query found:', directData?.length || 0, 'records')
      if (directError) console.log('   Error:', directError)
    }

    return
  }

  console.log('   ✅ Signed in successfully')
  console.log('   User ID:', authData.user?.id)

  // Test 3: Query as authenticated student
  console.log('\n3. Querying as authenticated student:')
  
  // Get student record first
  const { data: studentRecord, error: studentError } = await supabaseClient
    .from('students')
    .select('id, first_name, last_name')
    .eq('profile_id', authData.user.id)
    .single()

  console.log('   Student record:', studentRecord ? `${studentRecord.first_name} ${studentRecord.last_name}` : 'NOT FOUND')
  if (studentError) console.log('   Error:', studentError)

  // Now query attendance
  const { data: clientData, error: clientError } = await supabaseClient
    .from('student_attendance')
    .select(`
      *,
      academic_terms(name, academic_year, total_days),
      classes(name)
    `)
    .eq('student_id', studentRecord?.id)

  console.log('   Attendance records found:', clientData?.length || 0)
  if (clientError) {
    console.log('   ❌ Error:', clientError.message)
    console.log('   Details:', clientError)
  }
  if (clientData && clientData.length > 0) {
    console.log('   ✅ Data:', clientData.map(r => ({
      term: r.academic_terms?.name,
      days: `${r.days_present}/${r.academic_terms?.total_days}`,
      class: r.classes?.name
    })))
  }

  // Sign out
  await supabaseClient.auth.signOut()
}

testStudentRLS().catch(console.error)
