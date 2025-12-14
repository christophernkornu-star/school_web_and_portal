const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkScores() {
  console.log('Checking scores table structure...\n')

  // Get sample scores
  const { data: scores, error } = await supabaseAdmin
    .from('scores')
    .select('*')
    .limit(5)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Sample scores:')
    console.log(JSON.stringify(scores, null, 2))
  }

  // Check if there's a subject_id column
  console.log('\n\nChecking if scores has subject relationships...')
  const { data: scoresWithSubject, error: error2 } = await supabaseAdmin
    .from('scores')
    .select('id, subject_name, subject_id, subjects(name)')
    .limit(3)

  if (error2) {
    console.error('Error with subject join:', error2.message)
  } else {
    console.log('Scores with subject join:')
    console.log(JSON.stringify(scoresWithSubject, null, 2))
  }
}

checkScores()
