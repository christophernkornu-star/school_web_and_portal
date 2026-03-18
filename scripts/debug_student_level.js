
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugStudentLevel() {
    console.log('Fetching a student to check class level...')
    
    // Get first student
    const { data: studentIdData } = await supabase
        .from('students')
        .select('id')
        .limit(1)
        .single()
    
    if (!studentIdData) {
        console.log('No students found.')
        return
    }

    const studentId = studentIdData.id
    console.log(`Checking student ID: ${studentId}`)

    const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          first_name,
          middle_name,
          last_name,
          gender,
          date_of_birth,
          class_id,
          results_withheld,
          withheld_reason,
          classes (
            name,
            level
          ),
          profiles:profile_id (full_name)
        `)
        .eq('id', studentId)
        .single()

    if (studentError) {
        console.error('Error fetching student:', studentError)
    } else {
        console.log('Student Data:', JSON.stringify(studentData, null, 2))
        
        const classLevel = studentData.classes?.level || 0
        console.log('Class Level:', classLevel)
        
        let levelCategory = ''
        if (classLevel >= 1 && classLevel <= 2) levelCategory = 'kindergarten'
        else if (classLevel >= 3 && classLevel <= 5) levelCategory = 'lower_primary'
        else if (classLevel >= 6 && classLevel <= 8) levelCategory = 'upper_primary'
        else if (classLevel >= 9) levelCategory = 'jhs'
        
        console.log('Derived Level Category:', levelCategory)
    }
}

debugStudentLevel()
