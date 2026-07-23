-- DIAGNOSE Basic 1 students
-- Find Basic 1 class ID
SELECT id, name, level FROM classes WHERE LOWER(name) LIKE '%basic 1%' OR LOWER(name) = 'basic 1';

-- Check if there's a class_progression for Basic 1
SELECT cp.*, c1.name as current_name, c2.name as next_name
FROM class_progression cp
JOIN classes c1 ON c1.id = cp.current_class_id
LEFT JOIN classes c2 ON c2.id = cp.next_class_id
WHERE LOWER(c1.name) LIKE '%basic 1%' OR LOWER(c1.name) = 'basic 1';

-- Check all Basic 1 students and their promotion status
SELECT 
  s.id as student_id,
  s.first_name || ' ' || s.last_name as student_name,
  s.class_id,
  c.name as class_name,
  sp.promotion_status,
  sp.requires_admin_approval,
  sp.auto_promoted,
  sp.teacher_remarks,
  sp.average_score,
  sp.meets_auto_promotion_criteria,
  sp.decided_by,
  sp.requires_teacher_decision,
  sp.academic_year
FROM students s
JOIN classes c ON c.id = s.class_id
LEFT JOIN student_promotions sp ON sp.student_id = s.id AND sp.academic_year = (
  SELECT setting_value FROM system_settings WHERE setting_key = 'current_academic_year' LIMIT 1
)
WHERE LOWER(c.name) LIKE '%basic 1%' OR LOWER(c.name) = 'basic 1'
  AND s.status = 'active'
ORDER BY s.first_name;
