-- Add constraint to ensure only one class teacher per class
-- This prevents multiple teachers from being assigned as class teacher to the same class

-- Step 1: Check current state - find classes with multiple class teachers
SELECT 
  class_id,
  COUNT(*) as num_class_teachers,
  STRING_AGG(teacher_id::text, ', ') as teacher_ids
FROM teacher_class_assignments
WHERE is_class_teacher = true
GROUP BY class_id
HAVING COUNT(*) > 1;

-- Step 2: Add unique partial index to enforce one class teacher per class
-- This allows multiple subject teachers but only one class teacher per class
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_class_teacher_per_class 
ON teacher_class_assignments (class_id) 
WHERE is_class_teacher = true;

-- Step 3: Verify the constraint is in place
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'teacher_class_assignments'
  AND indexname = 'idx_unique_class_teacher_per_class';

-- Step 4: Test the constraint (this should fail if run twice with same class_id)
-- Uncomment to test:
-- DO $$
-- DECLARE
--   test_teacher_id UUID;
--   test_class_id UUID;
-- BEGIN
--   -- Get first teacher and class
--   SELECT id INTO test_teacher_id FROM teachers LIMIT 1;
--   SELECT id INTO test_class_id FROM classes LIMIT 1;
--   
--   -- Try to insert duplicate class teacher (should fail)
--   BEGIN
--     INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher)
--     VALUES (test_teacher_id, test_class_id, true);
--     
--     INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher)
--     VALUES (test_teacher_id, test_class_id, true);
--     
--     RAISE NOTICE 'ERROR: Duplicate class teacher was allowed!';
--     ROLLBACK;
--   EXCEPTION
--     WHEN unique_violation THEN
--       RAISE NOTICE 'SUCCESS: Duplicate class teacher prevented by constraint';
--       ROLLBACK;
--   END;
-- END $$;

-- Step 5: Show all class teacher assignments
SELECT 
  c.name as class_name,
  t.first_name || ' ' || t.last_name as teacher_name,
  t.teacher_id,
  tca.is_class_teacher
FROM teacher_class_assignments tca
JOIN classes c ON c.id = tca.class_id
JOIN teachers t ON t.id = tca.teacher_id
WHERE tca.is_class_teacher = true
ORDER BY c.name;
