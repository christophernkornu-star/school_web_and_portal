-- Update existing teacher auth emails to use username-based placeholder format
-- This fixes authentication issues where email was used instead of username

-- First, let's see the current state
SELECT 
  p.id,
  p.username,
  p.email as auth_email,
  t.first_name,
  t.last_name,
  t.email as contact_email
FROM profiles p
LEFT JOIN teachers t ON t.profile_id = p.id
WHERE p.role = 'teacher'
ORDER BY p.username;

-- Note: To update auth emails in Supabase, you need to use the Supabase Dashboard
-- Go to: Authentication → Users → Select user → Update email
-- 
-- Or use the Supabase Management API/Dashboard to update auth.users table
-- 
-- For each teacher, the auth email should be: {username}@school.local
-- Example: teacher.precious → teacher.precious@school.local
--
-- The profiles.email will automatically sync with auth.users.email
-- The teachers.email can store their actual contact email (optional)
