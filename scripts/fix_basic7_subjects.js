require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

const SUBJECTS_TO_ADD = [
  'Mathematics',
  'English Language',
  'Social Studies',
  'RME',
  'Ghanaian Language',
  'Career Technology',
  'Creative Arts & Design',
  'History',
  'Integrated Science'
];

const CLASSES_TO_FIX = ['Basic 7', 'Basic 8', 'Basic 9'];

async function main() {
  console.log('Fixing subjects for JHS (2026)...');

  for (const classNameStub of CLASSES_TO_FIX) {
      console.log(`\n--- Processing ${classNameStub} ---`);
      
      // 1. Get Class ID
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .ilike('name', `%${classNameStub}%`)
        .limit(1)
        .maybeSingle();
        
      if (!classes) { console.error(`${classNameStub} not found`); continue; }
      const classId = classes.id;
      const academicYear = '2026'; // Hardcoded

      console.log(`Class: ${classes.name} (${classId})`);

      // 2. Get existing subjects
      const { data: existing } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects(name)')
        .eq('class_id', classId)
        .eq('academic_year', academicYear);
        
      const existingNames = new Set(existing?.map(e => e.subjects?.name) || []);
      console.log('Existing:', Array.from(existingNames));

      // 3. Add missing
      for (const name of SUBJECTS_TO_ADD) {
          // Check if already exists by name OR by ID (if we search by name and get ID)
          // We check by name against existing records for safety
          if (existingNames.has(name)) {
              console.log(`Skipping ${name} (already linked)`);
              continue;
          }
          
          // Find subject ID
          const { data: subjectData } = await supabase
              .from('subjects')
              .select('id')
              .ilike('name', name) 
              .limit(1); 
              
          if (!subjectData || subjectData.length === 0) {
              console.error(`Warning: Subject '${name}' not found in DB`);
              continue;
          }
          const subjectId = subjectData[0].id;
          
          // Double check ID specific existence (though name check covers most)
          const isLinked = existing?.some(e => e.subject_id === subjectId);
          if (isLinked) {
              console.log(`Skipping ${name} (ID linked but name mismatch?)`);
              continue;
          }
          
          // Insert
          console.log(`Adding ${name}...`);
          const { error } = await supabase
              .from('class_subjects')
              .insert({
                  class_id: classId,
                  subject_id: subjectId,
                  academic_year: academicYear
              });
              
          if (error) console.error('Insert error:', error.message);
          else console.log('Done.');
      }
  }
}

main();