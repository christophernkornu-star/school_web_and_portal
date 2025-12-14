-- Bulk update existing teacher accounts to use username-based placeholder emails
-- This script helps migrate existing teachers to the new authentication system

-- Step 1: View current teacher accounts
SELECT 
  p.id as profile_id,
  p.username,
  p.email as current_auth_email,
  p.role,
  t.teacher_id,
  t.first_name,
  t.last_name,
  t.phone,
  -- Show what the new email should be
  p.username || '@school.local' as new_auth_email
FROM profiles p
LEFT JOIN teachers t ON t.profile_id = p.id
WHERE p.role = 'teacher'
ORDER BY p.username;

-- Step 2: Export teacher data for manual auth email updates
-- Copy this output and use it to update emails in Supabase Dashboard
SELECT 
  p.username,
  p.email as old_email,
  p.username || '@school.local' as new_email,
  'Teacher123!' as default_password
FROM profiles p
WHERE p.role = 'teacher'
ORDER BY p.username;

-- IMPORTANT: The profiles.email column is synced from auth.users.email
-- You CANNOT directly update profiles.email - you must update it through Supabase Dashboard
-- 
-- To update each teacher:
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Find the user by their current email or username
-- 3. Click the three dots → "Update user"
-- 4. Update email to: {username}@school.local (from the query above)
-- 5. Reset password to: Teacher123! (or your preferred default)
-- 6. The profile will automatically sync

-- Step 3: After updating auth emails, verify the changes
-- Run this to confirm all teachers now have placeholder emails
SELECT 
  p.username,
  p.email as auth_email,
  CASE 
    WHEN p.email = p.username || '@school.local' THEN '✅ Updated'
    ELSE '❌ Needs Update'
  END as status
FROM profiles p
WHERE p.role = 'teacher'
ORDER BY p.username;

-- Step 4: Optional - Store actual contact emails in teachers table
-- First run add-teacher-email-column.sql to add the email column
-- Then update with real contact emails if you have them:
-- UPDATE teachers 
-- SET email = 'actual.email@example.com'
-- WHERE teacher_id = 'TCH0001';

-- After adding email column, you can view it with:
-- SELECT teacher_id, first_name, last_name, email, phone FROM teachers;
