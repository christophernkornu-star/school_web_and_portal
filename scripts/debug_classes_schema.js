
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkClassesTable() {
    console.log('Checking classes table schema and data...')
    
    // Check first 5 classes
    const { data: classes, error } = await supabase
        .from('classes')
        .select('*')
        .limit(5)
    
    if (classes) {
        console.log('Classes Data Sample:')
        classes.forEach(c => {
            console.log(`- Name: ${c.name}, Level: ${c.level} (Type: ${typeof c.level}), Category: ${c.category}`)
        })
    }
}

checkClassesTable()
