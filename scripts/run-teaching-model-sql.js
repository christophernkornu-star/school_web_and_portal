const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runSQL() {
  console.log('🚀 Running teaching model SQL implementation...\n')

  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, '..', 'database', 'implement-teaching-models.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log('📄 SQL file loaded successfully')
    console.log('📝 Executing SQL...\n')

    // Execute the SQL (Supabase RPC doesn't support multi-statement, so we need to split)
    // For now, let's execute via direct SQL connection or manually
    console.log('⚠️  Please execute the SQL manually in Supabase SQL Editor:')
    console.log('1. Go to Supabase Dashboard → SQL Editor')
    console.log('2. Create a new query')
    console.log('3. Copy the contents of database/implement-teaching-models.sql')
    console.log('4. Run the query\n')

    // Let's verify if the settings exist
    console.log('🔍 Checking current system settings...')
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', [
        'upper_primary_teaching_model',
        'lower_primary_teaching_model',
        'jhs_teaching_model'
      ])

    if (settingsError) {
      console.error('❌ Error checking settings:', settingsError.message)
    } else {
      if (settings && settings.length > 0) {
        console.log('✅ Found existing teaching model settings:')
        settings.forEach(s => {
          console.log(`   - ${s.setting_key}: ${s.setting_value}`)
        })
      } else {
        console.log('⚠️  No teaching model settings found yet')
        console.log('   Please run the SQL in Supabase Dashboard')
      }
    }

    console.log('\n🔍 Checking table structure...')
    
    // Check if columns exist
    const { data: classAssignments, error: caError } = await supabase
      .from('teacher_class_assignments')
      .select('*')
      .limit(1)

    if (caError) {
      console.log('⚠️  teacher_class_assignments table needs setup:', caError.message)
    } else if (classAssignments && classAssignments.length > 0) {
      const hasIsClassTeacher = 'is_class_teacher' in classAssignments[0]
      console.log(`   - is_class_teacher column: ${hasIsClassTeacher ? '✅ exists' : '❌ missing'}`)
    } else {
      console.log('   - teacher_class_assignments table exists but is empty')
    }

    const { data: subjectAssignments, error: saError } = await supabase
      .from('teacher_subject_assignments')
      .select('*')
      .limit(1)

    if (saError) {
      console.log('⚠️  teacher_subject_assignments table needs setup:', saError.message)
    } else if (subjectAssignments && subjectAssignments.length > 0) {
      const hasCanEdit = 'can_edit' in subjectAssignments[0]
      console.log(`   - can_edit column: ${hasCanEdit ? '✅ exists' : '❌ missing'}`)
    } else {
      console.log('   - teacher_subject_assignments table exists but is empty')
    }

    console.log('\n📋 Summary:')
    console.log('To complete the teaching model setup:')
    console.log('1. Execute database/implement-teaching-models.sql in Supabase')
    console.log('2. Verify functions exist: get_teaching_model_for_class, can_teacher_edit_subject')
    console.log('3. Test the teaching model configuration page at /admin/teaching-model')
    console.log('4. Assign teachers to classes with proper roles\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

runSQL()
