const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function createTeacherRecord() {
  console.log('🔍 Looking for teacher profile...\n')

  // Find the teacher profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', 'teacher.test@school.local')
    .single()

  if (profileError) {
    console.error('❌ Error finding profile:', profileError.message)
    console.log('\n⚠️  Make sure the teacher user exists in Authentication')
    return
  }

  console.log('✅ Found teacher profile:')
  console.log(`   - Username: ${profile.username}`)
  console.log(`   - Email: ${profile.email}`)
  console.log(`   - Profile ID: ${profile.id}\n`)

  // Check if teacher record already exists
  const { data: existingTeacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', profile.id)
    .single()

  if (existingTeacher) {
    console.log('✅ Teacher record already exists:')
    console.log(`   - Teacher ID: ${existingTeacher.teacher_id}`)
    console.log(`   - Name: ${existingTeacher.first_name} ${existingTeacher.last_name}`)
    return
  }

  // Create teacher record
  console.log('📝 Creating teacher record...')
  const { data: newTeacher, error: teacherError } = await supabase
    .from('teachers')
    .insert({
      profile_id: profile.id,
      first_name: 'Test',
      last_name: 'Teacher',
      phone: '+233200000000',
      specialization: 'General Studies',
      qualification: 'Bachelor of Education',
      hire_date: '2024-01-01',
      status: 'active'
    })
    .select()
    .single()

  if (teacherError) {
    console.error('❌ Error creating teacher record:', teacherError.message)
    return
  }

  console.log('\n✅ Teacher record created successfully!')
  console.log(`   - Teacher ID: ${newTeacher.teacher_id}`)
  console.log(`   - Name: ${newTeacher.first_name} ${newTeacher.last_name}`)
  console.log(`   - Status: ${newTeacher.status}`)
  
  console.log('\n📋 Now you need to assign this teacher as a class teacher:')
  console.log('   1. Go to Admin → Teachers')
  console.log('   2. Edit the teacher')
  console.log('   3. Assign them to a class with "Class Teacher" checked')
}

createTeacherRecord().then(() => process.exit(0))
