-- Fix RLS policies for system_settings and pre-populate keys
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure clean state
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can insert system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can update system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can delete system settings" ON system_settings;
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;

-- 3. Create permissive policies for Admins
CREATE POLICY "Admins can manage system settings"
ON system_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 4. Allow everyone to view settings (needed for login page, etc)
CREATE POLICY "Everyone can view system settings"
ON system_settings
FOR SELECT
USING (true);

-- 5. Pre-insert default keys to avoid INSERT permission issues if any
-- This ensures that the application will mostly perform UPDATEs
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('current_academic_year', '2024/2025', 'Current Academic Year'),
  ('current_term', '', 'Current Term ID'),
  ('term_start_date', '', 'Start date of the current term'),
  ('term_end_date', '', 'End date of the current term'),
  ('next_term_starts', '', 'Start date of the next term'),
  ('school_reopening_date', '', 'Date when school reopens'),
  ('vacation_start_date', '', 'Date when vacation starts'),
  ('allow_online_admission', 'true', 'Allow online admission'),
  ('allow_result_viewing', 'true', 'Allow result viewing'),
  ('upper_primary_teaching_model', 'class_teacher', 'Teaching model for Upper Primary')
ON CONFLICT (setting_key) DO NOTHING;

-- 6. Verify
SELECT * FROM system_settings;
