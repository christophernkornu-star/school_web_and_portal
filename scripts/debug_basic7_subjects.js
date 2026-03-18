require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role to bypass RLS

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Fetching class details for Basic 7...');

  // 1. Find class ID
  const { data: classes, error: classError } = await supabase
    .from('classes')
    .select('id, name')
    .ilike('name', '%Basic 7%');

  if (classError) {
    console.error('Class error:', classError);
    return;
  }

  if (!classes || classes.length === 0) {
    console.error('No class found for Basic 7');
    return;
  }
  
  const basic7 = classes[0];
  console.log(`Found Class: ${basic7.name} (${basic7.id})`);

  // 2. Determine current academic year
  const { data: currentTerm, error: termError } = await supabase
    .from('academic_terms')
    .select('*')
    .eq('is_current', true)
    .single();

  if (termError) { 
      console.error('Term error:', termError);
  }

  if (!currentTerm) {
      console.error('No current term found');
      return;
  }
  console.log(`Current Term: ${currentTerm.name} (${currentTerm.academic_year})`);

  // 3. Check class subjects for that YEAR
  const { data: classSubjects, error: csError } = await supabase
    .from('class_subjects')
    .select(`
        subject_id,
        academic_year,
        subjects (name)
    `)
    .eq('class_id', basic7.id)
    .eq('academic_year', currentTerm.academic_year);

  if (csError) {
      console.error('Error fetching class subjects:', csError);
      return;
  }
  
  console.log(`\nSubjects for ${basic7.name} in ${currentTerm.academic_year}:`);
  if (classSubjects.length === 0) {
      console.log('  (None found)');
  } else {
      classSubjects.forEach(cs => {
          console.log(`  - ${cs.subjects?.name}`);
      });
  }
  
  // 4. Also check ALL subjects for that class regardless of year
  const { data: allClassSubjects } = await supabase
    .from('class_subjects')
    .select('academic_year, subjects(name)')
    .eq('class_id', basic7.id);
    
  console.log(`\nAll historical subjects for ${basic7.name}:`);
  const grouped = {};
  if (allClassSubjects) {
    allClassSubjects.forEach(cs => {
        const year = cs.academic_year || 'Unknown';
        if (!grouped[year]) grouped[year] = [];
        grouped[year].push(cs.subjects?.name);
    });
    
    for (const year in grouped) {
        console.log(`  ${year}: ${grouped[year].join(', ')}`);
    }
  }

  // 5. List all available subjects
  const { data: allSubjects } = await supabase.from('subjects').select('id, name');
  console.log('\nAll Available Subjects in DB:');
  console.log(allSubjects.map(s => s.name).join(', '));
}

main();