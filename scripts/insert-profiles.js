// Insert user profiles into database
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

async function insertProfiles() {
  console.log('📝 Inserting user profiles...\n')

  // Insert admin profile
  console.log('1️⃣ Inserting admin profile...')
  const { error: adminError } = await supabase
    .from('profiles')
    .upsert({
      id: '53e02371-6b79-4cda-9d93-792c1f998eb3',
      email: 'admin@biriwa.edu.gh',
      username: 'admin.francis',
      full_name: 'Mr. Francis Owusu',
      role: 'admin'
    }, { onConflict: 'id' })

  if (adminError) {
    console.error('❌ Admin profile error:', adminError.message)
  } else {
    console.log('✅ Admin profile created')
  }

  // Insert teacher profile
  console.log('\n2️⃣ Inserting teacher profile...')
  const { error: teacherProfileError } = await supabase
    .from('profiles')
    .upsert({
      id: 'd77abc0e-c525-46ef-9ba1-23b9f9289bae',
      email: 'samuel.adjei@teacher.biriwa.edu.gh',
      username: 'teacher.samuel',
      full_name: 'Mr. Samuel Adjei',
      role: 'teacher'
    }, { onConflict: 'id' })

  if (teacherProfileError) {
    console.error('❌ Teacher profile error:', teacherProfileError.message)
  } else {
    console.log('✅ Teacher profile created')
  }

  // Insert teacher record
  console.log('   Inserting teacher record...')
  const { error: teacherRecordError } = await supabase
    .from('teachers')
    .upsert({
      profile_id: 'd77abc0e-c525-46ef-9ba1-23b9f9289bae',
      teacher_id: 'TCH2024001',
      first_name: 'Samuel',
      last_name: 'Adjei',
      phone: '+233201234567',
      specialization: 'Mathematics & Science',
      qualification: 'Bachelor of Education (B.Ed) - Mathematics',
      hire_date: '2020-09-01'
    }, { onConflict: 'profile_id' })

  if (teacherRecordError) {
    console.error('❌ Teacher record error:', teacherRecordError.message)
  } else {
    console.log('✅ Teacher record created')
  }

  // Insert student profile
  console.log('\n3️⃣ Inserting student profile...')
  const { error: studentProfileError } = await supabase
    .from('profiles')
    .upsert({
      id: '9d1f97be-76c7-405c-a382-765fb3e25df3',
      email: 'kofi.mensah@student.biriwa.edu.gh',
      username: 'kofi.mensah',
      full_name: 'Kofi Mensah',
      role: 'student'
    }, { onConflict: 'id' })

  if (studentProfileError) {
    console.error('❌ Student profile error:', studentProfileError.message)
  } else {
    console.log('✅ Student profile created')
  }

  // Get Primary 4 class ID
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id')
    .eq('name', 'Primary 4')
    .single()

  if (classError || !classData) {
    console.error('❌ Could not find Primary 4 class:', classError?.message)
    return
  }

  // Insert student record
  console.log('   Inserting student record...')
  const { error: studentRecordError } = await supabase
    .from('students')
    .upsert({
      profile_id: '9d1f97be-76c7-405c-a382-765fb3e25df3',
      student_id: 'STU2024001',
      first_name: 'Kofi',
      last_name: 'Mensah',
      date_of_birth: '2014-03-15',
      gender: 'Male',
      class_id: classData.id,
      guardian_name: 'Mr. Emmanuel Mensah',
      guardian_phone: '+233244567890',
      guardian_email: 'emmanuel.mensah@email.com',
      admission_date: '2020-09-01'
    }, { onConflict: 'profile_id' })

  if (studentRecordError) {
    console.error('❌ Student record error:', studentRecordError.message)
  } else {
    console.log('✅ Student record created')
  }

  // Verify all profiles
  console.log('\n4️⃣ Verifying profiles...')
  const { data: profiles, error: verifyError } = await supabase
    .from('profiles')
    .select('username, email, full_name, role')
    .in('username', ['admin.francis', 'teacher.samuel', 'kofi.mensah'])

  if (verifyError) {
    console.error('❌ Verification error:', verifyError.message)
    return
  }

  console.log('\n✅ All profiles created successfully:\n')
  profiles.forEach(p => {
    console.log(`   ${p.username} - ${p.full_name} (${p.role})`)
  })

  console.log('\n🎉 Setup complete! You can now login at http://localhost:3000/login')
  console.log('\n📝 Test credentials:')
  console.log('   Admin: admin.francis / Admin123!')
  console.log('   Teacher: teacher.samuel / Teacher123!')
  console.log('   Student: kofi.mensah / Student123!')
}

insertProfiles().catch(console.error)
