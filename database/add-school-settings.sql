-- Add school settings for Upper Primary teaching model
-- This allows admin to choose between:
-- 1. "class_teacher" - One teacher for all subjects (like Lower Primary)
-- 2. "subject_teacher" - Multiple teachers for different subjects (like JHS)

-- ============================================
-- CREATE SYSTEM SETTINGS TABLE (key-value store)
-- ============================================
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT CHECK (setting_type IN ('text', 'boolean', 'number', 'json')),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- ============================================
-- INSERT DEFAULT SETTINGS
-- ============================================
INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('upper_primary_teaching_model', 'class_teacher', 'text', 'Teaching model for Upper Primary (P4-P6). Options: class_teacher, subject_teacher'),
  ('current_academic_year', '2024/2025', 'text', 'Current academic year'),
  ('current_term', '1', 'number', 'Current term number (1, 2, or 3)')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;

-- ============================================
-- CREATE FUNCTION TO GET SETTING
-- ============================================
CREATE OR REPLACE FUNCTION get_school_setting(p_setting_key TEXT)
RETURNS TEXT AS $$
DECLARE
  v_setting_value TEXT;
BEGIN
  SELECT setting_value INTO v_setting_value
  FROM system_settings
  WHERE setting_key = p_setting_key;
  
  RETURN v_setting_value;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE FUNCTION TO UPDATE SETTING
-- ============================================
CREATE OR REPLACE FUNCTION update_school_setting(
  p_setting_key TEXT,
  p_setting_value TEXT,
  p_updated_by UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE system_settings
  SET setting_value = p_setting_value,
      updated_at = NOW(),
      updated_by = p_updated_by
  WHERE setting_key = p_setting_key;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE PERMISSIONS VIEW TO USE SETTING
-- ============================================
DROP VIEW IF EXISTS teacher_class_permissions CASCADE;

CREATE OR REPLACE VIEW teacher_class_permissions AS
SELECT 
  t.teacher_id,
  t.first_name,
  t.last_name,
  c.id as class_id,
  c.name as class_name,
  c.level,
  tca.is_class_teacher,
  COUNT(tsa.subject_id) as subjects_count,
  -- Get upper primary model setting
  (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') as upper_primary_model,
  -- Can view all subjects
  CASE 
    -- Lower Primary: If assigned, can view all subjects
    WHEN c.level = 'lower_primary' AND COUNT(tsa.subject_id) > 0 THEN true
    
    -- Upper Primary (Class Teacher Model): If assigned, can view all subjects
    WHEN c.level = 'upper_primary' 
         AND (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') = 'class_teacher'
         AND COUNT(tsa.subject_id) > 0 THEN true
    
    -- Upper Primary (Subject Teacher Model): Class teacher can view all, subject teacher only theirs
    WHEN c.level = 'upper_primary' 
         AND (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') = 'subject_teacher'
         AND tca.is_class_teacher = true THEN true
    WHEN c.level = 'upper_primary' 
         AND (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') = 'subject_teacher'
         AND COUNT(tsa.subject_id) > 0 THEN false
    
    -- JHS: Class teacher can view all, subject teacher only theirs
    WHEN c.level = 'jhs' AND tca.is_class_teacher = true THEN true
    WHEN c.level = 'jhs' AND COUNT(tsa.subject_id) > 0 THEN false
    
    ELSE false
  END as can_view_all_subjects,
  
  -- Can edit/delete scores for all subjects
  CASE 
    -- Lower Primary: Can edit all subjects
    WHEN c.level = 'lower_primary' AND COUNT(tsa.subject_id) > 0 THEN true
    
    -- Upper Primary (Class Teacher Model): Can edit all subjects
    WHEN c.level = 'upper_primary' 
         AND (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') = 'class_teacher'
         AND COUNT(tsa.subject_id) > 0 THEN true
    
    -- Upper Primary (Subject Teacher Model): Can only edit assigned subjects
    WHEN c.level = 'upper_primary' 
         AND (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') = 'subject_teacher' THEN false
    
    -- JHS: Can only edit assigned subjects (class teacher too)
    WHEN c.level = 'jhs' THEN false
    
    ELSE false
  END as can_edit_all_subjects,
  
  -- Can mark attendance
  CASE 
    WHEN tca.is_class_teacher = true THEN true
    WHEN c.level = 'lower_primary' AND COUNT(tsa.subject_id) > 0 THEN true
    WHEN c.level = 'upper_primary' 
         AND (SELECT setting_value FROM system_settings WHERE setting_key = 'upper_primary_teaching_model') = 'class_teacher'
         AND COUNT(tsa.subject_id) > 0 THEN true
    ELSE false
  END as can_mark_attendance
FROM teachers t
LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = t.teacher_id
LEFT JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.teacher_id AND tsa.class_id = tca.class_id
LEFT JOIN classes c ON c.id = tca.class_id OR c.id = tsa.class_id
WHERE tca.class_id IS NOT NULL OR tsa.class_id IS NOT NULL
GROUP BY t.teacher_id, t.first_name, t.last_name, c.id, c.name, c.level, tca.is_class_teacher;

-- ============================================
-- UPDATE SUBJECT ACCESS FUNCTION
-- ============================================
DROP FUNCTION IF EXISTS get_teacher_subject_access(TEXT, UUID);

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
  v_upper_primary_model TEXT;
BEGIN
  -- Get class info and check if teacher is class teacher
  SELECT c.level, COALESCE(tca.is_class_teacher, false)
  INTO v_class_level, v_is_class_teacher
  FROM classes c
  LEFT JOIN teacher_class_assignments tca ON tca.class_id = c.id AND tca.teacher_id = p_teacher_id
  WHERE c.id = p_class_id;

  -- Get upper primary setting
  SELECT setting_value INTO v_upper_primary_model
  FROM system_settings
  WHERE setting_key = 'upper_primary_teaching_model';

  -- Lower Primary: Full access if assigned
  IF v_class_level = 'lower_primary' THEN
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

  -- Upper Primary (Class Teacher Model): Full access if assigned
  ELSIF v_class_level = 'upper_primary' AND v_upper_primary_model = 'class_teacher' THEN
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

  -- Upper Primary (Subject Teacher Model): Class teacher views all, edits only assigned
  ELSIF v_class_level = 'upper_primary' AND v_upper_primary_model = 'subject_teacher' AND v_is_class_teacher THEN
    RETURN QUERY
    SELECT 
      s.id as subject_id,
      s.name as subject_name,
      true as can_view,
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as can_edit,
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as can_delete,
      CASE WHEN tsa.teacher_id IS NOT NULL THEN true ELSE false END as is_assigned_teacher
    FROM subjects s
    LEFT JOIN teacher_subject_assignments tsa ON tsa.subject_id = s.id AND tsa.teacher_id = p_teacher_id AND tsa.class_id = p_class_id
    WHERE s.level = v_class_level;

  -- JHS or Upper Primary Subject Teacher: Only assigned subjects
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
-- ENABLE RLS ON SETTINGS TABLE
-- ============================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read settings
CREATE POLICY "Allow public read system settings"
ON system_settings FOR SELECT
TO public
USING (true);

-- Only admins can update settings
CREATE POLICY "Allow admins to update system settings"
ON system_settings FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- ============================================
-- VIEW CURRENT SETTINGS
-- ============================================
SELECT * FROM system_settings ORDER BY setting_key;

-- ============================================
-- TEST QUERIES
-- ============================================

-- Check current upper primary model
SELECT get_school_setting('upper_primary_teaching_model') as upper_primary_model;

-- View permissions with current setting
SELECT 
  teacher_id,
  class_name,
  level,
  is_class_teacher,
  subjects_count,
  upper_primary_model,
  can_view_all_subjects,
  can_edit_all_subjects,
  can_mark_attendance
FROM teacher_class_permissions
WHERE level = 'upper_primary'
ORDER BY teacher_id, class_name;
