require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

// Use service role key to bypass RLS
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
console.log('Service key available:', !!serviceKey)
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey,
  { auth: { persistSession: false } }
)

async function fixDuplicateNames() {
  console.log('=== Fixing Duplicate Names in Profiles ===\n')
  
  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name')
  
  if (error) {
    console.error('Error fetching profiles:', error)
    return
  }
  
  console.log(`Found ${profiles.length} profiles`)
  
  let fixed = 0
  let skipped = 0
  
  for (const profile of profiles) {
    const name = profile.full_name
    
    if (!name) {
      skipped++
      continue
    }
    
    // Check if name has duplicate (e.g., "John Doe John Doe")
    const words = name.trim().split(/\s+/)
    const halfLength = Math.floor(words.length / 2)
    
    if (words.length % 2 === 0 && words.length > 2) {
      const firstHalf = words.slice(0, halfLength).join(' ')
      const secondHalf = words.slice(halfLength).join(' ')
      
      if (firstHalf === secondHalf) {
        console.log(`Fixing: "${name}" -> "${firstHalf}"`)
        
        const { data: updateData, error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: firstHalf })
          .eq('id', profile.id)
          .select()
        
        if (updateError) {
          console.error(`  Error updating ${profile.id}:`, updateError)
        } else {
          console.log(`  Updated successfully:`, updateData)
          fixed++
        }
      } else {
        skipped++
      }
    } else {
      skipped++
    }
  }
  
  console.log(`\nFixed: ${fixed}`)
  console.log(`Skipped: ${skipped}`)
}

fixDuplicateNames().then(() => process.exit(0))
