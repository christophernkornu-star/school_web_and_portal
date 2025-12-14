require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkBasic3() {
  console.log('=== Checking Basic 3 / Primary 3 Data ===\n')
  
  // Check class data
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('*')
    .or('name.ilike.%primary 3%,name.ilike.%basic 3%')
  
  if (classError) {
    console.error('Error fetching class:', classError)
  } else {
    console.log('Class Data:')
    console.log(JSON.stringify(classData, null, 2))
  }
  
  // Check subjects for lower_primary
  console.log('\n=== Lower Primary Subjects ===')
  const { data: subjectsData, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .eq('level', 'lower_primary')
  
  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError)
  } else {
    console.log('Found', subjectsData?.length || 0, 'lower_primary subjects:')
    subjectsData?.forEach(s => {
      console.log(`  - ${s.name} (${s.code}) - level: ${s.level}`)
    })
  }
  
  // Check teacher assignments for Primary 3
  if (classData && classData[0]) {
    const classId = classData[0].id
    console.log('\n=== Teacher Assignments for', classData[0].name, '===')
    const { data: assignmentsData, error: assignmentsError } = await supabase
      .from('teacher_subject_assignments')
      .select(`
        *,
        subjects(*),
        classes(*)
      `)
      .eq('class_id', classId)
    
    if (assignmentsError) {
      console.error('Error fetching assignments:', assignmentsError)
    } else {
      console.log('Found', assignmentsData?.length || 0, 'assignments')
      assignmentsData?.forEach(a => {
        console.log(`  - Subject: ${a.subjects?.name} (level: ${a.subjects?.level})`)
        console.log(`    Class: ${a.classes?.name} (level: ${a.classes?.level})`)
        console.log(`    Teacher ID: ${a.teacher_id}`)
      })
    }
  }
}

checkBasic3().then(() => process.exit(0))
