-- Final Robust Fix for get_teacher_classes
-- This version handles ALL level naming conventions (Basic 1 vs lower_primary, JHS 1 vs jhs, etc.)
-- and ensures Class Teachers always see their relevant subjects, even if explicit assignments are missing.

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
  -- Get the Upper Primary teaching model setting
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
    
    -- Determine teaching model based on level (flexible for both naming conventions)
    CASE 
      WHEN c.level IN ('Kindergarten', 'KG 1', 'KG 2') OR c.level ILIKE '%KG%' THEN 'class_teacher'
      WHEN c.level IN ('Basic 1', 'Basic 2', 'Basic 3', 'lower_primary') THEN 'class_teacher'
      WHEN c.level IN ('JHS 1', 'JHS 2', 'JHS 3', 'Basic 7', 'Basic 8', 'Basic 9', 'jhs') THEN 'subject_teacher'
      WHEN c.level IN ('Basic 4', 'Basic 5', 'Basic 6', 'upper_primary') THEN v_upper_primary_model
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
      WHEN EXISTS (SELECT 1 FROM teacher_subject_assignments tsa_edit WHERE tsa_edit.class_id = c.id AND tsa_edit.teacher_id = t.id AND tsa_edit.can_edit = true) THEN true
      ELSE false
    END as can_edit_all_subjects,
    
    CASE 
      WHEN COALESCE(tca.is_class_teacher, false) = true THEN true
      ELSE false
    END as can_mark_attendance
    
  FROM classes c
  INNER JOIN teacher_class_assignments tca ON tca.class_id = c.id
  INNER JOIN teachers t ON t.id = tca.teacher_id
  
  -- Join subjects with Smart Level Mapping
  LEFT JOIN subjects s ON 
    (
        -- 1. Explicit Assignment (Always included)
        EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa 
            WHERE tsa.class_id = c.id 
            AND tsa.teacher_id = t.id 
            AND tsa.subject_id = s.id
        )
    )
    OR 
    (
        -- 2. Implicit Assignment for Class Teachers
        -- If teacher is class teacher, they get all subjects matching the class level group
        tca.is_class_teacher = true 
        AND 
        (
           -- Match 'Basic 1-3' to 'lower_primary'
           (c.level IN ('Basic 1', 'Basic 2', 'Basic 3', 'lower_primary') AND s.level = 'lower_primary')
           OR
           -- Match 'Basic 4-6' to 'upper_primary' (if model is class_teacher)
           (c.level IN ('Basic 4', 'Basic 5', 'Basic 6', 'upper_primary') AND s.level = 'upper_primary' AND v_upper_primary_model = 'class_teacher')
           OR
           -- Match Kindergarten
           ((c.level IN ('Kindergarten', 'KG 1', 'KG 2') OR c.level ILIKE '%KG%') AND (s.level = 'kindergarten' OR s.level = 'Kindergarten'))
           OR
           -- Match JHS (This was missing!)
           (c.level IN ('JHS 1', 'JHS 2', 'JHS 3', 'Basic 7', 'Basic 8', 'Basic 9', 'jhs') AND s.level IN ('jhs', 'JHS', 'Junior High'))
           OR
           -- Direct match (fallback)
           (s.level = c.level)
        )
    )

  WHERE t.profile_id = p_profile_id
  GROUP BY c.id, c.name, c.level, tca.is_class_teacher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_teacher_classes(UUID) TO authenticated;
