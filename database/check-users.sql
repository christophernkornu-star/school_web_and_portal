-- CHECK WHAT'S IN YOUR DATABASE
-- Run this in Supabase SQL Editor to see what users you have

-- 1. Check all profiles
SELECT id, email, username, full_name, role 
FROM profiles 
ORDER BY created_at DESC;

-- 2. Check all auth users
SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- 3. Check specifically for admin accounts
SELECT * FROM profiles WHERE role = 'admin';

-- If you see your user but with wrong username, you can fix it:
-- UPDATE profiles SET username = 'admin.fortune' WHERE email = 'admin@biriwa.edu.gh';
