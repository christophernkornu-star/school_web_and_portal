-- Teacher Access Control and Permissions System

-- ============================================
-- 1. HELPER FUNCTION: Check if teacher is class teacher
-- ============================================
CREATE OR REPLACE FUNCTION is_class_teacher(p_teacher_id TEXT, p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teacher_class_assignments
    WHERE teacher_id = p_teacher_id
    AND class_id = p_class_id
    AND is_class_teacher = true
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. HELPER FUNCTION: Check if teacher teaches subject in class
-- ============================================
CREATE OR REPLACE FUNCTION teaches_subject(p_teacher_id TEXT, p_subject_id UUID, p_class_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM teacher_subject_assignments
    WHERE teacher_id = p_teacher_id
    AND subject_id = p_subject_id
    AND class_id = p_class_id
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. VIEW: Teacher Permissions per Class
-- ============================================
CREATE OR REPLACE VIEW teacher_class_permissions AS
SELECT 
  t.teacher_id,
  t.first_name,
  t.last_name,
  c.id as class_id,
  c.name as class_name,
  c.level,
  tca.is_class_teacher,
  -- Count subjects taught
  COUNT(tsa.subject_id) as subjects_count,
  -- Permissions
  CASE 
    -- Lower Primary: If assigned, has full access to all subjects
    WHEN c.level = 'lower_primary' AND COUNT(tsa.subject_id) > 0 THEN true
    -- Upper Primary: Class teacher has full access, subject teacher only their subjects
    WHEN c.level = 'upper_primary' AND tca.is_class_teacher = true THEN true
    WHEN c.level = 'upper_primary' AND COUNT(tsa.subject_id) > 0 THEN false
    -- JHS: Class teacher has full access, subject teachers only their subjects
    WHEN c.level = 'jhs' AND tca.is_class_teacher = true THEN true
    WHEN c.level = 'jhs' AND COUNT(tsa.subject_id) > 0 THEN false
    ELSE false
  END as can_view_all_subjects,
  -- Can edit scores for all subjects
  CASE 
    WHEN c.level = 'lower_primary' AND COUNT(tsa.subject_id) > 0 THEN true
    WHEN c.level = 'upper_primary' AND tca.is_class_teacher = true THEN false
    WHEN c.level = 'jhs' AND tca.is_class_teacher = true THEN false
    ELSE false
  END as can_edit_all_subjects,
  -- Can mark attendance
  CASE 
    WHEN tca.is_class_teacher = true THEN true
    WHEN c.level = 'lower_primary' AND COUNT(tsa.subject_id) > 0 THEN true
    ELSE false
  END as can_mark_attendance
FROM teachers t
LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = t.teacher_id
LEFT JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.teacher_id AND tsa.class_id = tca.class_id
LEFT JOIN classes c ON c.id = tca.class_id OR c.id = tsa.class_id
WHERE tca.class_id IS NOT NULL OR tsa.class_id IS NOT NULL
GROUP BY t.teacher_id, t.first_name, t.last_name, c.id, c.name, c.level, tca.is_class_teacher;

-- ============================================
-- 4. VIEW: Teacher Subject Access
-- ============================================
CREATE OR REPLACE VIEW teacher_subject_access AS
SELECT 
  t.teacher_id,
  tsa.class_id,
  tsa.subject_id,
  s.name as subject_name,
  c.name as class_name,
  c.level,
  tca.is_class_teacher,
  -- Permissions for this specific subject
  true as can_view_scores,
  CASE 
    -- Can edit if they teach this subject
    WHEN tsa.teacher_id IS NOT NULL THEN true
    -- Lower Primary teacher can edit all subjects in their class
    WHEN c.level = 'lower_primary' AND tca.is_class_teacher = true THEN true
    -- Class teachers can only VIEW other subjects, not edit
    ELSE false
  END as can_edit_scores,
  CASE 
    WHEN tsa.teacher_id IS NOT NULL THEN true
    WHEN c.level = 'lower_primary' AND tca.is_class_teacher = true THEN true
    ELSE false
  END as can_delete_scores
FROM teachers t
LEFT JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.teacher_id
LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = t.teacher_id AND (tca.class_id = tsa.class_id OR tca.class_id IS NOT NULL)
LEFT JOIN subjects s ON s.id = tsa.subject_id
LEFT JOIN classes c ON c.id = tsa.class_id OR c.id = tca.class_id
WHERE tsa.subject_id IS NOT NULL OR tca.class_id IS NOT NULL;

-- ============================================
-- 5. QUERY: Get Teacher's Accessible Classes
-- ============================================
-- Use this in the teacher portal to show only classes they have access to
CREATE OR REPLACE FUNCTION get_teacher_classes(p_teacher_id TEXT)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  level TEXT,
  is_class_teacher BOOLEAN,
  subjects_taught TEXT[],
  can_view_all_subjects BOOLEAN,
  can_edit_all_subjects BOOLEAN,
  can_mark_attendance BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as class_id,
    c.name as class_name,
    c.level,
    COALESCE(tca.is_class_teacher, false) as is_class_teacher,
    ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.id IS NOT NULL) as subjects_taught,
    tcp.can_view_all_subjects,
    tcp.can_edit_all_subjects,
    tcp.can_mark_attendance
  FROM classes c
  LEFT JOIN teacher_class_assignments tca ON tca.class_id = c.id AND tca.teacher_id = p_teacher_id
  LEFT JOIN teacher_subject_assignments tsa ON tsa.class_id = c.id AND tsa.teacher_id = p_teacher_id
  LEFT JOIN subjects s ON s.id = tsa.subject_id
  LEFT JOIN teacher_class_permissions tcp ON tcp.teacher_id = p_teacher_id AND tcp.class_id = c.id
  WHERE (tca.teacher_id IS NOT NULL OR tsa.teacher_id IS NOT NULL)
  GROUP BY c.id, c.name, c.level, tca.is_class_teacher, tcp.can_view_all_subjects, tcp.can_edit_all_subjects, tcp.can_mark_attendance;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. QUERY: Get Teacher's Accessible Subjects in a Class
-- ============================================
CREATE OR REPLACE FUNCTION get_teacher_subject_access(p_teacher_id TEXT, p_class_id UUID)
RETURNS TABLE (
  subject_id UUID,
  subject_name TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  is_assigned_teacher BOOLEAN
) AS $$
DECLARE
  v_is_class_teacher BOOLEAN;
  v_class_level TEXT;
BEGIN
  -- Check if teacher is class teacher
  SELECT tca.is_class_teacher, c.level
  INTO v_is_class_teacher, v_class_level
  FROM teacher_class_assignments tca
  JOIN classes c ON c.id = tca.class_id
  WHERE tca.teacher_id = p_teacher_id AND tca.class_id = p_class_id;

  -- If class teacher in JHS or Upper Primary: can VIEW all, but only EDIT assigned subjects
  IF v_is_class_teacher AND v_class_level IN ('jhs', 'upper_primary') THEN
    RETURN QUERY
    SELECT 
      s.id as subject_id,
      s.name as subject_name,
      true as can_view,  -- Can view all subjects
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as can_edit,  -- Can only edit assigned
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as can_delete,  -- Can only delete assigned
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as is_assigned_teacher
    FROM subjects s
    LEFT JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id AND tsa.teacher_id = p_teacher_id AND tsa.class_id = p_class_id
    WHERE s.level = v_class_level;
  
  -- If Lower Primary teacher OR assigned to all subjects: full access
  ELSE
    RETURN QUERY
    SELECT 
      s.id as subject_id,
      s.name as subject_name,
      true as can_view,
      true as can_edit,
      true as can_delete,
      true as is_assigned_teacher
    FROM subjects s
    JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id
    WHERE tsa.teacher_id = p_teacher_id AND tsa.class_id = p_class_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. TEST QUERIES
-- ============================================

-- View all teacher permissions
SELECT * FROM teacher_class_permissions ORDER BY teacher_id, class_name;

-- Get classes accessible to a specific teacher
SELECT * FROM get_teacher_classes('TCH0001');

-- Get subject access for a teacher in a specific class
SELECT * FROM get_teacher_subject_access('TCH0001', (SELECT id FROM classes WHERE name = 'Primary 1'));

-- ============================================
-- 8. PERMISSION RULES SUMMARY
-- ============================================

/*
PERMISSION MATRIX:

+------------------+-------------------+-------------------+-------------------+
| Teacher Type     | View Scores       | Edit/Delete       | Mark Attendance  |
|                  |                   | Scores            |                   |
+------------------+-------------------+-------------------+-------------------+
| Lower Primary    | All subjects in   | All subjects in   | Yes              |
| (Assigned)       | assigned class    | assigned class    |                  |
+------------------+-------------------+-------------------+-------------------+
| Upper Primary    | All subjects in   | All subjects in   | Yes              |
| (One Teacher)    | assigned class    | assigned class    |                  |
+------------------+-------------------+-------------------+-------------------+
| Upper Primary    | Only assigned     | Only assigned     | No               |
| (Subject Teacher)| subjects          | subjects          |                  |
+------------------+-------------------+-------------------+-------------------+
| JHS Class        | All subjects in   | Only assigned     | Yes              |
| Teacher          | class             | subjects          |                  |
+------------------+-------------------+-------------------+-------------------+
| JHS Subject      | Only assigned     | Only assigned     | No               |
| Teacher          | subjects          | subjects          |                  |
+------------------+-------------------+-------------------+-------------------+
*/
