-- Ensure profiles table is readable for authentication checks
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT
  USING (id = auth.uid());

-- Allow teachers to read all profiles (needed if we check roles via profiles in other policies)
-- Or better, just allow authenticated users to read profiles if that's safe for your app
-- For now, let's ensure the current user can read their own profile to verify their role.

-- The previous policy `SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'`
-- requires the user to be able to SELECT from profiles where id = auth.uid().
-- The "Users can view own profile" policy covers this.

-- Just in case, let's make sure there isn't a restrictive policy blocking it.
