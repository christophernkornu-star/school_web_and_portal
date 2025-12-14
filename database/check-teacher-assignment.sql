-- Check teacher assignments for Basic 3
SELECT 
  t.teacher_id,
  t.first_name || ' ' || t.last_name as teacher_name,
  t.profile_id,
  c.name as class_name,
  tca.is_class_teacher,
  tca.class_id
FROM teacher_class_assignments tca
JOIN teachers t ON t.id = tca.teacher_id
JOIN classes c ON c.id = tca.class_id
WHERE c.name = 'Basic 3';

-- Check if is_class_teacher column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_class_assignments' 
AND column_name = 'is_class_teacher';

-- Check the teacher's profile_id
SELECT id, teacher_id, first_name, last_name, profile_id
FROM teachers
WHERE status = 'active'
ORDER BY first_name;
