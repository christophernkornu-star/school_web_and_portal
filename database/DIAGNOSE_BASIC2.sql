-- ============================================================
-- DIAGNOSTIC: Show why restoration isn't working
-- Copy and paste the ENTIRE output back to me
-- ============================================================

-- 1. Find class IDs
SELECT id, name FROM classes WHERE LOWER(name) LIKE '%basic%' ORDER BY name;

-- 2. Show all students in Basic 3 with their promotion records
SELECT 
  s.id as student_id,
  s.first_name,
  s.last_name,
  s.student_id as admission_number,
  s.class_id as students_current_class,
  sp.current_class_id as promo_current_class,
  sp.next_class_id as promo_next_class,
  sp.promotion_status,
  sp.auto_promoted,
  sp.requires_admin_approval,
  sp.academic_year
FROM students s
LEFT JOIN student_promotions sp ON s.id = sp.student_id
WHERE s.class_id = (SELECT id FROM classes WHERE LOWER(name) = 'basic 3' LIMIT 1)
  AND s.status = 'active'
ORDER BY s.first_name;

-- 3. Show all promotion_history for Basic 3 students
SELECT 
  ph.student_id,
  s.first_name,
  s.last_name,
  ph.from_class_id,
  ph.to_class_id,
  (SELECT name FROM classes WHERE id = ph.from_class_id) as from_class_name,
  (SELECT name FROM classes WHERE id = ph.to_class_id) as to_class_name,
  ph.action,
  ph.remarks
FROM promotion_history ph
JOIN students s ON s.id = ph.student_id
WHERE s.class_id = (SELECT id FROM classes WHERE LOWER(name) = 'basic 3' LIMIT 1)
  AND s.status = 'active'
ORDER BY ph.id DESC;
