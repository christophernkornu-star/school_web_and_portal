const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://okfawhokrtkaibhbcjdk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODY1MzUsImV4cCI6MjA3OTE2MjUzNX0.kxGUGy2NIY__cMVpxVma9vx-rVbaa4-FEW9KgL3w1-U'
)

async function run() {
  const { data, error } = await supabase.from('subjects').select('level')
  if (error) { console.error(error.message); return }
  
  const grouped = {}
  data.forEach(s => {
    const lvl = s.level || '(none)'
    grouped[lvl] = (grouped[lvl] || 0) + 1
  })
  
  console.log('Subject counts by level:')
  Object.entries(grouped).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`))
  console.log('Total:', data.length)
}

run()
