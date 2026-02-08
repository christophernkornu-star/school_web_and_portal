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
  console.log('🚀 Creating test users for Biriwa Methodist School...\n')

  // 1. CREATE ADMIN USER
  console.log('👤 Creating Admin User...')
  try {
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: 'admin@biriwa.edu.gh',
      password: 'Admin123!',
      email_confirm: true
    })

    if (adminAuthError) {
      if (adminAuthError.message.includes('already registered')) {
        console.log('ℹ️  Admin user already exists')
      } else {
        console.error('❌ Admin auth error:', adminAuthError.message)
      }
    } else {
      console.log('✅ Admin created successfully!')
      console.log('   Email: admin@biriwa.edu.gh')
      console.log('   Username: admin.francis')
      console.log('   Password: Admin123!')
      console.log('   User ID:', adminAuth.user.id, '\n')
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
      email_confirm: true
    })

    if (teacherAuthError) {
      if (teacherAuthError.message.includes('already registered')) {
        console.log('ℹ️  Teacher user already exists')
      } else {
        console.error('❌ Teacher auth error:', teacherAuthError.message)
      }
    } else {
      console.log('✅ Teacher created successfully!')
      console.log('   Email: samuel.adjei@teacher.biriwa.edu.gh')
      console.log('   Username: teacher.samuel')
      console.log('   Password: Teacher123!')
      console.log('   User ID:', teacherAuth.user.id, '\n')
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
      email_confirm: true
    })

    if (studentAuthError) {
      if (studentAuthError.message.includes('already registered')) {
        console.log('ℹ️  Student user already exists')
      } else {
        console.error('❌ Student auth error:', studentAuthError.message)
      }
    } else {
      console.log('✅ Student created successfully!')
      console.log('   Email: kofi.mensah@student.biriwa.edu.gh')
      console.log('   Username: kofi.mensah')
      console.log('   Password: Student123!')
      console.log('   User ID:', studentAuth.user.id, '\n')
    }
  } catch (error) {
    console.error('❌ Student creation failed:', error.message)
  }

  console.log('═══════════════════════════════════════════')
  console.log('✨ User creation completed!')
  console.log('═══════════════════════════════════════════')
  console.log('\n📝 IMPORTANT NEXT STEPS:')
  console.log('1. Go to Supabase Dashboard: https://okfawhokrtkaibhbcjdk.supabase.co')
  console.log('2. Navigate to: SQL Editor')
  console.log('3. Run the following SQL to create profiles:\n')
  console.log(`-- Copy the User IDs from above and run this SQL:

-- For Admin (replace USER_ID with actual ID from above)
INSERT INTO profiles (id, email, username, full_name, role)
VALUES ('ADMIN_USER_ID', 'admin@biriwa.edu.gh', 'admin.francis', 'Mr. Francis Owusu', 'admin');

-- For Teacher (replace USER_ID with actual ID from above)
INSERT INTO profiles (id, email, username, full_name, role)
VALUES ('TEACHER_USER_ID', 'samuel.adjei@teacher.biriwa.edu.gh', 'teacher.samuel', 'Mr. Samuel Adjei', 'teacher');

INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, phone, specialization, qualification, hire_date)
VALUES ('TEACHER_USER_ID', 'TCH2024001', 'Samuel', 'Adjei', '+233201234567', 'Mathematics & Science', 'Bachelor of Education (B.Ed) - Mathematics', '2020-09-01');

-- For Student (replace USER_ID and CLASS_ID with actual IDs)
INSERT INTO profiles (id, email, username, full_name, role)
VALUES ('STUDENT_USER_ID', 'kofi.mensah@student.biriwa.edu.gh', 'kofi.mensah', 'Kofi Mensah', 'student');

INSERT INTO students (profile_id, student_id, first_name, last_name, date_of_birth, gender, class_id, guardian_name, guardian_phone, guardian_email, admission_date)
SELECT 'STUDENT_USER_ID', 'STU2024001', 'Kofi', 'Mensah', '2014-03-15', 'Male', id, 'Mr. Emmanuel Mensah', '+233244567890', 'emmanuel.mensah@email.com', '2020-09-01'
FROM classes WHERE name = 'Primary 4';
`)
  console.log('\n📋 Login Credentials:')
  console.log('─────────────────────────────────────────')
  console.log('ADMIN:     Username: admin.francis      | Password: Admin123!')
  console.log('TEACHER:   Username: teacher.samuel    | Password: Teacher123!')
  console.log('STUDENT:   Username: kofi.mensah       | Password: Student123!')
  console.log('─────────────────────────────────────────')
  console.log('\n🌐 Test login at: http://localhost:3000/login\n')
}

// Run the script
createTestUsers().catch(console.error)
