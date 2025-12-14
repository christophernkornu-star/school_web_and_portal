-- Check what teachers exist and their status
-- This will help us understand why they're not showing up

-- 1. Check how many teachers exist
SELECT COUNT(*) as total_teachers FROM teachers;

-- 2. Check teacher records with their profile info
SELECT 
  t.teacher_id,
  t.first_name,
  t.last_name,
  t.phone,
  t.status,
  t.hire_date,
  p.username,
  p.email,
  p.role,
  p.created_at
FROM teachers t
LEFT JOIN profiles p ON p.id = t.profile_id
ORDER BY t.created_at DESC;

-- 3. Check if there are profiles without teacher records
SELECT 
  p.id,
  p.username,
  p.email,
  p.role
FROM profiles p
WHERE p.role = 'teacher'
AND NOT EXISTS (SELECT 1 FROM teachers t WHERE t.profile_id = p.id);

-- 4. Check auth users status
SELECT 
  email,
  email_confirmed_at,
  created_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN '❌ Not Confirmed'
    ELSE '✅ Confirmed'
  END as email_status
FROM auth.users
WHERE email LIKE '%teacher%'
ORDER BY created_at DESC;
