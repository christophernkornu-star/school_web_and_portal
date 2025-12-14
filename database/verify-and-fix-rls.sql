-- Verify and fix RLS for profiles table
-- This script checks the current state and ensures proper access

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check all current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- The issue: TO public might not work with Supabase
-- Solution: Use TO anon, authenticated instead

-- Drop the problematic policy
DROP POLICY IF EXISTS "enable_read_for_all_users" ON profiles;

-- Create policy that works with Supabase's role system
CREATE POLICY "enable_read_for_all_users"
ON profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Verify it was created correctly
SELECT policyname, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'profiles' 
AND policyname = 'enable_read_for_all_users';
