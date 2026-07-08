-- Drop the existing constraint that prevents team teaching
-- This constraint only allowed ONE class teacher per class
-- For team teaching, we now allow up to 2 teachers per class

DROP INDEX IF EXISTS idx_unique_class_teacher_per_class;

-- Show current assignments for verification
SELECT 
  c.name as class_name,
  t.first_name || '" '" || t.last_name as teacher_name,
  tca.is_class_teacher,
  tca.is_primary
FROM teacher_class_assignments tca
JOIN classes c ON c.id = tca.class_id
JOIN teachers t ON t.id = tca.teacher_id
ORDER BY c.name, t.last_name;
