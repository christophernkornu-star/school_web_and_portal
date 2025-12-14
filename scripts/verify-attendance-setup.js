const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifySetup() {
  console.log('🔍 Verifying attendance system setup...\n')

  // 1. Check teacher record
  console.log('1️⃣  Checking teacher record...')
  const { data: teacher } = await supabase
    .from('teachers')
    .select('*')
    .eq('profile_id', '0a6c6272-9a1b-45cb-97af-c7431110ff72')
    .single()

  if (teacher) {
    console.log('   ✅ Teacher record found')
    console.log(`      ID: ${teacher.id}`)
    console.log(`      Teacher ID: ${teacher.teacher_id}`)
    console.log(`      Name: ${teacher.first_name} ${teacher.last_name}\n`)
  } else {
    console.log('   ❌ Teacher record not found\n')
    return
  }

  // 2. Check class assignments
  console.log('2️⃣  Checking class assignments...')
  const { data: assignments } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      classes (
        id,
        name
      )
    `)
    .eq('teacher_id', teacher.id)
    .eq('is_class_teacher', true)

  if (assignments && assignments.length > 0) {
    console.log(`   ✅ Found ${assignments.length} class teacher assignment(s)`)
    assignments.forEach(a => {
      console.log(`      - ${a.classes.name} (${a.academic_year})`)
    })
    console.log()
  } else {
    console.log('   ❌ No class teacher assignments found\n')
    return
  }

  // 3. Check students in assigned classes
  console.log('3️⃣  Checking students in assigned classes...')
  for (const assignment of assignments) {
    const { data: students, count } = await supabase
      .from('students')
      .select('id, first_name, last_name, gender', { count: 'exact' })
      .eq('class_id', assignment.classes.id)

    console.log(`   ${assignment.classes.name}:`)
    if (students && students.length > 0) {
      console.log(`      ✅ ${count} student(s) found`)
      students.slice(0, 3).forEach(s => {
        console.log(`         - ${s.first_name} ${s.last_name} (${s.gender})`)
      })
      if (count > 3) {
        console.log(`         ... and ${count - 3} more`)
      }
    } else {
      console.log('      ⚠️  No students found')
      console.log('      💡 You may need to add students to this class')
    }
    console.log()
  }

  // 4. Check current term
  console.log('4️⃣  Checking current academic term...')
  const { data: currentTerm } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('is_current', true)
    .single()

  if (currentTerm) {
    console.log('   ✅ Current term found')
    console.log(`      Name: ${currentTerm.name}`)
    console.log(`      Year: ${currentTerm.academic_year}`)
    console.log(`      Total Days: ${currentTerm.total_days || 'Not set'}\n`)
    
    if (!currentTerm.total_days || currentTerm.total_days === 0) {
      console.log('   ⚠️  WARNING: Total days not set for current term!')
      console.log('      Go to Admin → Settings → Attendance Settings to set total days\n')
    }
  } else {
    console.log('   ❌ No current term found\n')
  }

  // 5. Summary
  console.log('📋 SUMMARY:')
  console.log('=' . repeat(50))
  console.log(`Teacher Record: ${teacher ? '✅' : '❌'}`)
  console.log(`Class Assignment: ${assignments && assignments.length > 0 ? '✅' : '❌'}`)
  console.log(`Students in Class: ${assignments && assignments[0] ? '✅' : '⚠️'}`)
  console.log(`Current Term: ${currentTerm ? '✅' : '❌'}`)
  console.log(`Total Days Set: ${currentTerm && currentTerm.total_days > 0 ? '✅' : '❌'}`)
  console.log('=' . repeat(50))
  
  if (teacher && assignments && assignments.length > 0 && currentTerm) {
    console.log('\n✨ System ready! Next steps:')
    console.log('   1. Set total days: Admin → Settings → Attendance Settings')
    console.log('   2. Mark attendance: Teacher → Mark Attendance')
    console.log('   3. Select class: KG 1')
    console.log('   4. Enter days present for each student')
    console.log('   5. Click Save Attendance')
  }
}

verifySetup().then(() => process.exit(0))
