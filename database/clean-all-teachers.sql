-- CLEAN SLATE: Remove all teachers and start fresh
-- WARNING: This will delete ALL teacher data!

-- Step 1: Delete all teacher records
DELETE FROM teachers WHERE true;

-- Step 2: Delete all teacher profiles  
DELETE FROM profiles WHERE role = 'teacher';

-- Step 3: Check auth.users (these need to be deleted from Supabase Dashboard)
-- Go to: Authentication → Users
-- Delete all users with emails containing 'teacher' or '@school.local'
SELECT 
  id,
  email,
  created_at,
  'Delete this user from Dashboard' as action
FROM auth.users
WHERE email LIKE '%teacher%' OR email LIKE '%@school.local';

-- Step 4: Verify everything is clean
SELECT 
  'Teachers' as table_name,
  COUNT(*) as count
FROM teachers
UNION ALL
SELECT 
  'Teacher Profiles' as table_name,
  COUNT(*) as count
FROM profiles WHERE role = 'teacher'
UNION ALL
SELECT 
  'Teacher Auth Users' as table_name,
  COUNT(*) as count
FROM auth.users WHERE email LIKE '%teacher%' OR email LIKE '%@school.local';

-- After running this and deleting users from Dashboard,
-- all counts should be 0 and you can upload teachers fresh
