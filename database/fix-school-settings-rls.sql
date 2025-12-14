-- Fix RLS policies for school_settings table

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view school settings" ON school_settings;
DROP POLICY IF EXISTS "Admins can manage school settings" ON school_settings;
DROP POLICY IF EXISTS "Public can view school settings" ON school_settings;

-- Enable RLS (if not already enabled)
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can view school settings (public information)
CREATE POLICY "Public can view school settings"
ON school_settings
FOR SELECT
USING (true);

-- Policy 2: Only admins can insert/update/delete
CREATE POLICY "Admins can manage school settings"
ON school_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Verify the table exists and has data
SELECT * FROM school_settings LIMIT 5;
