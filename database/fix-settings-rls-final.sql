-- Final fix for System Settings RLS
-- Run this in Supabase SQL Editor

-- 1. Create a secure function to check admin status
-- This bypasses RLS on profiles table to avoid recursion/access issues
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Reset policies on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Allow all for admins" ON system_settings;
DROP POLICY IF EXISTS "Allow select for all" ON system_settings;

-- 3. Create simplified policies using the function
CREATE POLICY "Allow select for all"
ON system_settings
FOR SELECT
USING (true);

CREATE POLICY "Allow all for admins"
ON system_settings
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- 4. Ensure the row exists to prevent INSERT issues if that's the blocker
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('upper_primary_teaching_model', 'class_teacher', 'Teaching model for Upper Primary')
ON CONFLICT (setting_key) DO UPDATE 
SET description = 'Teaching model for Upper Primary';

-- 5. Verify
SELECT * FROM system_settings WHERE setting_key = 'upper_primary_teaching_model';
