-- Complete fix for teacher authentication and display
-- Run this to fix all teacher-related issues at once

-- Step 1: Confirm all teacher emails in auth (bypass email verification)
-- Note: This updates the auth.users table
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL
AND (email LIKE '%teacher%' OR email LIKE '%@school.local');

-- Step 2: Verify all teachers are confirmed
SELECT 
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_count,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_count,
  COUNT(*) as total_teachers
FROM auth.users
WHERE email LIKE '%teacher%' OR email LIKE '%@school.local';

-- Step 3: Check teachers table and profiles sync
SELECT 
  t.teacher_id,
  t.first_name,
  t.last_name,
  t.status,
  p.username,
  p.email,
  p.role,
  CASE 
    WHEN p.id IS NULL THEN '❌ No profile'
    WHEN p.role != 'teacher' THEN '⚠️ Wrong role'
    ELSE '✅ OK'
  END as profile_status
FROM teachers t
LEFT JOIN profiles p ON p.id = t.profile_id
ORDER BY t.created_at DESC;

-- Step 4: Show any orphaned profiles (profiles without teacher records)
SELECT 
  'Orphaned Profile' as issue,
  p.username,
  p.email,
  'Missing teacher record' as problem
FROM profiles p
WHERE p.role = 'teacher'
AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = p.id);

-- Step 5: Show summary
SELECT 
  'Summary' as report,
  (SELECT COUNT(*) FROM teachers) as total_teacher_records,
  (SELECT COUNT(*) FROM profiles WHERE role = 'teacher') as total_teacher_profiles,
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%teacher%' OR email LIKE '%@school.local') as total_teacher_auth_users;
