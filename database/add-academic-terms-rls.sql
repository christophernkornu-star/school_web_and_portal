-- Add RLS policies for academic_terms table
-- This allows admins to manage academic terms and attendance settings

-- Enable RLS on academic_terms
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Everyone can view academic terms" ON academic_terms;
DROP POLICY IF EXISTS "Admins can manage academic terms" ON academic_terms;

-- Everyone can view academic terms (needed for public displays, student/teacher access)
CREATE POLICY "Everyone can view academic terms"
ON academic_terms
FOR SELECT
USING (true);

-- Only admins can insert, update, or delete academic terms
CREATE POLICY "Admins can manage academic terms"
ON academic_terms
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

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'academic_terms'
ORDER BY policyname;
