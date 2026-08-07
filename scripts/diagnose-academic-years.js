/**
 * READ-ONLY DIAGNOSTIC — Academic Year Data Audit
 * ================================================
 * Purpose: Identify where the inconsistent academic-year strings come from
 *          (e.g. 2026/27, 2027/2028, 2026, 2026/2027, 2025/26) and whether
 *          they are genuine terms or orphan records.
 *
 * This script performs ONLY SELECT queries. It writes/updates NOTHING.
 *
 * Usage:
 *   node scripts/diagnose-academic-years.js
 *
 * Requires:
 *   - @supabase/supabase-js (already in package.json)
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *     (service role key so we can read all tables regardless of RLS)
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Tables that carry an academic_year string we care about.
const YEAR_TABLES = ['academic_terms', 'student_promotions', 'class_subjects']

// Helper: distinct academic_year values + row counts for a table.
async function summarizeColumn(tableName, column = 'academic_year') {
  const { data, error } = await supabase
    .from(tableName)
    .select(column)

  if (error) {
    // Column or table may not exist — report gracefully.
    if (error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703') {
      return { exists: false, error: `table/column not found (${tableName}.${column})` }
    }
    if (error.code === 'PGRST301') {
      return { exists: false, error: 'RLS blocked read (need service role or policy)' }
    }
    return { exists: false, error: error.message }
  }

  const counts = {}
  ;(data || []).forEach((row) => {
    const v = row[column]
    const key = typeof v === 'string' ? v : String(v ?? '(null)')
    counts[key] = (counts[key] || 0) + 1
  })

  return { exists: true, counts }
}

function printCounts(label, result, tableName) {
  console.log(`\n=== ${label} : ${tableName}.academic_year ===`)
  if (!result.exists) {
    console.log(`  ⚠️  ${result.error}`)
    return
  }
  const years = Object.keys(result.counts)
  if (years.length === 0) {
    console.log('  (no rows)')
    return
  }
  years.sort()
  years.forEach((y) => {
    console.log(`  ${y.padEnd(14)} ${String(result.counts[y]).padStart(4)} rows`)
  })
}

async function showSettings() {
  console.log('=== CURRENT SETTINGS ===')

  const { data: acadSettings } = await supabase
    .from('academic_settings')
    .select('current_academic_year, current_term')
    .maybeSingle()

  console.log('academic_settings.current_academic_year :', acadSettings?.current_academic_year ?? '(not set)')
  console.log('academic_settings.current_term           :', acadSettings?.current_term ?? '(not set)')

  const { data: sysSettings } = await supabase
    .from('system_settings')
    .select('setting_key, setting_value')
    .in('setting_key', ['current_academic_year', 'current_term'])

  const smap = new Map((sysSettings || []).map((s) => [s.setting_key, s.setting_value]))
  console.log('system_settings.current_academic_year    :', smap.get('current_academic_year') ?? '(not set)')
  console.log('system_settings.current_term  (id)       :', smap.get('current_term') ?? '(not set)')

  // Resolve the current term id -> year so we know which year is "active".
  const termId = smap.get('current_term') || acadSettings?.current_term
  if (termId) {
    const { data: term } = await supabase
      .from('academic_terms')
      .select('name, academic_year')
      .eq('id', termId)
      .maybeSingle()
    console.log('  -> current term resolves to:', term ? `${term.name} (${term.academic_year})` : '(term id not found in academic_terms)')
  }
}

async function main() {
  console.log('============================================================')
  console.log(' ACADEMIC YEAR DATA AUDIT  (READ-ONLY)')
  console.log('============================================================')

  await showSettings()

  // Collect per-table summaries.
  const results = {}
  for (const table of YEAR_TABLES) {
    const res = await summarizeColumn(table)
    results[table] = res
    printCounts('YEAR DISTRIBUTION', res, table)
  }

  // Build a union of all years across the tables for cross-reference.
  const union = new Set()
  Object.values(results).forEach((res) => {
    if (res && res.exists && res.counts) Object.keys(res.counts).forEach((y) => union.add(y))
  })

  console.log('\n============================================================')
  console.log(' CROSS-REFERENCE — which tables hold each year?')
  console.log('============================================================')
  const sorted = Array.from(union).sort()
  for (const year of sorted) {
    const hosts = Object.keys(results).filter((t) => results[t].exists && results[t].counts && results[t].counts[year] != null)
    // Convert class counts to "N in academic_terms, M in student_promotions..."
    const detail = hosts
      .map((t) => `${t}=${results[t].counts[year]}`)
      .join(', ')
    console.log(`  ${year.padEnd(14)} -> ${detail || '(nowhere)'}`)
  }

  // Flag the specific years the user asked about.
  const flagged = ['2027/2028', '2026/2027', '2025/2026']
  console.log('\n=== FOCUS: the years you asked about ===')
  for (const year of flagged) {
    const inTerms = results.academic_terms?.counts?.[year]
    const inPromo = results.student_promotions?.counts?.[year]
    const inSubj = results.class_subjects?.counts?.[year]
    console.log(`  ${year}:`)
    console.log(`      academic_terms      : ${inTerms ?? 0} rows  (if >0 → it IS a real term/period)`)
    console.log(`      student_promotions  : ${inPromo ?? 0} rows  (promotion records)`)
    console.log(`      class_subjects      : ${inSubj ?? 0} rows  (subject allocations)`)
    if (!inTerms && (inPromo || inSubj)) {
      console.log('      ⚠️  NO matching academic_terms → likely ORPHAN data (safe-ish to clean if confirmed).')
    } else if (!inTerms && !inPromo && !inSubj) {
      console.log('      ℹ️  Not present in any of these tables.')
    }
  }

  console.log('\nDONE. Nothing was written. Review the above before any cleanup.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
