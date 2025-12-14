-- Test if get_teacher_classes function exists and works
-- Replace with your actual teacher profile_id from the check-teacher-assignment.sql results
SELECT * FROM get_teacher_classes('0a6c6272-9a1b-45cb-97af-c7431110ff72');

-- If the function doesn't exist, create it
CREATE OR REPLACE FUNCTION get_teacher_classes(p_profile_id UUID)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  level TEXT,
  is_class_teacher BOOLEAN,
  subjects_taught TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id as class_id,
    c.name as class_name,
    c.level,
    COALESCE(tca.is_class_teacher, false) as is_class_teacher,
    ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.id IS NOT NULL) as subjects_taught
  FROM classes c
  INNER JOIN teacher_class_assignments tca ON tca.class_id = c.id
  INNER JOIN teachers t ON t.id = tca.teacher_id
  LEFT JOIN teacher_subject_assignments tsa ON tsa.class_id = c.id AND tsa.teacher_id = t.id
  LEFT JOIN subjects s ON s.id = tsa.subject_id
  WHERE t.profile_id = p_profile_id
  GROUP BY c.id, c.name, c.level, tca.is_class_teacher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_teacher_classes(UUID) TO authenticated;
