require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkKojoScores() {
  console.log('Checking Kojo Lamptey scores...\n')

  // Find Kojo's student record
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, first_name, last_name, student_id, class_id')
    .ilike('first_name', 'Kojo')
    .ilike('last_name', 'Lamptey')

  if (studentError) {
    console.error('Error finding student:', studentError)
    return
  }

  console.log('Student found:', students)

  if (!students || students.length === 0) {
    console.log('No student found with name Kojo Lamptey')
    return
  }

  const student = students[0]

  // Check scores with full details
  const { data: scores, error: scoresError } = await supabase
    .from('scores')
    .select(`
      *,
      academic_terms (
        name,
        academic_year
      ),
      subjects (
        name
      )
    `)
    .eq('student_id', student.id)

  if (scoresError) {
    console.error('Error fetching scores:', scoresError)
    return
  }

  console.log('\nScores found:', scores?.length || 0)
  console.log('\nScore details:')
  scores?.forEach((score, index) => {
    console.log(`\n${index + 1}. Subject: ${score.subjects?.name || 'Unknown'}`)
    console.log(`   Term: ${score.academic_terms?.name} ${score.academic_terms?.academic_year}`)
    console.log(`   Class Score: ${score.class_score}`)
    console.log(`   Exam Score: ${score.exam_score}`)
    console.log(`   Total: ${score.total}`)
    console.log(`   Grade: ${score.grade}`)
    console.log(`   Remarks: ${score.remarks}`)
  })

  // Check if there's a profile for this student
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, username, role')
    .eq('username', 'kojtey')

  console.log('\nProfile check:')
  if (profileError) {
    console.error('Error:', profileError)
  } else {
    console.log('Profile found:', profiles)
  }

  // Check if profile_id matches
  const { data: studentWithProfile, error: studentProfileError } = await supabase
    .from('students')
    .select('id, profile_id, first_name, last_name')
    .eq('id', student.id)
    .single()

  console.log('\nStudent profile_id:', studentWithProfile?.profile_id)
  console.log('Profile id from profiles table:', profiles?.[0]?.id)
  console.log('Do they match?', studentWithProfile?.profile_id === profiles?.[0]?.id)
}

checkKojoScores()
