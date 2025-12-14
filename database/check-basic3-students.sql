-- Check if students exist in Basic 3
SELECT 
  s.id,
  s.student_id,
  s.first_name,
  s.last_name,
  s.class_id,
  c.name as class_name,
  c.level
FROM students s
LEFT JOIN classes c ON s.class_id = c.id
WHERE c.name = 'Basic 3'
ORDER BY s.first_name;

-- Also check all students and their class assignments
SELECT 
  c.name as class_name,
  COUNT(s.id) as student_count
FROM classes c
LEFT JOIN students s ON s.class_id = c.id
GROUP BY c.name, c.level
ORDER BY c.name;
