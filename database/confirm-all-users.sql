-- Confirm all user emails in auth.users table
-- This bypasses email verification for all users

-- Note: This requires access to auth.users table which may not be directly accessible
-- You may need to run this through Supabase Dashboard or use the Management API

-- Check current confirmation status
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Not Confirmed'
    ELSE '✅ Confirmed'
  END as status
FROM auth.users
WHERE email LIKE '%@gmail.com' OR email LIKE '%@school.local'
ORDER BY created_at DESC;

-- To confirm all users, you need to either:
-- 1. Disable email confirmation in Supabase Dashboard (recommended)
-- 2. Or manually confirm each user in Dashboard

-- RECOMMENDED APPROACH:
-- Go to Supabase Dashboard → Authentication → Settings → Email Auth
-- Toggle OFF "Enable email confirmations"
-- This will allow all future signups to login immediately without email verification

-- For existing users that need confirmation:
-- Go to Supabase Dashboard → Authentication → Users
-- Find each unconfirmed user and click "Send confirmation email" or manually confirm
