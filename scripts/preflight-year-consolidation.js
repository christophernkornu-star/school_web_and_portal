/**
 * READ-ONLY PRE-FLIGHT — Year Consolidation Safety Check
 * ======================================================
 * Before reconciling academic years, confirm the exact rows that would be
 * affected by consolidating 2025/2026 -> 2025/26, and by deleting the
 * orphan years 2027/2028, 2026/2027 and the leftover 2026.
 *
 * This script performs ONLY SELECT queries. It writes/updates NOTHING.
 *
 * Usage:
 *   node scripts/preflight-year-consolidation.js
 *
 * Requires:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const line = (t) => console.log(`${t}`)

async function checkTerms() {
  line('\n=== 1. ACADEMIC TERMS for 2025/2026 and 2025/26 ===')
  const { data, error } = await supabase
    .from('academic_terms')
    .select('id, name, academic_year, is_current, start_date, end_date')
    .in('academic_year', ['2025/2026', '2025/26'])
    .order('academic_year')

  if (error) {
    line(`  ⚠️  ${error.message}`)
    return
  }
  if (!data || data.length === 0) {
    line('  (no rows)')
    return
  }
  data.forEach((t) => {
    line(`  [${t.academic_year}] "${t.name}" is_current=${t.is_current}  ${t.start_date} -> ${t.end_date}  (id: ${t.id})`)
  })

  // Detect a name collision if we were to rename 2025/2026 -> 2025/26.
  const names = new Map()
  data.forEach((t) => {
    if (!names.has(t.name)) names.set(t.name, [])
    names.get(t.name).push(t.academic_year)
  })
  line('\n  -> Collision check on rename (UNIQUE(name, academic_year)):')
  let anyCollision = false
  names.forEach((years, name) => {
    if (years.includes('2025/2026') && years.includes('2025/26')) {
      anyCollision = true
      line(`     ⚠️  "${name}" exists in BOTH 2025/2026 and 2025/26 — renaming would violate the UNIQUE constraint.`)
    }
  })
  if (!anyCollision) line('     ✅ No same-name collision between the two years.')

  // Confirm the 2025/2026 term is NOT is_current (i.e. unused).
  const cur2026 = data.find((t) => t.academic_year === '2025/2026' && t.is_current)
  line(cur2026
    ? '     ⚠️  2025/2026 HAS is_current=true — double-check before consolidation.'
    : '     ✅ 2025/2026 term is NOT current.')
}

async function checkScoresOnTerms() {
  line('\n=== 2. Any dependent data on the 2025/2026 term? ===')
  const { data: termRows } = await supabase
    .from('academic_terms')
    .select('id')
    .eq('academic_year', '2025/2026')

  if (!termRows || termRows.length === 0) {
    line('  No 2025/2026 term rows exist (nothing references it).')
    return
  }
  const termIds = termRows.map((t) => t.id)

  for (const table of ['scores', 'student_attendance', 'student_remarks', 'assessments']) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .in('term_id', termIds)
    if (error) {
      line(`  [${table}] ⚠️  ${error.message}`)
    } else {
      line(`  [${table}] term_id in (2025/2026 terms) -> ${count ?? 0} rows`)
    }
  }
}

async function checkPromotionCollisions() {
  line('\n=== 3. STUDENT_PROMOTIONS consolidation collision (2025/2026 -> 2025/26) ===')
  const { data: longYear } = await supabase
    .from('student_promotions')
    .select('student_id, promotion_status, average_score')
    .eq('academic_year', '2025/2026')

  const { data: shortYear } = await supabase
    .from('student_promotions')
    .select('student_id, promotion_status, average_score')
    .eq('academic_year', '2025/26')

  const shortIds = new Set((shortYear || []).map((r) => r.student_id))
  const collisions = (longYear || []).filter((r) => shortIds.has(r.student_id))
  const clear = (longYear || []).filter((r) => !shortIds.has(r.student_id))

  line(`  2025/2026 promotions total      : ${(longYear || []).length}`)
  line(`  2025/26 promotions total        : ${(shortYear || []).length}`)
  line(`  Collide (already in 2025/26)    : ${collisions.length}`)
  line(`  Clear to move (no 2025/26 row)  : ${clear.length}`)

  if (collisions.length > 0) {
    line('  ⚠️  These student_ids already have a 2025/26 record (need merge policy):')
    collisions.slice(0, 20).forEach((c) => {
      line(`     ${c.student_id}  (2025/2026: ${c.promotion_status}/${c.average_score})`)
    })
    if (collisions.length > 20) line(`     ... and ${collisions.length - 20} more`)
  } else {
    line('  ✅ No collisions — every 2025/2026 promotion can be cleanly updated to 2025/26.')
  }
}

async function checkClassSubjectCollisions() {
  line('\n=== 4. CLASS_SUBJECTS consolidation collision (2025/2026 -> 2025/26) ===')
  const { data: longYear } = await supabase
    .from('class_subjects')
    .select('class_id, subject_id, teacher_id')
    .eq('academic_year', '2025/2026')

  const { data: shortYear } = await supabase
    .from('class_subjects')
    .select('class_id, subject_id, teacher_id')
    .eq('academic_year', '2025/26')

  const shortKeys = new Set((shortYear || []).map((r) => `${r.class_id}|${r.subject_id}`))
  const collisions = (longYear || []).filter((r) => shortKeys.has(`${r.class_id}|${r.subject_id}`))

  line(`  2025/2026 class_subjects total   : ${(longYear || []).length}`)
  line(`  2025/26 class_subjects total     : ${(shortYear || []).length}`)
  line(`  Collide (already in 2025/26)     : ${collisions.length}`)
  line(`  Clear to move (no 2025/26 dup)   : ${(longYear || []).length - collisions.length}`)

  if (collisions.length > 0) {
    line('  ⚠️  class_id|subject_id pairs that already exist in 2025/26:')
    collisions.slice(0, 20).forEach((c) => line(`     ${c.class_id}|${c.subject_id}`))
    if (collisions.length > 20) line(`     ... and ${collisions.length - 20} more`)
  } else {
    line('  ✅ No collisions — every 2025/2026 class_subject can be cleanly updated to 2025/26.')
  }
}

async function checkLeftovers() {
  line('\n=== 5. LEFTOVERS to delete (per your confirmation) ===')
  for (const [table, years] of Object.entries({
    student_promotions: ['2027/2028', '2026/2027', '2026'],
    class_subjects: ['2026'],
  })) {
    for (const year of years) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('academic_year', year)
      line(`  [${table}] academic_year=${year} -> ${count ?? 0} rows${error ? `  ⚠️${error.message}` : ''}`)
    }
  }
}

async function main() {
  line('============================================================')
  line(' PRE-FLIGHT: YEAR CONSOLIDATION SAFETY CHECK  (READ-ONLY)')
  line('============================================================')
  await checkTerms()
  await checkScoresOnTerms()
  await checkPromotionCollisions()
  await checkClassSubjectCollisions()
  await checkLeftovers()
  line('\nDONE. Nothing was written.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
