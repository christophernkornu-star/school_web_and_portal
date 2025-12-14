const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CLASS_ID = 'e34fae50-d95b-426f-ae52-850b2bd18f05';

async function debugScores() {
  console.log(`Fetching students for class ID: ${CLASS_ID}...`);

  // 1. Fetch all students in "Basic 9"
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, first_name, last_name, profile_id')
    .eq('class_id', CLASS_ID);

  if (studentsError) {
    console.error('Error fetching students:', studentsError);
    return;
  }

  console.log(`Found ${students.length} students.`);

  let successCount = 0;
  let failureCount = 0;

  // 2. For each student, attempt to run the score fetching query
  for (const student of students) {
    const { data: scores, error: scoresError } = await supabase
      .from('scores')
      .select(`
        *,
        subjects (id, name, code),
        academic_terms (id, name, academic_year, start_date)
      `)
      .eq('student_id', student.id)
      // Note: The order syntax in the user prompt might be slightly off for the JS client depending on version,
      // but I will use exactly what was requested.
      // Usually it is .order('column', { foreignTable: 'table', ascending: true })
      // But the user provided: .order('academic_terms(academic_year)', { ascending: true })
      // This syntax is valid for PostgREST but the JS client usually handles it via the options object if referencing a foreign table.
      // However, let's try the exact string they gave first as the JS client passes strings through to PostgREST.
      // Actually, the JS client syntax for foreign table ordering is:
      // .order('academic_year', { foreignTable: 'academic_terms', ascending: true })
      // But let's try to stick to their query as much as possible.
      // If the user copied this from their code, it might be using the string format which sometimes works if the client parses it or passes it raw.
      // Let's try the standard way if the string way is ambiguous, OR just try their way.
      // The prompt says "exact score fetching query used in the app".
      // I will try to replicate it.
      .order('academic_terms(academic_year)', { ascending: true })
      .order('academic_terms(start_date)', { ascending: true });

    if (scoresError) {
      console.error(`[FAILED] ${student.first_name} ${student.last_name} (ID: ${student.id}, Profile: ${student.profile_id}): ${scoresError.message}`);
      console.error(JSON.stringify(scoresError, null, 2));
      failureCount++;
    } else {
      console.log(`[SUCCESS] ${student.first_name} ${student.last_name} (ID: ${student.id}, Profile: ${student.profile_id}): Found ${scores.length} scores.`);
      successCount++;
    }
  }

  console.log('\nSummary:');
  console.log(`Total Students: ${students.length}`);
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
}

debugScores();
