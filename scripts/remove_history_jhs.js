require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Removing History from JHS classes (2026)...');

  // 1. Get History Subject ID
  const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
      .ilike('name', 'history');
      
  if (!subjects || subjects.length === 0) {
      console.error('History subject not found');
      return;
  }
  
  const historyIds = subjects.map(s => s.id);
  console.log(`History IDs: ${historyIds.join(', ')}`);

  // 2. Get JHS Class IDs
  const jhsClasses = ['Basic 7', 'Basic 8', 'Basic 9'];
  const classIds = [];
  
  for (const name of jhsClasses) {
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .ilike('name', `%${name}%`)
        .limit(1)
        .maybeSingle();
        
      if (classData) {
          classIds.push(classData.id);
          console.log(`Found ${classData.name}: ${classData.id}`);
      }
  }

  if (classIds.length === 0) {
      console.error('No JHS classes found');
      return;
  }

  // 3. Delete from class_subjects
  console.log('Removing records...');
  const { error } = await supabase
      .from('class_subjects')
      .delete()
      .in('subject_id', historyIds)
      .in('class_id', classIds)
      .eq('academic_year', '2026');

  if (error) {
      console.error('Delete error:', error);
  } else {
      console.log(`Successfully removed History from JHS class records.`);
  }
}

main();