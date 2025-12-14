// Test if RLS policy is working
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Use the anon key to simulate student access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testRLS() {
  // Login as the student
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'efe.lamptey@example.com',
    password: '28-02-2016'
  })
  
  if (authError) {
    console.error('Login error:', authError)
    return
  }
  
  console.log('Logged in as:', authData.user?.email)
  
  // First check with service role key to see ALL scores
  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  
  const { data: allScores } = await adminSupabase
    .from('scores')
    .select('student_id, students!inner(class_id, first_name, last_name)')
    .eq('term_id', '8db2b137-a264-4d30-9549-70eb316d8103')
  
  console.log('\n=== ALL SCORES (ADMIN VIEW) ===')
  console.log('Total:', allScores?.length)
  
  const byClass = {}
  allScores?.forEach(s => {
    const classId = s.students.class_id
    if (!byClass[classId]) byClass[classId] = []
    byClass[classId].push(`${s.students.first_name} ${s.students.last_name}`)
  })
  
  Object.entries(byClass).forEach(([classId, students]) => {
    const unique = [...new Set(students)]
    console.log(`Class ${classId.substring(0,8)}: ${unique.length} students, ${students.length} scores`)
    unique.forEach(s => console.log(`  - ${s}`))
  })
  
  // Try to fetch all scores for Term 2 as student
  const { data: scores, error } = await supabase
    .from('scores')
    .select('student_id, total, students!inner(class_id, first_name, last_name)')
    .eq('term_id', '8db2b137-a264-4d30-9549-70eb316d8103')
  
  console.log('\n=== SCORES FETCHED ===')
  console.log('Total scores:', scores?.length)
  console.log('Error:', error)
  
  if (scores) {
    // Group by student
    const byStudent = {}
    scores.forEach(s => {
      const name = `${s.students.first_name} ${s.students.last_name}`
      if (!byStudent[name]) {
        byStudent[name] = 0
      }
      byStudent[name]++
    })
    
    console.log('\nScores by student:')
    Object.entries(byStudent).forEach(([name, count]) => {
      console.log(`- ${name}: ${count} subjects`)
    })
    
    // Count unique class IDs
    const classIds = [...new Set(scores.map(s => s.students.class_id))]
    console.log(`\nUnique classes: ${classIds.length}`)
    console.log('Class IDs:', classIds)
  }
  
  await supabase.auth.signOut()
}

testRLS()
