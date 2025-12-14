// Test script to verify login setup
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testLogin() {
  console.log('🔍 Testing Login Setup...\n')

  // Test 1: Check if profiles exist
  console.log('1️⃣ Checking profiles table...')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, username, full_name, role')
    .in('username', ['admin.francis', 'teacher.samuel', 'kofi.mensah'])

  if (profileError) {
    console.error('❌ Error querying profiles:', profileError.message)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('❌ No profiles found! You need to run insert-test-users.sql')
    console.log('\nRun this in Supabase SQL Editor:')
    console.log('👉 database/insert-test-users.sql')
    return
  }

  console.log(`✅ Found ${profiles.length} profiles:`)
  profiles.forEach(p => {
    console.log(`   - ${p.username} (${p.role}) - ${p.email}`)
  })

  // Test 2: Check auth users
  console.log('\n2️⃣ Checking auth users...')
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

  if (authError) {
    console.error('❌ Error listing auth users:', authError.message)
    return
  }

  const testEmails = [
    'admin@biriwa.edu.gh',
    'samuel.adjei@teacher.biriwa.edu.gh',
    'kofi.mensah@student.biriwa.edu.gh'
  ]

  const foundUsers = authUsers.users.filter(u => testEmails.includes(u.email))
  console.log(`✅ Found ${foundUsers.length} auth users:`)
  foundUsers.forEach(u => {
    console.log(`   - ${u.email} (ID: ${u.id.substring(0, 8)}...)`)
  })

  // Test 3: Try username lookup
  console.log('\n3️⃣ Testing username lookup...')
  const testUsername = 'admin.francis'
  const { data: profile, error: lookupError } = await supabase
    .from('profiles')
    .select('email, role, username')
    .eq('username', testUsername)
    .single()

  if (lookupError) {
    console.error(`❌ Error looking up username "${testUsername}":`, lookupError.message)
    return
  }

  console.log(`✅ Username lookup successful:`)
  console.log(`   Username: ${profile.username}`)
  console.log(`   Email: ${profile.email}`)
  console.log(`   Role: ${profile.role}`)

  // Test 4: Try actual login with one user
  console.log('\n4️⃣ Testing actual login with password...')
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: 'Admin123!'
  })

  if (signInError) {
    console.error('❌ Login failed:', signInError.message)
    console.log('\n💡 This could mean:')
    console.log('   1. The auth user password is different')
    console.log('   2. The auth users were created with different passwords')
    console.log('   3. You may need to reset the password in Supabase dashboard')
  } else {
    console.log('✅ Login successful!')
    console.log(`   User ID: ${signInData.user.id}`)
    console.log(`   Email: ${signInData.user.email}`)
  }

  console.log('\n📋 Summary:')
  console.log('─────────────────────────────────────')
  console.log(`Profiles created: ${profiles.length === 3 ? '✅' : '❌'}`)
  console.log(`Auth users exist: ${foundUsers.length === 3 ? '✅' : '❌'}`)
  console.log(`Username lookup: ${profile ? '✅' : '❌'}`)
  console.log(`Password login: ${!signInError ? '✅' : '❌'}`)
  
  if (profiles.length === 3 && foundUsers.length === 3 && !signInError) {
    console.log('\n🎉 All tests passed! Login should work.')
    console.log('\n📝 Test these credentials at http://localhost:3000/login:')
    console.log('   Admin: admin.francis / Admin123!')
    console.log('   Teacher: teacher.samuel / Teacher123!')
    console.log('   Student: kofi.mensah / Student123!')
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.')
  }
}

testLogin().catch(console.error)
