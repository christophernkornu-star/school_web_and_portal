/**
 * READ-ONLY DIAGNOSTIC — Basic 9 student count mismatch
 * =====================================================
 * The admin "Manage Classes" page shows 104 students in Basic 9, while the
 * teacher portal shows 56. This script inspects the students.records for
 * Basic 9 to identify whether inactive/graduated students are being counted,
 * and/or whether there are duplicate student rows inflating the count.
 *
 * This script performs ONLY SELECT queries. It writes UPDATES NOTHING.
 *
 * Usage:
 *   node scripts/diagnose-basic9-count.js
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('============================================================')
  console.log(' BASIC 9 STUDENT COUNT DIAGNOSTIC  (READ-ONLY)')
  console.log('============================================================')

  // 1. Find all classes
  const { data: classes, error: e1 } = await supabase
    .from('classes')
    .select('id, name, level, category')
    .order('name')
  if (e1) { console.log('ERROR loading classes:', e1.message); process.exit(1) }

  console.log('\n=== All classes (name, id) ===')
  classes.forEach((c) => {
    console.log(`  ${c.name}  | id=${c.id} | level=${c.level} | cat=${c.category}`)
  })

  // Look for a class whose name contains "9" or "Basic 9" or "JHS 3"
  const target = classes.filter(c => {
    const n = c.name.toLowerCase()
    return n.includes('basic 9') || n.includes('basic9') || n.includes('jhs 3') || n.includes('jhs3')
  })

  const targetClass = target[0]
  if (!targetClass) {
    console.log('\nNo Basic 9 class found by name match. Aborting detail.')
    process.exit(0)
  }
  console.log(`\n=== Using class: ${targetClass.name} (${targetClass.id}) ===`)

  // 2. Students in that class
  const { data: students, error: e2 } = await supabase
    .from('students')
    .select('id, student_id, first_name, last_name, class_id, status, created_at')
    .eq('class_id', targetClass.id)
    .order('created_at')
  if (e2) { console.log('ERROR loading students:', e2.message); process.exit(1) }

  console.log(`\n=== Students with class_id = ${targetClass.id} ===`)
  console.log(`  TOTAL rows in class      : ${students.length}`)
  console.log(`  (this is what the admin page counts — it does NOT filter by status)`)

  // 3. Group by status
  const byStatus = {}
  students.forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1 })
  console.log('\n  Break down by status:')
  Object.entries(byStatus).forEach(([st, n]) => console.log(`    ${st}: ${n}`))

  // 4. Active only
  const active = students.filter(s => s.status === 'active')
  console.log(`\n  ACTIVE students          : ${active.length}`)
  console.log(`  (teacher portal likely filters to active -> the 56 you saw)`)

  // 5. Duplicate detection by student_id
  const seen = new Map()
  students.forEach(s => seen.set(s.student_id, (seen.get(s.student_id) || 0) + 1))
  const dups = [...seen.entries()].filter(([, n]) => n > 1)
  console.log(`\n  Duplicate student_id rows within class: ${dups.length}`)
  dups.forEach(([sid, n]) => {
    const rows = students.filter(s => s.student_id === sid)
    console.log(`    ${sid} appears ${n}x ->`, rows.map(r => `${r.status}(${r.id.slice(0,8)})`).join(', '))
  })

  // 6. Non-active rows
  const nonActive = students.filter(s => s.status !== 'active')
  console.log(`\n  NON-active rows total    : ${nonActive.length}`)
  nonActive.forEach(s => console.log(`    [${s.status}] ${s.first_name} ${s.last_name} (${s.student_id}) created ${s.created_at?.slice(0,10)}`))

  console.log('\nDONE. Nothing was written.')
  process.exit(0)
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
