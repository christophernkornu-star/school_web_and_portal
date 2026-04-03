const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://okfawhokrtkaibhbcjdk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MTM0NSwiZXhwIjoyMDg1OTExMzQ1fQ.e9Ziq9Nq4BuSrFnOt9ddxLPUp6Q6qZqdQ5cLUcwcI4s');
async function test() {
  const studentId = '671bc818-54f3-476c-815e-f938a65a232c'; // student that has remarks
  
  const { data: storedRemarks, error } = await supabase
    .from('student_remarks')
    .select('*')
    .eq('student_id', studentId)
    
  console.log('storedRemarks:', storedRemarks);
  console.log('error:', error);
}
test();
