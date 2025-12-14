-- Check all students in Basic 3 including inactive ones
SELECT 
  s.id,
  s.student_id,
  s.first_name,
  s.last_name,
  s.status,
  s.class_id,
  c.name as class_name
FROM students s
JOIN classes c ON c.id = s.class_id
WHERE c.name = 'Basic 3'
ORDER BY s.created_at DESC;

-- Count by status
SELECT 
  status,
  COUNT(*) as count
FROM students s
JOIN classes c ON c.id = s.class_id
WHERE c.name = 'Basic 3'
GROUP BY status;
