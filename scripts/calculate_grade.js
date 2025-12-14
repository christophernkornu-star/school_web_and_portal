
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function calculateGrade() {
  // 1. Find Student
  const { data: students, error: studentError } = await supabase
    .from('students')
    .select('id, first_name, last_name')
    .ilike('last_name', '%Asante%')
    .ilike('first_name', '%Abena%');

  if (studentError) {
    console.error('Error finding student:', studentError);
    return;
  }

  if (!students || students.length === 0) {
    console.log('Student "Asante Abena" not found.');
    // Try searching just by parts of the name
    const { data: studentsRetry } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .or('first_name.ilike.%Asante%,last_name.ilike.%Asante%')
        .or('first_name.ilike.%Abena%,last_name.ilike.%Abena%');
    
    if (studentsRetry && studentsRetry.length > 0) {
        console.log('Found potential matches:', studentsRetry.map(s => `${s.first_name} ${s.last_name}`));
    }
    return;
  }

  const student = students[0];
  console.log(`Found Student: ${student.first_name} ${student.last_name} (ID: ${student.id})`);

  // 2. Get Grades for the student
  const { data: grades, error: gradesError } = await supabase
    .from('scores')
    .select(`
      id,
      total,
      class_score,
      exam_score,
      term_id,
      subject_id
    `)
    .eq('student_id', student.id);

  if (gradesError) {
    console.error('Error fetching grades:', gradesError);
    return;
  }

  if (!grades || grades.length === 0) {
    console.log('No grades found for this student.');
    return;
  }

  // Fetch subjects to map names
  const subjectIds = [...new Set(grades.map(g => g.subject_id))];
  const { data: subjectsData, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name')
    .in('id', subjectIds);
    
  if (subjectsError) {
      console.error('Error fetching subjects:', subjectsError);
      return;
  }
  
  const subjectMap = {};
  subjectsData.forEach(s => subjectMap[s.id] = s.name);

  // Fetch terms to map names
  const termIds = [...new Set(grades.map(g => g.term_id))];
  const { data: termsData, error: termsError } = await supabase
    .from('academic_terms')
    .select('id, name, academic_year')
    .in('id', termIds);

  if (termsError) {
      console.error('Error fetching terms:', termsError);
      return;
  }

  const termMap = {};
  termsData.forEach(t => termMap[t.id] = `${t.academic_year} - ${t.name}`);

  // Group by Term
  const gradesByTerm = {};
  grades.forEach(g => {
    const termName = termMap[g.term_id] || 'Unknown Term';
    if (!gradesByTerm[termName]) {
      gradesByTerm[termName] = [];
    }
    const total = g.total || ((g.class_score || 0) + (g.exam_score || 0));
    gradesByTerm[termName].push({
      subject: subjectMap[g.subject_id] || 'Unknown Subject',
      score: total,
      gradeVal: getGradeValue(total)
    });
  });

  // Calculate for each term
  for (const [term, termGrades] of Object.entries(gradesByTerm)) {
    console.log(`\n--- Term: ${term} ---`);
    const aggregate = calculateAggregate(termGrades);
    console.log(`Calculated Aggregate: ${aggregate}`);
  }
}

function getGradeValue(score) {
  if (score >= 80) return 1;
  if (score >= 70) return 2;
  if (score >= 60) return 3;
  if (score >= 55) return 4;
  if (score >= 50) return 5;
  if (score >= 45) return 6;
  if (score >= 40) return 7;
  if (score >= 35) return 8;
  return 9;
}

function calculateAggregate(grades) {
  let english = null;
  let math = null;
  let science = null;
  let social = null;
  const others = [];

  console.log('Subject Breakdown:');

  grades.forEach(g => {
    const subject = (g.subject || '').toLowerCase();
    const gradeVal = g.gradeVal;
    const score = g.score;

    let category = 'Elective';

    if (subject.includes('english')) {
      english = english === null ? gradeVal : Math.min(english, gradeVal);
      category = 'Core (English)';
    } else if (subject.includes('mathematics') || subject.includes('math')) {
      math = math === null ? gradeVal : Math.min(math, gradeVal);
      category = 'Core (Math)';
    } else if (subject.includes('integrated science') || subject === 'science' || subject === 'general science') {
      science = science === null ? gradeVal : Math.min(science, gradeVal);
      category = 'Core (Science)';
    } else if (subject.includes('social studies') || subject.includes('social')) {
      social = social === null ? gradeVal : Math.min(social, gradeVal);
      category = 'Core (Social)';
    } else {
      others.push(gradeVal);
    }

    console.log(`- ${g.subject}: Score=${score}, Grade=${gradeVal} [${category}]`);
  });

  let total = 0;
  const missingCores = [];

  if (english) total += english; else missingCores.push('English');
  if (math) total += math; else missingCores.push('Math');
  if (science) total += science; else missingCores.push('Science');
  if (social) total += social; else missingCores.push('Social Studies');

  if (missingCores.length > 0) {
      console.log(`WARNING: Missing core subjects: ${missingCores.join(', ')}`);
  }

  others.sort((a, b) => a - b);
  const bestOthers = others.slice(0, 2);
  
  console.log(`Best 2 Electives: ${bestOthers.join(', ')}`);

  total += bestOthers.reduce((a, b) => a + b, 0);

  return total;
}

calculateGrade();
