-- Final Fix v5: STRICTly fix permissions for JHS Class Teachers
-- This resolves the issue where JHS Class Teachers were accidentally given
-- "can_edit_all_subjects" = true and therefore saw all subjects in grading pages
-- just because they were marked as "is_class_teacher".

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
    
    -- Determine teaching model based on level
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
    
    -- STRCIT PERMISSION LOGIC (Fix down here)
    -- They can edit all subjects ONLY IF:
    -- 1. They are the Class Teacher AND the model is actually 'class_teacher' (e.g. Basic 1)
    -- OR
    -- 2. They have explicitly been granted edit rights in teacher_subject_assignments
    CASE 
      WHEN (
        COALESCE(tca.is_class_teacher, false) = true 
        AND 
        CASE 
          WHEN c.level IN ('Kindergarten', 'KG 1', 'KG 2') OR c.level ILIKE '%KG%' THEN 'class_teacher'
          WHEN c.level IN ('Basic 1', 'Basic 2', 'Basic 3', 'lower_primary') THEN 'class_teacher'
          WHEN c.level IN ('JHS 1', 'JHS 2', 'JHS 3', 'Basic 7', 'Basic 8', 'Basic 9', 'jhs') THEN 'subject_teacher'
          WHEN c.level IN ('Basic 4', 'Basic 5', 'Basic 6', 'upper_primary') THEN v_upper_primary_model
          ELSE 'class_teacher'
        END = 'class_teacher'
      ) THEN true
      WHEN BOOL_OR(tsa_base.can_edit) IS TRUE THEN true
      ELSE false
    END as can_edit_all_subjects,
    
    CASE 
      WHEN COALESCE(tca.is_class_teacher, false) = true THEN true
      ELSE false
    END as can_mark_attendance
    
  FROM teachers t
  INNER JOIN teacher_class_assignments tca ON tca.teacher_id = t.id
  INNER JOIN classes c ON c.id = tca.class_id
  
  -- Join purely for permission aggregation (fixes the subquery group by issue)
  LEFT JOIN teacher_subject_assignments tsa_base ON tsa_base.class_id = c.id AND tsa_base.teacher_id = t.id
  
  -- Join subjects with strictly scoped Implicit Logic
  LEFT JOIN subjects s ON 
    (
        -- 1. Explicit Assignment (ALWAYS RESPECTED - This comes from Admin Portal)
        EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa 
            WHERE tsa.class_id = c.id 
            AND tsa.teacher_id = t.id 
            AND tsa.subject_id = s.id
        )
    )
    OR 
    (
        -- 2. Implicit Assignment (RESTRICTED SCOPE)
        -- Only applies to Lower Primary & KG where one teacher teaches everything.
        -- explicitly EXCLUDES JHS (Basic 7-9).
        tca.is_class_teacher = true 
        AND 
        (
           -- Match 'Basic 1-3' to 'lower_primary'
           (c.level IN ('Basic 1', 'Basic 2', 'Basic 3', 'lower_primary') AND s.level = 'lower_primary')
           OR
           -- Match Kindergarten
           ((c.level IN ('Kindergarten', 'KG 1', 'KG 2') OR c.level ILIKE '%KG%') AND (s.level = 'kindergarten' OR s.level = 'Kindergarten'))
           OR
           -- Match 'Basic 4-6' (Upper Primary) ONLY if configured as class_teacher model
           (
             c.level IN ('Basic 4', 'Basic 5', 'Basic 6', 'upper_primary') 
             AND s.level = 'upper_primary' 
             AND v_upper_primary_model = 'class_teacher'
           )
           
           -- NOTE: JHS (Basic 7-9) is intentionally OMITTED here.
           -- They must have explicit assignments in teacher_subject_assignments.
        )
    )

  WHERE t.profile_id = p_profile_id
  GROUP BY c.id, c.name, c.level, tca.is_class_teacher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_teacher_classes(UUID) TO authenticated;
