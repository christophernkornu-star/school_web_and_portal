require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testNewCredentials() {
  console.log('Testing new credentials for Araba Quaye...\n')

  const username = 'araaye'
  const password = '30-03-2016'

  // Step 1: Look up profile
  console.log('1. Looking up profile by username:', username)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('username', username)
    .single()

  if (profileError) {
    console.log('❌ Profile not found:', profileError.message)
    return
  }

  console.log('✅ Profile found:', profile)

  // Step 2: Sign in with email
  console.log('\n2. Signing in with email:', profile.email)
  console.log('   Password:', password)

  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: password
  })

  if (error) {
    console.log('❌ Sign in failed:', error.message)
    console.log('Full error:', error)
  } else {
    console.log('✅ Sign in successful!')
    console.log('User:', {
      id: data.user?.id,
      email: data.user?.email,
      role: data.user?.role
    })

    // Step 3: Test attendance query
    console.log('\n3. Testing attendance query...')
    
    const { data: student } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('profile_id', data.user.id)
      .single()

    console.log('Student record:', student)

    if (student) {
      const { data: attendance, error: attError } = await supabase
        .from('student_attendance')
        .select(`
          *,
          academic_terms(name, academic_year, total_days),
          classes(name)
        `)
        .eq('student_id', student.id)

      console.log('Attendance records:', attendance?.length || 0)
      if (attendance && attendance.length > 0) {
        attendance.forEach(a => {
          console.log(`  - ${a.academic_terms?.name}: ${a.days_present}/${a.academic_terms?.total_days} days in ${a.classes?.name}`)
        })
      }
      if (attError) {
        console.log('Attendance error:', attError.message)
      }
    }

    await supabase.auth.signOut()
  }

  console.log('\n' + '='.repeat(50))
  console.log('TEST CREDENTIALS:')
  console.log('='.repeat(50))
  console.log('Username:', username)
  console.log('Password:', password)
  console.log('='.repeat(50))
}

testNewCredentials().catch(console.error)
