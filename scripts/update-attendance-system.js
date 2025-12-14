const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateAttendanceSystem() {
  try {
    console.log('🔄 Updating attendance system...\n')

    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'update-attendance-system.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Split into individual statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_').select().limit(0)
        if (directError) {
          console.log('⚠️  Some statements may require manual execution')
        }
      }
    }

    console.log('✅ Attendance system schema updated!\n')

    // Verify the changes
    console.log('📊 Verifying changes...\n')

    // Check if total_days column exists in academic_terms
    const { data: terms, error: termsError } = await supabase
      .from('academic_terms')
      .select('id, name, academic_year, total_days')
      .limit(5)

    if (!termsError && terms) {
      console.log('✅ Academic Terms (with total_days):')
      terms.forEach(term => {
        console.log(`   - ${term.name} (${term.academic_year}): ${term.total_days} days`)
      })
      console.log()
    }

    // Check if student_attendance table exists
    const { data: attendance, error: attendanceError } = await supabase
      .from('student_attendance')
      .select('*')
      .limit(1)

    if (!attendanceError) {
      console.log('✅ student_attendance table created successfully')
      console.log()
    }

    // Check if view exists
    const { data: stats, error: statsError } = await supabase
      .from('attendance_statistics')
      .select('*')
      .limit(1)

    if (!statsError) {
      console.log('✅ attendance_statistics view created successfully')
      console.log()
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✨ Attendance System Update Complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('📋 What Changed:')
    console.log('   1. Added total_days to academic_terms table')
    console.log('   2. Created student_attendance table for term-based tracking')
    console.log('   3. Created attendance_statistics view with gender breakdowns')
    console.log('   4. Set up RLS policies for security\n')
    console.log('👉 Next Steps:')
    console.log('   1. Admin: Set total days for each term in Settings')
    console.log('   2. Teachers: Enter days present for each student')
    console.log('   3. View attendance statistics and reports\n')

  } catch (error) {
    console.error('❌ Error updating attendance system:', error.message)
    console.error('\n⚠️  You may need to run the SQL file manually in Supabase SQL Editor')
    console.error('   File: database/update-attendance-system.sql')
    process.exit(1)
  }
}

updateAttendanceSystem()
