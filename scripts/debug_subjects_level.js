
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSubjectsAndLevels() {
    console.log('Checking subjects and their levels...')
    const { data: subjects, error } = await supabase
        .from('subjects')
        .select('id, name, code, level')
        .order('name')
    
    if (error) {
        console.error('Error fetching subjects:', error)
        return
    }

    console.log(`Found ${subjects.length} subjects:`)
    subjects.forEach(s => {
        console.log(`- ${s.name} (${s.code}): Level='${s.level}'`)
    })
}

checkSubjectsAndLevels()
