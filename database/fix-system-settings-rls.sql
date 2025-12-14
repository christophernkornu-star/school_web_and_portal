-- Fix RLS policies for system_settings table
-- This allows students and teachers to read system settings

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;

-- Allow everyone (authenticated users) to view system settings
CREATE POLICY "Everyone can view system settings"
ON system_settings
FOR SELECT
USING (true);

-- Only admins can modify system settings
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

-- Verify policies were created
SELECT 'system_settings policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'system_settings';
