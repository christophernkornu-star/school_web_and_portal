
-- 1. Check classes matching JHS
SELECT id, name, level FROM classes WHERE name LIKE '%Basic 7%' OR name LIKE '%Basic 8%' OR name LIKE '%Basic 9%' OR name LIKE '%JHS%' ORDER BY name;

-- 2. Check subjects with level 'jhs'
SELECT id, name, level, code FROM subjects WHERE level = 'jhs' OR level IS NULL ORDER BY name;

-- 3. Check teacher assignments for JHS
-- This is just to see if ANY assignments exist for these classes
SELECT 
    t.first_name, 
    t.last_name, 
    c.name as class_name, 
    s.name as subject_name
FROM teacher_subject_assignments tsa
JOIN teachers t ON tsa.teacher_id = t.teacher_id
JOIN classes c ON tsa.class_id = c.id
JOIN subjects s ON tsa.subject_id = s.id
WHERE c.name LIKE '%Basic 7%' OR c.name LIKE '%Basic 8%' OR c.name LIKE '%Basic 9%' OR c.name LIKE '%JHS%'
ORDER BY c.name, s.name;
