-- Complete Teaching Model Implementation
-- This SQL sets up the system for different teaching models across school levels

-- 1. Add teaching model configuration to system_settings
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('upper_primary_teaching_model', 'class_teacher', 'Teaching model for Basic 4-6: class_teacher or subject_teacher'),
  ('lower_primary_teaching_model', 'class_teacher', 'Teaching model for Basic 1-3: always class_teacher'),
  ('jhs_teaching_model', 'subject_teacher', 'Teaching model for JHS 1-3: always subject_teacher')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  description = EXCLUDED.description;

-- 2. Modify teacher_class_assignments to include class teacher designation
ALTER TABLE teacher_class_assignments 
ADD COLUMN IF NOT EXISTS is_class_teacher BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN teacher_class_assignments.is_class_teacher IS 
'Indicates if this teacher is the designated class teacher for this class. Class teachers have additional responsibilities like attendance, student management, etc.';

-- 3. Modify teacher_subject_assignments to track teaching scope
ALTER TABLE teacher_subject_assignments
ADD COLUMN IF NOT EXISTS can_edit BOOLEAN DEFAULT true;

COMMENT ON COLUMN teacher_subject_assignments.can_edit IS
'For subject teacher model: determines if teacher can edit scores for this subject. Class teachers can view all but only edit their assigned subjects.';

-- 4. Create a view to easily see teacher assignments with context
CREATE OR REPLACE VIEW teacher_assignments_view AS
SELECT 
  t.id as teacher_uuid,
  t.teacher_id,
  t.first_name || ' ' || t.last_name as teacher_name,
  t.specialization,
  c.id as class_id,
  c.name as class_name,
  c.level,
  tca.is_class_teacher,
  tca.is_primary,
  CASE 
    WHEN c.level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'Lower Primary'
    WHEN c.level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN 'Upper Primary'
    WHEN c.level IN ('JHS 1', 'JHS 2', 'JHS 3') THEN 'JHS'
    ELSE 'Other'
  END as school_section,
  ARRAY_AGG(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL) as assigned_subjects,
  COUNT(DISTINCT tsa.subject_id) as subject_count
FROM teachers t
LEFT JOIN teacher_class_assignments tca ON t.id = tca.teacher_id
LEFT JOIN classes c ON tca.class_id = c.id
LEFT JOIN teacher_subject_assignments tsa ON t.id = tsa.teacher_id AND tsa.class_id = c.id
LEFT JOIN subjects s ON tsa.subject_id = s.id
WHERE t.status = 'active'
GROUP BY t.id, t.teacher_id, t.first_name, t.last_name, t.specialization, 
         c.id, c.name, c.level, tca.is_class_teacher, tca.is_primary;

-- 5. Create helper function to determine teaching model for a class
CREATE OR REPLACE FUNCTION get_teaching_model_for_class(class_level TEXT)
RETURNS TEXT AS $$
DECLARE
  model TEXT;
BEGIN
  IF class_level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN
    RETURN 'class_teacher';
  ELSIF class_level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN
    SELECT setting_value INTO model 
    FROM system_settings 
    WHERE setting_key = 'upper_primary_teaching_model';
    RETURN COALESCE(model, 'class_teacher');
  ELSIF class_level IN ('JHS 1', 'JHS 2', 'JHS 3') THEN
    RETURN 'subject_teacher';
  ELSE
    RETURN 'class_teacher';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Create helper function to check if teacher can edit a subject
CREATE OR REPLACE FUNCTION can_teacher_edit_subject(
  p_teacher_id UUID,
  p_class_id UUID,
  p_subject_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_class_level TEXT;
  v_teaching_model TEXT;
  v_is_class_teacher BOOLEAN;
  v_has_subject_assignment BOOLEAN;
BEGIN
  -- Get class level
  SELECT level INTO v_class_level FROM classes WHERE id = p_class_id;
  
  -- Get teaching model for this class
  v_teaching_model := get_teaching_model_for_class(v_class_level);
  
  -- Check if teacher is class teacher for this class
  SELECT is_class_teacher INTO v_is_class_teacher
  FROM teacher_class_assignments
  WHERE teacher_id = p_teacher_id AND class_id = p_class_id;
  
  -- For class teacher model, class teacher can edit all subjects
  IF v_teaching_model = 'class_teacher' AND v_is_class_teacher THEN
    RETURN true;
  END IF;
  
  -- For subject teacher model, check specific subject assignment
  IF v_teaching_model = 'subject_teacher' THEN
    SELECT EXISTS(
      SELECT 1 FROM teacher_subject_assignments
      WHERE teacher_id = p_teacher_id 
      AND class_id = p_class_id 
      AND subject_id = p_subject_id
      AND can_edit = true
    ) INTO v_has_subject_assignment;
    
    RETURN v_has_subject_assignment;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 7. Update RLS policies to use the new functions
-- For scores table - teachers can only edit scores they're authorized for
DROP POLICY IF EXISTS "Teachers can edit assigned subject scores" ON scores;
CREATE POLICY "Teachers can edit assigned subject scores"
ON scores
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = scores.student_id
    AND EXISTS (
      SELECT 1 FROM teachers t
      WHERE t.profile_id = auth.uid()
      AND can_teacher_edit_subject(t.id, s.class_id, scores.subject_id)
    )
  )
);

-- 8. Insert default subject assignments for Lower Primary (all subjects)
-- This ensures Basic 1-3 teachers have access to all subjects
CREATE OR REPLACE FUNCTION assign_all_subjects_to_class_teacher(p_teacher_id UUID, p_class_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete existing subject assignments for this teacher-class combination
  DELETE FROM teacher_subject_assignments 
  WHERE teacher_id = p_teacher_id AND class_id = p_class_id;
  
  -- Insert all subjects for this class
  INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, can_edit)
  SELECT p_teacher_id, s.id, p_class_id, true
  FROM subjects s
  WHERE s.id IN (
    SELECT DISTINCT subject_id FROM scores WHERE student_id IN (
      SELECT id FROM students WHERE class_id = p_class_id
    )
  );
END;
$$ LANGUAGE plpgsql;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tca_is_class_teacher ON teacher_class_assignments(is_class_teacher) WHERE is_class_teacher = true;
CREATE INDEX IF NOT EXISTS idx_tsa_can_edit ON teacher_subject_assignments(can_edit) WHERE can_edit = true;
CREATE INDEX IF NOT EXISTS idx_classes_level ON classes(level);

-- 10. Create function to get teacher's accessible classes (for teacher portal)
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

-- 11. Grant necessary permissions
GRANT SELECT ON teacher_assignments_view TO authenticated;
GRANT EXECUTE ON FUNCTION get_teaching_model_for_class(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION can_teacher_edit_subject(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_all_subjects_to_class_teacher(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_classes(UUID) TO authenticated;
