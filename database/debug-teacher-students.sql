-- STEP 1: Find your teacher's profile_id
SELECT id, teacher_id, first_name, last_name, profile_id
FROM teachers
WHERE status = 'active';

-- STEP 2: Check teacher assignment (use the id from above)
SELECT 
  t.id as teacher_uuid,
  t.teacher_id,
  t.profile_id,
  tca.class_id,
  c.name as class_name,
  tca.is_class_teacher
FROM teachers t
JOIN teacher_class_assignments tca ON tca.teacher_id = t.id
JOIN classes c ON c.id = tca.class_id
WHERE t.status = 'active';

-- STEP 3: Test the get_teacher_classes function
-- Replace YOUR_PROFILE_ID with actual profile_id from step 1
-- SELECT * FROM get_teacher_classes('YOUR_PROFILE_ID');

-- STEP 4: Check students in assigned classes
SELECT 
  s.id,
  s.student_id,
  s.first_name,
  s.last_name,
  c.name as class_name,
  s.class_id
FROM students s
JOIN classes c ON s.class_id = c.id
WHERE s.class_id IN (
  SELECT tca.class_id 
  FROM teacher_class_assignments tca
  JOIN teachers t ON t.id = tca.teacher_id
  WHERE t.status = 'active'
);
