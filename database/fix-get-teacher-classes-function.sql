-- Fix get_teacher_classes function to return subject IDs and names as JSONB
-- This allows proper TypeScript typing for subjects_taught array

-- Drop the old function
DROP FUNCTION IF EXISTS get_teacher_classes(UUID);

-- Create updated function that returns subjects as JSONB array with id and name
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
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    c.id as class_id,
    c.name as class_name,
    c.level,
    COALESCE(tca.is_class_teacher, false) as is_class_teacher,
    
    -- Determine teaching model based on level
    CASE 
      WHEN c.level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'class_teacher'
      WHEN c.level IN ('JHS 1', 'JHS 2', 'JHS 3') THEN 'subject_teacher'
      WHEN c.level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN 
        COALESCE((SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model'), 'class_teacher')
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
    
    -- Permissions based on class teacher status and teaching model
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
  LEFT JOIN teacher_subject_assignments tsa ON tsa.class_id = c.id AND tsa.teacher_id = t.id
  LEFT JOIN subjects s ON s.id = tsa.subject_id
  WHERE t.profile_id = p_profile_id
  GROUP BY c.id, c.name, c.level, tca.is_class_teacher;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_teacher_classes(UUID) TO authenticated;

-- Test the function (replace with actual profile_id)
-- SELECT * FROM get_teacher_classes('your-profile-id-here');

-- Verify the structure
SELECT 
  class_name,
  is_class_teacher,
  teaching_model,
  subjects_taught,
  can_edit_all_subjects
FROM get_teacher_classes((SELECT profile_id FROM teachers LIMIT 1))
LIMIT 1;
