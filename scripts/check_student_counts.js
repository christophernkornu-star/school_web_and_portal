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

async function checkStudentCounts() {
  console.log('Starting checks...');

  // 1. List all classes to find "Basic 3" and "Basic 9"
  console.log('\n1. Fetching classes...');
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id, name');

  if (classesError) {
    console.error('Error fetching classes:', classesError);
    return;
  }

  console.log('All classes found:', classes.map(c => c.name).sort()); // Added this line

  const targetClasses = classes.filter(c => c.name === 'Basic 3' || c.name === 'Basic 9');
  console.log('Found classes:', targetClasses);

  if (targetClasses.length === 0) {
    console.log('Could not find "Basic 3" or "Basic 9" in classes table.');
    console.log('All classes:', classes.map(c => c.name));
    return;
  }

  // 2. Count students for each class
  console.log('\n2. Counting students for target classes...');
  
  for (const cls of targetClasses) {
    // Count all students
    const { count: totalCount, error: countError } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', cls.id);

    if (countError) {
      console.error(`Error counting students for ${cls.name}:`, countError);
    } else {
      console.log(`Total students in ${cls.name} (ID: ${cls.id}): ${totalCount}`);
    }
  }

  // 3. Check for relevant columns in students table
  console.log('\n3. Checking student table structure and status...');
  const { data: sampleStudent, error: sampleError } = await supabase
    .from('students')
    .select('*')
    .limit(1);

  if (sampleError) {
    console.error('Error fetching sample student:', sampleError);
  } else if (sampleStudent && sampleStudent.length > 0) {
    const student = sampleStudent[0];
    console.log('Student columns:', Object.keys(student));
    
    if ('status' in student) {
      console.log('Found "status" column.');
      
      // Count by status for target classes
      for (const cls of targetClasses) {
        const { data: studentsInClass, error: studentsError } = await supabase
          .from('students')
          .select('status')
          .eq('class_id', cls.id);
          
        if (studentsError) {
             console.error(`Error fetching students for status check in ${cls.name}:`, studentsError);
        } else {
            const statusCounts = studentsInClass.reduce((acc, curr) => {
                const status = curr.status || 'null';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});
            console.log(`Status breakdown for ${cls.name}:`, statusCounts);
        }
      }
    } else {
      console.log('"status" column NOT found.');
    }
  } else {
    console.log('No students found to check columns.');
  }
}

checkStudentCounts();
