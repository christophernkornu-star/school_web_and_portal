-- Check current RLS policies on students table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'students';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'students';

-- Test direct query as if you were the teacher
-- First get your teacher's UUID and profile_id
SELECT id as teacher_uuid, profile_id FROM teachers WHERE teacher_id = 'TCH1009';

-- Then test if you can see students
-- Replace TEACHER_UUID with the id from above
SELECT s.id, s.first_name, s.last_name, s.class_id
FROM students s
WHERE s.class_id IN (
  SELECT tca.class_id 
  FROM teacher_class_assignments tca
  WHERE tca.teacher_id = 'YOUR_TEACHER_UUID'
);
