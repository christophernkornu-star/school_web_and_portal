// Full fetchReportCardData test
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://okfawhokrtkaibhbcjdk.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9rZmF3aG9rcnRrYWliaGJjamRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDU1MTM0NSwiZXhwIjoyMDg1OTExMzQ1fQ.e9Ziq9Nq4BuSrFnOt9ddxLPUp6Q6qZqdQ5cLUcwcI4s');

async function test() {
  const studentId = '671bc818-54f3-476c-815e-f938a65a232c'; // student that has remarks
  
  // 1.
  const { data: studentData } = await supabase.from('students').select('*').eq('id', studentId).single();
  // 3.
  const { data: grades } = await supabase.from('scores').select('*, academic_terms(id, name, academic_year), subjects(name)').eq('student_id', studentId);
  // 4.
  const { data: storedRemarks } = await supabase.from('student_remarks').select('*').eq('student_id', studentId);
  
  const termGroups = {};
  grades?.forEach((grade) => {
      const tId = grade.term_id;
      if (!termGroups[tId]) {
          termGroups[tId] = { termId: tId, termName: grade.academic_terms?.name, remarks: {} };
      }
      // skip adding grades for brevity
  });
  
  let targetTermId = Object.keys(termGroups)[0];
  if (!targetTermId) targetTermId = 'some-active-term';
  
  if (!termGroups[targetTermId]) {
      termGroups[targetTermId] = { termId: targetTermId, remarks: {} };
  }
  
  const report = termGroups[targetTermId];
  
  if (storedRemarks) {
      const remarkForTerm = storedRemarks.find((r) => r.term_id === targetTermId);
      if (remarkForTerm) {
          report.remarks = {
              attitude: remarkForTerm.attitude,
              classTeacher: remarkForTerm.class_teacher_remark,
              headTeacher: remarkForTerm.head_teacher_remark
          };
      }
  }
  
  console.log('Final Report Data Remarks:', report.remarks);
}
test();
