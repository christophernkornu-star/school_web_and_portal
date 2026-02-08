const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client with service role key
require('dotenv').config({ path: '.env.local' })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function createTestUsers() {
  console.log('🚀 Starting user creation...\n')

  // Get class IDs first
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name')
  
  if (classError) {
    console.error('❌ Error fetching classes:', classError)
    return
  }

  const primary4Class = classes.find(c => c.name === 'Primary 4')
  
  if (!primary4Class) {
    console.error('❌ Primary 4 class not found. Please run the schema migration first.')
    return
  }

  // 1. CREATE ADMIN USER
  console.log('👤 Creating Admin User...')
  try {
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin@biriwa.edu.gh',
      password: 'Admin123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Mr. Francis Owusu'
      }
    })

    if (adminAuthError) {
      console.error('❌ Admin auth error:', adminAuthError.message)
    } else {
      // Create profile
      const { error: adminProfileError } = await supabase
        .from('profiles')
        .insert({
          id: adminAuth.user.id,
          email: 'admin@biriwa.edu.gh',
          username: 'admin.francis',
          full_name: 'Mr. Francis Owusu',
          role: 'admin'
        })

      if (adminProfileError) {
        console.error('❌ Admin profile error:', adminProfileError.message)
      } else {
        console.log('✅ Admin created successfully!')
        console.log('   Email: admin@biriwa.edu.gh')
        console.log('   Username: admin.francis')
        console.log('   Password: Admin123!\n')
      }
    }
  } catch (error) {
    console.error('❌ Admin creation failed:', error.message)
  }

  // 2. CREATE TEACHER USER
  console.log('👨‍🏫 Creating Teacher User...')
  try {
    const { data: teacherAuth, error: teacherAuthError } = await supabase.auth.admin.createUser({
      email: 'samuel.adjei@teacher.biriwa.edu.gh',
      password: 'Teacher123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Mr. Samuel Adjei'
      }
    })

    if (teacherAuthError) {
      console.error('❌ Teacher auth error:', teacherAuthError.message)
    } else {
      // Create profile
      const { error: teacherProfileError } = await supabase
        .from('profiles')
        .insert({
          id: teacherAuth.user.id,
          email: 'samuel.adjei@teacher.biriwa.edu.gh',
          username: 'teacher.samuel',
          full_name: 'Mr. Samuel Adjei',
          role: 'teacher'
        })

      if (teacherProfileError) {
        console.error('❌ Teacher profile error:', teacherProfileError.message)
      } else {
        // Create teacher record
        const { error: teacherRecordError } = await supabase
          .from('teachers')
          .insert({
            profile_id: teacherAuth.user.id,
            teacher_id: 'TCH2024001',
            first_name: 'Samuel',
            last_name: 'Adjei',
            phone: '+233201234567',
            specialization: 'Mathematics & Science',
            qualification: 'Bachelor of Education (B.Ed) - Mathematics',
            hire_date: '2020-09-01'
          })

        if (teacherRecordError) {
          console.error('❌ Teacher record error:', teacherRecordError.message)
        } else {
          console.log('✅ Teacher created successfully!')
          console.log('   Email: samuel.adjei@teacher.biriwa.edu.gh')
          console.log('   Username: teacher.samuel')
          console.log('   Password: Teacher123!\n')
        }
      }
    }
  } catch (error) {
    console.error('❌ Teacher creation failed:', error.message)
  }

  // 3. CREATE STUDENT USER
  console.log('👨‍🎓 Creating Student User...')
  try {
    const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
      email: 'kofi.mensah@student.biriwa.edu.gh',
      password: 'Student123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Kofi Mensah'
      }
    })

    if (studentAuthError) {
      console.error('❌ Student auth error:', studentAuthError.message)
    } else {
      // Create profile
      const { error: studentProfileError } = await supabase
        .from('profiles')
        .insert({
          id: studentAuth.user.id,
          email: 'kofi.mensah@student.biriwa.edu.gh',
          username: 'kofi.mensah',
          full_name: 'Kofi Mensah',
          role: 'student'
        })

      if (studentProfileError) {
        console.error('❌ Student profile error:', studentProfileError.message)
      } else {
        // Create student record
        const { error: studentRecordError } = await supabase
          .from('students')
          .insert({
            profile_id: studentAuth.user.id,
            student_id: 'STU2024001',
            first_name: 'Kofi',
            last_name: 'Mensah',
            date_of_birth: '2014-03-15',
            gender: 'Male',
            class_id: primary4Class.id,
            guardian_name: 'Mr. Emmanuel Mensah',
            guardian_phone: '+233244567890',
            guardian_email: 'emmanuel.mensah@email.com',
            admission_date: '2020-09-01'
          })

        if (studentRecordError) {
          console.error('❌ Student record error:', studentRecordError.message)
        } else {
          console.log('✅ Student created successfully!')
          console.log('   Email: kofi.mensah@student.biriwa.edu.gh')
          console.log('   Username: kofi.mensah')
          console.log('   Password: Student123!')
          console.log('   Class: Primary 4\n')
        }
      }
    }
  } catch (error) {
    console.error('❌ Student creation failed:', error.message)
  }

  console.log('✨ User creation process completed!')
  console.log('\n📝 Login Credentials Summary:')
  console.log('─────────────────────────────────────────')
  console.log('ADMIN:')
  console.log('  Username: admin.francis')
  console.log('  Password: Admin123!')
  console.log('\nTEACHER:')
  console.log('  Username: teacher.samuel')
  console.log('  Password: Teacher123!')
  console.log('\nSTUDENT:')
  console.log('  Username: kofi.mensah')
  console.log('  Password: Student123!')
  console.log('─────────────────────────────────────────')
  console.log('\n🌐 Test at: http://localhost:3000/login')
}

// Run the script
createTestUsers().catch(console.error)
