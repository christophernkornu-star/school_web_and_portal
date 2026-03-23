-- Update get_teacher_classes function to automatically include subjects for Class Teachers
-- This ensures the Teacher Portal reflects "All Subjects" for class teachers even if explicit assignments are missing
-- This fixes the issue where implicit "Class Teacher" model assignments weren't showing up

DROP FUNCTION IF EXISTS get_teacher_classes(UUID);

CREATE OR REPLACE FUNCTION get_teacher_classes(p_profile_id UUID)
RETURNS TABLE (
  class_id UUID,
  class_name TEXT,
  level TEXT,
  is_class_teacher BOOLEAN,
  teaching_model TEXT,
  subjects_taught JSONB,
  can_view_all_subjects BOOLEAN,
  can_edit_all_subjects BOOLEAN,
  can_mark_attendance BOOLEAN
) AS $$
DECLARE
  v_upper_primary_model TEXT;
BEGIN
  -- Get the Upper Primary teaching model setting once or assume default if table missing
  BEGIN
    SELECT setting_value INTO v_upper_primary_model 
    FROM system_settings 
    WHERE setting_key = 'upper_primary_teaching_model';
  EXCEPTION WHEN OTHERS THEN
    v_upper_primary_model := 'class_teacher';
  END;
  
  -- Default to class_teacher if not set
  IF v_upper_primary_model IS NULL THEN
    v_upper_primary_model := 'class_teacher';
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    c.id as class_id,
    c.name as class_name,
    c.level,
    COALESCE(tca.is_class_teacher, false) as is_class_teacher,
    
    -- Determine teaching model based on level
    CASE 
      WHEN c.level IN ('Kindergarten', 'KG 1', 'KG 2') THEN 'class_teacher'
      WHEN c.level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'class_teacher'
      WHEN c.level IN ('JHS 1', 'JHS 2', 'JHS 3') THEN 'subject_teacher'
      WHEN c.level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN v_upper_primary_model
      ELSE 'class_teacher'
    END::TEXT as teaching_model,
    
    -- Subjects as JSONB array with subject_id and subject_name
    COALESCE(
      JSONB_AGG(
        DISTINCT JSONB_BUILD_OBJECT(
          'subject_id', s.id,
          'subject_name', s.name
        )
      ) FILTER (WHERE s.id IS NOT NULL),
      '[]'::JSONB
    ) as subjects_taught,
    
    -- Permissions
    true as can_view_all_subjects,
    
    CASE 
      WHEN COALESCE(tca.is_class_teacher, false) = true THEN true
      ELSE false
    END as can_edit_all_subjects,
    
    CASE 
      WHEN COALESCE(tca.is_class_teacher, false) = true THEN true
      ELSE false
    END as can_mark_attendance
    
  FROM classes c
  INNER JOIN teacher_class_assignments tca ON tca.class_id = c.id
  INNER JOIN teachers t ON t.id = tca.teacher_id
  
  -- Join subjects cautiously
  -- Either explicitly assigned, OR implicitly assigned via Class Teacher model
  LEFT JOIN subjects s ON 
    (
        -- Case 1: Explicit assignment (always respected)
        EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa 
            WHERE tsa.class_id = c.id 
            AND tsa.teacher_id = t.id 
            AND tsa.subject_id = s.id
        )
    )
    OR 
    (
        -- Case 2: Implicit assignment for Class Teachers
        tca.is_class_teacher = true 
        AND 
        s.level = c.level -- Subject Level must match Class Level exactly
        AND
        (
           -- Only for levels that support Class Teacher Model implicitly
           -- KG, Lower Primary
           c.level IN ('Kindergarten', 'KG 1', 'KG 2', 'Basic 1', 'Basic 2', 'Basic 3')
           OR
           -- Upper Primary if configured
           (c.level IN ('Basic 4', 'Basic 5', 'Basic 6') AND v_upper_primary_model = 'class_teacher')
        )
    )
  WHERE t.profile_id = p_profile_id
  GROUP BY c.id, c.name, c.level, tca.is_class_teacher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_teacher_classes(UUID) TO authenticated;
