const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkGradesTable() {
  console.log('Checking grades table structure...\n')

  // Get a sample grade record
  const { data: grades, error } = await supabaseAdmin
    .from('grades')
    .select('*')
    .limit(3)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Sample grades records:')
    console.log(JSON.stringify(grades, null, 2))
  }

  // Check if there's a scores table instead
  console.log('\n\nChecking scores table...')
  const { data: scores, error: scoresError } = await supabaseAdmin
    .from('scores')
    .select('*')
    .limit(3)

  if (scoresError) {
    console.error('Scores error:', scoresError.message)
  } else {
    console.log('Sample scores records:')
    console.log(JSON.stringify(scores, null, 2))
  }
}

checkGradesTable()
