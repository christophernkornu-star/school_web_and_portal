const path = require('path')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load .env.local from repo root when available
const envPath = path.resolve(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const REQUIRED_TERM_ID = 'c46e91df-2cae-434e-b5b3-b3cf057d0b31'

async function ensureCurrentTerm() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set before running this script.')
  }

  const supabase = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('🔎 Checking academic_terms table...')
  const { data: existingTerm, error: checkError } = await supabase
    .from('academic_terms')
    .select('id')
    .eq('id', REQUIRED_TERM_ID)
    .maybeSingle()

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Failed to inspect academic_terms: ${checkError.message}`)
  }

  if (!existingTerm) {
    console.log('ℹ️  Required term missing. Creating default Term 1 (2024/2025)...')
    const defaultTerm = {
      id: REQUIRED_TERM_ID,
      name: 'Term 1',
      academic_year: '2024/2025',
      start_date: '2024-09-01',
      end_date: '2024-12-15',
      total_days: 90,
      is_current: true
    }

    const { error: insertError } = await supabase
      .from('academic_terms')
      .insert(defaultTerm)

    if (insertError) {
      throw new Error(`Failed to insert default term: ${insertError.message}`)
    }

    console.log('✅ Inserted default term record.')
  } else {
    console.log('✅ Required term already exists.')
    // Make sure it is marked as current
    const { error: flagError } = await supabase
      .from('academic_terms')
      .update({ is_current: true })
      .eq('id', REQUIRED_TERM_ID)

    if (flagError) {
      throw new Error(`Failed to mark term as current: ${flagError.message}`)
    }
  }

  console.log('🔧 Ensuring system_settings.current_term matches the required term...')
  const { data: existingSetting, error: loadSettingError } = await supabase
    .from('system_settings')
    .select('setting_key')
    .eq('setting_key', 'current_term')
    .maybeSingle()

  if (loadSettingError && loadSettingError.code !== 'PGRST116') {
    throw new Error(`Failed to inspect system_settings: ${loadSettingError.message}`)
  }

  if (existingSetting) {
    const { error: updateError } = await supabase
      .from('system_settings')
      .update({
        setting_value: REQUIRED_TERM_ID,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'current_term')

    if (updateError) {
      throw new Error(`Failed to update current_term: ${updateError.message}`)
    }
  } else {
    const { error: insertSettingError } = await supabase
      .from('system_settings')
      .insert({
        setting_key: 'current_term',
        setting_value: REQUIRED_TERM_ID,
        setting_type: 'text',
        description: 'Currently active academic term'
      })

    if (insertSettingError) {
      throw new Error(`Failed to insert current_term: ${insertSettingError.message}`)
    }
  }

  console.log('🎯 current_term now points to the default academic term.')
}

ensureCurrentTerm()
  .then(() => {
    console.log('Done!')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌', err.message)
    process.exit(1)
  })
