-- Check the actual structure of teacher assignment tables
-- This will help debug the 400 Bad Request errors

-- Check teacher_class_assignments table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'teacher_class_assignments'
ORDER BY ordinal_position;

-- Check teacher_subject_assignments table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'teacher_subject_assignments'
ORDER BY ordinal_position;

-- Check if there are any rows in these tables
SELECT COUNT(*) as class_assignments_count FROM teacher_class_assignments;
SELECT COUNT(*) as subject_assignments_count FROM teacher_subject_assignments;

-- Try to view sample data (if any exists)
SELECT * FROM teacher_class_assignments LIMIT 5;
SELECT * FROM teacher_subject_assignments LIMIT 5;

-- Check foreign key constraints
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name IN ('teacher_class_assignments', 'teacher_subject_assignments')
  AND tc.constraint_type = 'FOREIGN KEY';
