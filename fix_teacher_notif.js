const fs = require('fs');

let code = fs.readFileSync('components/teacher/TeacherHeader.tsx', 'utf8');

// 1. Update termAlert type to include the completion flags
code = code.replace(
  "const [termAlert, setTermAlert] = useState<{ progress: number, active: boolean, threshold: number, id?: string }>({ progress: 0, active: false, threshold: 90 })",
  "const [termAlert, setTermAlert] = useState<{ progress: number, active: boolean, threshold: number, id?: string, attendanceDone?: boolean, remarksDone?: boolean }>({ progress: 0, active: false, threshold: 90 })"
);

// 2. Fetch completion dynamically
const oldFetchInner = `const threshold = thresholdRes?.setting_value ? Number(thresholdRes.setting_value) : 90

        const newTermAlert = { progress, active: progress >= threshold, threshold, id: termRes.id }
        setTermAlert(newTermAlert)
        sessionStorage.setItem('teacher_notif_term_alert', JSON.stringify(newTermAlert))`;

const newFetchInner = `const threshold = thresholdRes?.setting_value ? Number(thresholdRes.setting_value) : 90

        // Check if teacher has completed their tasks
        let attendanceDone = false;
        let remarksDone = false;
        
        try {
            const classIds = dashboardData?.assignments?.filter(a => a.is_class_teacher).map(a => a.class_id) || [];
            if (classIds.length > 0) {
              const { count: studentsCount } = await supabase
                .from('students')
                .select('id', { count: 'exact', head: true })
                .in('class_id', classIds)
                .eq('status', 'active');
                
              if (studentsCount && studentsCount > 0) {
                 const { count: attCount } = await supabase
                   .from('student_attendance')
                   .select('id', { count: 'exact', head: true })
                   .in('class_id', classIds)
                   .eq('term_id', termRes.id);
                   
                 attendanceDone = (attCount || 0) >= studentsCount;
                 
                 // Fetch the student IDs for these classes
                 const { data: students } = await supabase
                    .from('students')
                    .select('id')
                    .in('class_id', classIds)
                    .eq('status', 'active');
                    
                 if (students && students.length > 0) {
                    const studentIds = students.map((s: any) => s.id);
                    const { count: remCount } = await supabase
                      .from('student_remarks')
                      .select('id', { count: 'exact', head: true })
                      .in('student_id', studentIds)
                      .eq('term_id', termRes.id);
                      
                    remarksDone = (remCount || 0) >= studentsCount;
                 }
              } else {
                 attendanceDone = true;
                 remarksDone = true;
              }
            }
        } catch(e) { console.error('Error checking teacher completion statuses', e) }

        const newTermAlert = { 
          progress, 
          active: progress >= threshold, 
          threshold, 
          id: termRes.id,
          attendanceDone,
          remarksDone
        }
        setTermAlert(newTermAlert)
        sessionStorage.setItem('teacher_notif_term_alert', JSON.stringify(newTermAlert))`;

code = code.replace(oldFetchInner, newFetchInner);

// 3. Fix dependencies
code = code.replace(
  "}, [isClassTeacher])",
  "}, [isClassTeacher, dashboardData?.assignments])"
);

// 4. Fix notification render logic
code = code.replace(
  "const totalNotifications = (termAlert.active && !dismissedAtt ? 1 : 0) + (termAlert.active && !dismissedRem ? 1 : 0)",
  "const totalNotifications = (termAlert.active && !termAlert.attendanceDone && !dismissedAtt ? 1 : 0) + (termAlert.active && !termAlert.remarksDone && !dismissedRem ? 1 : 0)"
);

code = code.replace(
  "{termAlert.active && !dismissedAtt && (",
  "{termAlert.active && !termAlert.attendanceDone && !dismissedAtt && ("
);

code = code.replace(
  "{termAlert.active && !dismissedRem && (",
  "{termAlert.active && !termAlert.remarksDone && !dismissedRem && ("
);

// 5. Update OS notification string
const oldOsNotifInner = `new Notification('Action Required: End of Term', {
              body: \`The term is \${progress}% complete. Please remember to enter total attendances and student remarks.\`,
              icon: '/favicon.ico'
            })`;
            
const newOsNotifInner = `
            const notificationBody = (attendanceDone && remarksDone) 
                ? null
                : (!attendanceDone && !remarksDone) 
                    ? \`The term is \${progress}% complete. Please remember to enter total attendances and student remarks.\`
                    : (!attendanceDone)
                        ? \`The term is \${progress}% complete. Please ensure you enter students' total attendances.\`
                        : \`The term is \${progress}% complete. Please enter remarks for your students.\`;
            
            if (notificationBody) {
              new Notification('Action Required: End of Term', {
                body: notificationBody,
                icon: '/favicon.ico'
              })
            }`;

code = code.replace(oldOsNotifInner, newOsNotifInner);

fs.writeFileSync('components/teacher/TeacherHeader.tsx', code);
console.log("Teacher Header dynamically updated!");
