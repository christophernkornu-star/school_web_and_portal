-- Comprehensive fix for teachers table RLS and admin role

-- Step 1: Check current admin users
SELECT 'Current admin users:' as step;
SELECT id, username, email, role 
FROM profiles 
WHERE username LIKE 'admin%' OR email LIKE '%admin%';

-- Step 2: Update admin role for fortune user
UPDATE profiles 
SET role = 'admin' 
WHERE username = 'admin.fortune';

-- Step 3: Also update any user logged in as admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin.fortune@school.local';

-- Step 4: Completely drop and recreate teachers RLS policies
DROP POLICY IF EXISTS "Admins can view all teachers" ON teachers;
DROP POLICY IF EXISTS "Teachers can view own profile" ON teachers;
DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can manage all teachers" ON teachers;
DROP POLICY IF EXISTS "Public can view teachers" ON teachers;
DROP POLICY IF EXISTS "Public can view teacher info" ON teachers;

-- Step 5: Temporarily disable RLS to test
ALTER TABLE teachers DISABLE ROW LEVEL SECURITY;

-- Step 6: Re-enable RLS
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

-- Step 7: Create simple, working admin policy
CREATE POLICY "Admins full access"
ON teachers
FOR ALL
TO authenticated
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

-- Step 8: Teachers can view their own profile
CREATE POLICY "Teachers view own"
ON teachers
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Step 9: Public can view teacher info
CREATE POLICY "Public view teachers"
ON teachers
FOR SELECT
TO anon, authenticated
USING (true);

-- Step 10: Verify everything
SELECT 'Admin users after update:' as verification;
SELECT id, username, email, role 
FROM profiles 
WHERE role = 'admin';

SELECT 'Teachers RLS policies:' as verification;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'teachers';
