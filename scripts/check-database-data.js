const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkDatabase() {
  console.log('🔍 Checking database tables...\n')

  // Check profiles
  console.log('1️⃣  PROFILES TABLE:')
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'teacher')
    .limit(3)

  if (pError) {
    console.error('   ❌ Error:', pError.message)
  } else if (profiles && profiles.length > 0) {
    console.log(`   ✅ Found ${profiles.length} teacher profiles:`)
    profiles.forEach(p => {
      console.log(`      - ${p.email} (ID: ${p.id})`)
    })
  } else {
    console.log('   ⚠️  No teacher profiles found')
  }

  // Check teachers
  console.log('\n2️⃣  TEACHERS TABLE:')
  const { data: teachers, error: tError } = await supabase
    .from('teachers')
    .select('*')
    .limit(3)

  if (tError) {
    console.error('   ❌ Error:', tError.message)
  } else if (teachers && teachers.length > 0) {
    console.log(`   ✅ Found ${teachers.length} teachers:`)
    console.log('   📋 Columns:', Object.keys(teachers[0]))
    teachers.forEach(t => {
      console.log(`      - ${t.first_name} ${t.last_name} (ID: ${t.id})`)
      if (t.user_id) console.log(`        User ID: ${t.user_id}`)
      if (t.profile_id) console.log(`        Profile ID: ${t.profile_id}`)
    })
  } else {
    console.log('   ⚠️  No teachers found')
  }

  // Check teacher_class_assignments
  console.log('\n3️⃣  TEACHER_CLASS_ASSIGNMENTS TABLE:')
  const { data: assignments, error: aError } = await supabase
    .from('teacher_class_assignments')
    .select('*')
    .eq('is_class_teacher', true)
    .limit(5)

  if (aError) {
    console.error('   ❌ Error:', aError.message)
  } else if (assignments && assignments.length > 0) {
    console.log(`   ✅ Found ${assignments.length} class teacher assignments`)
    console.log('   📋 Columns:', Object.keys(assignments[0]))
    assignments.forEach(a => {
      console.log(`      - Teacher ID: ${a.teacher_id} → Class ID: ${a.class_id}`)
    })
  } else {
    console.log('   ⚠️  No class teacher assignments found')
  }

  // Check classes
  console.log('\n4️⃣  CLASSES TABLE:')
  const { data: classes, error: cError } = await supabase
    .from('classes')
    .select('*')
    .limit(3)

  if (cError) {
    console.error('   ❌ Error:', cError.message)
  } else if (classes && classes.length > 0) {
    console.log(`   ✅ Found ${classes.length} classes:`)
    classes.forEach(c => {
      console.log(`      - ${c.name} (ID: ${c.id})`)
    })
  } else {
    console.log('   ⚠️  No classes found')
  }
}

checkDatabase().then(() => process.exit(0))
