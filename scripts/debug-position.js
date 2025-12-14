// Debug script to check class position calculation
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function debugPosition() {
  try {
    // Get current term
    const { data: termData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'current_term')
      .single()
    
    console.log('Current term:', termData?.setting_value)
    
    // Get a Basic 3 class
    const { data: classes } = await supabase
      .from('classes')
      .select('id, name')
      .ilike('name', '%Basic 3%')
    
    console.log('\nBasic 3 classes:', classes)
    
    if (classes && classes.length > 0) {
      const classId = classes[0].id
      
      // Get all students in this class
      const { data: students } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .eq('status', 'active')
      
      console.log(`\nTotal students in ${classes[0].name}:`, students?.length)
      
      if (students && students.length > 0) {
        const studentIds = students.map(s => s.id)
        
        // Get all scores for current term
        const { data: scores } = await supabase
          .from('scores')
          .select('student_id, subject_id, total, subjects(name)')
          .in('student_id', studentIds)
          .eq('term_id', termData.setting_value)
        
        console.log('\nTotal score records:', scores?.length)
        
        // Calculate totals per student
        const studentTotals = {}
        scores?.forEach(score => {
          if (!studentTotals[score.student_id]) {
            studentTotals[score.student_id] = { total: 0, count: 0, name: '' }
          }
          studentTotals[score.student_id].total += score.total || 0
          studentTotals[score.student_id].count += 1
        })
        
        // Add student names
        students.forEach(s => {
          if (studentTotals[s.id]) {
            studentTotals[s.id].name = `${s.first_name} ${s.last_name}`
          }
        })
        
        // Sort by total
        const sorted = Object.entries(studentTotals)
          .sort(([, a], [, b]) => b.total - a.total)
        
        console.log('\nClass Rankings:')
        sorted.forEach(([id, data], index) => {
          console.log(`${index + 1}. ${data.name} - Total: ${data.total} (${data.count} subjects)`)
        })
        
        console.log(`\nExpected display format: "1st / ${students.length}"`)
      }
    }
    
  } catch (error) {
    console.error('Error:', error)
  }
}

debugPosition()
