/**
 * READ-ONLY PRE-FLIGHT — Settings Sync (academic_settings vs system_settings)
 * =========================================================================
 * Confirms the current state of both settings tables so we can safely align
 * academic_settings to the authoritative system_settings values.
 *
 * This script performs ONLY SELECT queries. It writes/updates NOTHING.
 *
 * Usage:
 *   node scripts/preflight-settings-sync.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const line = (t) => console.log(t)

async function main() {
  line('============================================================')
  line(' PRE-FLIGHT: SETTINGS SYNC CHECK  (READ-ONLY)')
  line('============================================================')

  // 1. academic_settings single row
  // NOTE: use .maybeSingle() (same proven shape as diagnose-academic-years.js)
  // instead of .single(), which avoids the intermittent fetch-failed we saw.
  line('\n=== academic_settings (single row) ===')
  const { data: academic, error: ea } = await supabase
    .from('academic_settings')
    .select('*')
    .maybeSingle()
  if (ea) {
    line(`  ⚠️  ${ea.message}`)
    line('  (table may not exist or may have zero rows)')
  } else if (!academic) {
    line('  (no row found)')
  } else {
    line(`  id                       : ${academic.id}`)
    line(`  current_academic_year    : ${academic.current_academic_year || '(empty)'}`)
    line(`  current_term             : ${academic.current_term || '(empty)'}`)
    line(`  term_start_date          : ${academic.term_start_date || '(empty)'}`)
    line(`  term_end_date            : ${academic.term_end_date || '(empty)'}`)
    line(`  next_term_starts         : ${academic.next_term_starts || '(empty)'}`)
    line(`  school_reopening_date    : ${academic.school_reopening_date || '(empty)'}`)
    line(`  vacation_start_date      : ${academic.vacation_start_date || '(empty)'}`)
  }

  // 2. system_settings relevant keys
  line('\n=== system_settings (authoritative source) ===')
  const { data: sys, error: es } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['current_academic_year', 'current_term'])
  if (es) {
    line(`  ⚠️  ${es.message}`)
  } else {
    const map = new Map((sys || []).map((s) => [s.setting_key, s.setting_value]))
    line(`  current_academic_year    : ${map.get('current_academic_year') || '(empty)'}`)
    line(`  current_term (id)        : ${map.get('current_term') || '(empty)'}`)
  }

  // 3. Resolve the current_term id -> name + academic_year (to validate what
  //    academic_settings.current_term should be set to).
  line('\n=== Resolve current term id <-> name/academic_year ===')
  const termId = sys?.find((s) => s.setting_key === 'current_term')?.setting_value
  if (!termId) {
    line('  No current_term id in system_settings — cannot resolve.')
  } else {
    const { data: termData, error: et } = await supabase
      .from('academic_terms')
      .select('id, name, academic_year')
      .eq('id', termId)
      .maybeSingle()
    if (et || !termData) {
      line(`  ⚠️  Could not resolve term id ${termId}: ${et?.message || 'not found'}`)
    } else {
      line(`  id            : ${termData.id}`)
      line(`  name          : ${termData.name}`)
      line(`  academic_year : ${termData.academic_year}`)
      line(`  -> academic_settings.current_term should be: "${termData.name}"`)
      line(`  -> academic_settings.current_academic_year should be: "${termData.academic_year}"`)
    }
  }

  line('\nDONE. Nothing was written.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
