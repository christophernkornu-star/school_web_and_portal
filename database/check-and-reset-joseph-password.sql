-- Check Joseph's account details
SELECT 
  p.id,
  p.username,
  p.email,
  p.role,
  t.teacher_id,
  t.first_name,
  t.last_name
FROM profiles p
LEFT JOIN teachers t ON t.profile_id = p.id
WHERE p.username = '1417073' OR t.teacher_id = '1417073';

-- If the above returns results, use Supabase Dashboard to reset password:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Find user with email: joseph.ampenam@school.local
-- 3. Click on the user
-- 4. Click "Reset Password" or "Send Magic Link"
-- 5. Or manually update password to: 1417073

-- Alternative: Use this in Supabase SQL Editor (if you have the user ID)
-- Note: Replace 'USER_ID_HERE' with the actual UUID from the query above
-- This requires admin access and uses Supabase's admin functions
