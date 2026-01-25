-- FIX LOGIN 406 ERROR (ROBUST VERSION)
-- This script fixes the RLS policies preventing login and uses a helper function
-- to avoid syntax errors or recursion issues in the admin policy.

-- 1. Create a helper function to check if user is admin
-- This uses SECURITY DEFINER to bypass RLS when checking admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- 2. Verify RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 3. Allow PUBLIC read access (Essential for Login)
DROP POLICY IF EXISTS "Anyone can view profiles for login" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "enable_read_for_all_users" ON profiles;

CREATE POLICY "enable_read_for_all_users"
ON profiles FOR SELECT
TO public
USING (true);

-- 4. Allow Users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "enable_update_for_users_based_on_user_id" ON profiles;

CREATE POLICY "enable_update_for_users_based_on_user_id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 5. Allow Admins to manage everything (using the helper function)
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "enable_all_for_admins" ON profiles;

CREATE POLICY "enable_all_for_admins"
ON profiles FOR ALL
TO authenticated
USING ( is_admin() );

-- 6. Allow Insert during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- 7. Verification
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'profiles';
