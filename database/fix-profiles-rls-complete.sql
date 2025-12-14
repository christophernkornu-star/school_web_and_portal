-- Complete fix for login RLS issues
-- Run this entire script in Supabase SQL Editor

-- Step 1: Disable RLS temporarily to see all policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles';

-- Step 2: Drop ALL existing policies on profiles table
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles for login" ON profiles;
DROP POLICY IF EXISTS "Public can view profiles for login" ON profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;

-- Step 3: Create simple public read policy for login
CREATE POLICY "enable_read_for_all_users"
ON profiles FOR SELECT
TO public
USING (true);

-- Step 4: Create policy for users to update their own profile
CREATE POLICY "enable_update_for_users_based_on_user_id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- Step 5: Create policy for admins to manage all profiles
CREATE POLICY "enable_all_for_admins"
ON profiles FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Step 6: Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify the new policies
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;
