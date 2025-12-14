-- FIX LOGIN ISSUE - RLS Policy Blocking Profile Lookup
-- Run this in Supabase SQL Editor to fix the login problem

-- The issue: RLS policies are blocking unauthenticated users from reading profiles
-- This prevents the username lookup during login

-- Solution: Drop the restrictive policy and create a public read policy

-- Step 1: Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

-- Step 2: Create a new policy that allows anyone to read profiles (needed for login)
CREATE POLICY "Anyone can view profiles for login" ON profiles
  FOR SELECT USING (true);

-- Step 3: Verify the policy was created
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles';

-- You should see: "Anyone can view profiles for login" in the results

-- Now try logging in again with your username and password!
