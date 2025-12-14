-- Fix infinite recursion in profiles RLS policies
-- Drop ALL existing policies first to clear any circular references

-- Disable RLS temporarily to ensure clean state
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "enable_read_for_all_users" ON profiles;
DROP POLICY IF EXISTS "enable_update_for_users_based_on_user_id" ON profiles;
DROP POLICY IF EXISTS "enable_all_for_admins" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies

-- 1. Allow anyone (authenticated or anonymous) to read all profiles
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Allow authenticated users to update their own profile only
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Allow authenticated users to insert their own profile
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
