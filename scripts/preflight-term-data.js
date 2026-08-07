/**
 * READ-ONLY PRE-FLIGHT #2 — Term rows + dependent-data duplication for 2025/2026
 * =============================================================================
 * Goal: Decide whether the 2025/2026 year is a duplicate of 2025/26 (safe to
 * remove/consolidate) or holds the SUMMARY of the 7 scores + 15 assessments.
 *
 * This script performs ONLY SELECT queries. It writes/updates NOTHING.
 *
 * Usage:
 *   node scripts/preflight-term-data.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const line = (t) => console.log(t)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchAllTermRows(year, attempts = 4) {
  let lastErr = null
  for (let i = 0; i < attempts; i++) {
    try {
      const { data, error } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year, is_current, start_date, end_date')
        .eq('academic_year', year)
        .order('start_date')
      if (!error) return data || []
      lastErr = error
    } catch (err) {
      lastErr = err
    }
    if (i < attempts - 1) {
      line(`  ↻ retry fetch terms ${year} (${i + 2}/${attempts})...`)
      await sleep(1200)
    }
  }
  line(`  ⚠️  fetch terms ${year} failed after ${attempts} attempts: ${String(lastErr && lastErr.message || lastErr)}`)
  return []
}

async function main() {
  line('============================================================')
  line(' PRE-FLIGHT #2: 2025/2026 TERM + SCORE/ASSESSMENT DUPLICATION')
  line('============================================================')

  line('\n=== TERM ROWS ===')
  const tLong = await fetchAllTermRows('2025/2026')
  const tShort = await fetchAllTermRows('2025/26')

  line('[2025/2026]:')
  tLong.forEach((t) => line(`  id=${t.id}  "${t.name}"  is_current=${t.is_current}  ${t.start_date}->${t.end_date}`))
  if (tLong.length === 0) line('  (none)')
  line('[2025/26]:')
  tShort.forEach((t) => line(`  id=${t.id}  "${t.name}"  is_current=${t.is_current}  ${t.start_date}->${t.end_date}`))
  if (tShort.length === 0) line('  (none)')

  // Map term names -> set of term ids per year, to compare overlap.
  const nameToIdsLong = {}
  tLong.forEach((t) => { (nameToIdsLong[t.name] = nameToIdsLong[t.name] || []).push(t.id) })
  const nameToIdsShort = {}
  tShort.forEach((t) => { (nameToIdsShort[t.name] = nameToIdsShort[t.name] || []).push(t.id) })

  line('\n=== TERM NAME OVERLAP ===')
  const allNames = new Set([...Object.keys(nameToIdsLong), ...Object.keys(nameToIdsShort)])
  let anyOverlap = false
  allNames.forEach((name) => {
    const l = nameToIdsLong[name] || []
    const s = nameToIdsShort[name] || []
    const shared = l.length > 0 && s.length > 0
    anyOverlap = anyOverlap || shared
    line(`  name="${name}":  2025/2026 ids=[${l.join(',')}]  2025/26 ids=[${s.join(',')}]  ${shared ? '⚠️ OVERLAP' : ''}`)
  })
  if (!anyOverlap) line('  ✅ No term names are shared between the two years.')

  line('\n=== DEPENDENT DATA — DUPLICATION CHECK ===')

  // Gather term ids for each year.
  const idsLong = tLong.map((t) => t.id)
  const idsShort = tShort.map((t) => t.id)

  for (const table of ['scores', 'assessments']) {
    line(`\n--- ${table}.term_id comparison ---`)
    if (idsLong.length === 0) {
      line('  No 2025/2026 term ids — nothing to compare.')
      continue
    }
    if (idsShort.length === 0) {
      line('  No 2025/26 term ids.');
      continue
    }
    const { data: longRows, error: e1 } = await supabase
      .from(table)
      .select('*')
      .in('term_id', idsLong)
    if (e1) { line(`  ⚠️  fetch ${table} 2025/2026: ${e1.message}`); continue }
    const { data: shortRows, error: e2 } = await supabase
      .from(table)
      .select('*')
      .in('term_id', idsShort)
    if (e2) { line(`  ⚠️  fetch ${table} 2025/26: ${e2.message}`); continue }

    line(`  2025/2026 rows: ${(longRows || []).length}     2025/26 rows: ${(shortRows || []).length}`)

    // Build a dedup key per table to detect whether the long-year rows duplicate short-year rows.
    // For scores: student_id + subject_id + term_id + class_score + exam_score.
    // For assessments: (title + class_subject_id + term_id + assessment_date).
    const keyOf = (r) => {
      if (table === 'scores') {
        return [r.student_id, r.subject_id, r.term_id, r.class_score, r.exam_score].join('|')
      }
      return [r.title, r.class_subject_id, r.term_id, r.assessment_type, r.assessment_date].join('|')
    }
    const shortKeys = new Set((shortRows || []).map(keyOf))
    let duplicated = 0
    let missing = 0
    const missingSamples = []
    ;(longRows || []).forEach((r) => {
      if (shortKeys.has(keyOf(r))) {
        duplicated += 1
      } else {
        missing += 1
        if (missingSamples.length < 5) missingSamples.push(r)
      }
    })

    line(`  Of the 2025/2026 ${table} rows: ${duplicated} duplicate(s) of 2025/26 data, ${missing} not present in 2025/26.`)
    if (missing > 0) {
      line('  ⚠️  Rows NOT present in 2025/26 (would be LOST if we simply delete 2025/2026):')
      missingSamples.forEach((r) => line(`     ${JSON.stringify(r)}`))
    } else {
      line('  ✅ All 2025/2026 rows are duplicates — safe to remove 2025/2026 without data loss.')
    }
  }

  line('\nDONE. Nothing was written.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
