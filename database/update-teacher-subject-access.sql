-- Update get_teacher_subject_access to give Class Teachers full access
-- regardless of the teaching model (as requested for Basic 7-9)

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
  v_mapped_level TEXT;
BEGIN
  -- Check if teacher is class teacher and get class level
  SELECT tca.is_class_teacher, c.level
  INTO v_is_class_teacher, v_class_level
  FROM teacher_class_assignments tca
  JOIN classes c ON c.id = tca.class_id
  WHERE tca.teacher_id = p_teacher_id AND tca.class_id = p_class_id;

  -- Map specific class levels to subject levels (lower_primary, upper_primary, jhs)
  v_mapped_level := CASE 
    WHEN v_class_level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'lower_primary'
    WHEN v_class_level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN 'upper_primary'
    WHEN v_class_level IN ('JHS 1', 'JHS 2', 'JHS 3', 'Basic 7', 'Basic 8', 'Basic 9') THEN 'jhs'
    ELSE v_class_level -- Fallback if it's already one of the categories or unknown
  END;

  -- If Class Teacher: Full Access to ALL subjects in that level
  IF v_is_class_teacher THEN
    RETURN QUERY
    SELECT 
      s.id as subject_id,
      s.name as subject_name,
      true as can_view,
      true as can_edit,
      true as can_delete,
      -- Check if they are also explicitly assigned (for UI purposes)
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as is_assigned_teacher
    FROM subjects s
    LEFT JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id AND tsa.teacher_id = p_teacher_id AND tsa.class_id = p_class_id
    WHERE s.level = v_mapped_level;
  
  -- If Subject Teacher (not class teacher): Access only to assigned subjects
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_teacher_subject_access(TEXT, UUID) TO authenticated;
