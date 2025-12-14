const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const CLASS_ID = 'e34fae50-d95b-426f-ae52-850b2bd18f05';

async function checkTeacher() {
  console.log(`Checking teacher assignments for class ID: ${CLASS_ID}...`);

  const { data: assignments, error } = await supabase
    .from('teacher_class_assignments')
    .select(`
      *,
      teachers (
        id,
        first_name,
        last_name,
        profile_id
      )
    `)
    .eq('class_id', CLASS_ID);

  if (error) {
    console.error('Error fetching assignments:', error);
    return;
  }

  console.log(`Found ${assignments.length} assignments.`);
  assignments.forEach(a => {
    console.log(`Teacher: ${a.teachers.first_name} ${a.teachers.last_name} (Profile: ${a.teachers.profile_id})`);
  });
}

checkTeacher();
