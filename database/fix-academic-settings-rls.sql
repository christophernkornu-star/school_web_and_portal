-- Fix academic_settings RLS to allow students to read vacation/reopening dates
-- This allows students to view dates on their report cards

-- Drop the admin-only read policy
DROP POLICY IF EXISTS "Admins can view academic settings" ON academic_settings;

-- Create new policy allowing everyone to read academic settings
CREATE POLICY "Everyone can view academic settings"
ON academic_settings FOR SELECT
USING (true);

-- Keep the admin-only update policy
DROP POLICY IF EXISTS "Admins can update academic settings" ON academic_settings;

CREATE POLICY "Admins can update academic settings"
ON academic_settings FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Create insert policy for admins
CREATE POLICY "Admins can insert academic settings"
ON academic_settings FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'academic_settings';
