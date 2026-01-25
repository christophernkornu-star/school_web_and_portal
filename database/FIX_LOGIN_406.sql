-- FIX LOGIN 406 ERROR (RLS POLICY)
-- The "406 Not Acceptable" error occurs because the public (unauthenticated) login page
-- tries to query the "profiles" table to find the email associated with a username.
-- If RLS blocks this read, it returns 0 rows (or an error), causing the 406.

-- 1. Enable RLS on profiles (ensure it's on)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Allow PUBLIC read access to profiles
-- This is required so the login page can look up "username -> email" before the user is logged in.
DROP POLICY IF EXISTS "Anyone can view profiles for login" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "enable_read_for_all_users" ON profiles;

CREATE POLICY "enable_read_for_all_users"
ON profiles FOR SELECT
TO public
USING (true);

-- 3. Allow Users to Update their own profiles (for password changes/bio)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "enable_update_for_users_based_on_user_id" ON profiles;

CREATE POLICY "enable_update_for_users_based_on_user_id"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 4. Allow Admins to do everything
DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "enable_all_for_admins" ON profiles;

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

-- 5. Allow Insert during signup (if self-registration is used) or Admin creation
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;

CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);


-- VERIFICATION
SELECT schemaname, tablename, policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'profiles';
