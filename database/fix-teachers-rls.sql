-- Fix RLS policies for teachers table to allow admins to view all teachers

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can manage all teachers" ON teachers;
DROP POLICY IF EXISTS "Public can view teachers" ON teachers;
DROP POLICY IF EXISTS "Public can view teacher info" ON teachers;

-- Enable RLS (if not already enabled)
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admins can do everything
CREATE POLICY "Admins can manage all teachers"
ON teachers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Policy 2: Teachers can view their own profile
CREATE POLICY "Teachers can view own profile"
ON teachers
FOR SELECT
USING (
  profile_id = auth.uid()
);

-- Policy 3: Everyone can view basic teacher info (for public pages)
CREATE POLICY "Public can view teacher info"
ON teachers
FOR SELECT
USING (true);

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'teachers';
