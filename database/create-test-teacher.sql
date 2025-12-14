-- Create a test teacher manually to verify the system works
-- This creates ONE teacher that you can use to test login

-- First, let's create the auth user (you'll need to do this via Supabase Dashboard)
-- Go to: Authentication → Users → Add User
-- Email: teacher.test@school.local
-- Password: Teacher123!
-- Auto Confirm: YES (toggle this on)

-- After creating the user in Dashboard, get their ID and run this:
-- Replace 'USER_ID_HERE' with the actual UUID from the auth user you just created

-- Insert into profiles (this might auto-create via trigger, but just in case)
INSERT INTO profiles (id, username, email, role, full_name)
SELECT 
  id,
  'teacher.test' as username,
  email,
  'teacher' as role,
  'Test Teacher' as full_name
FROM auth.users
WHERE email = 'teacher.test@school.local'
ON CONFLICT (id) DO UPDATE
SET username = 'teacher.test',
    role = 'teacher',
    full_name = 'Test Teacher';

-- Insert into teachers table
INSERT INTO teachers (profile_id, first_name, last_name, phone, hire_date, status)
SELECT 
  id as profile_id,
  'Test' as first_name,
  'Teacher' as last_name,
  '0200000000' as phone,
  CURRENT_DATE as hire_date,
  'active' as status
FROM auth.users
WHERE email = 'teacher.test@school.local';

-- Verify the teacher was created
SELECT 
  t.teacher_id,
  t.first_name,
  t.last_name,
  p.username,
  p.email,
  p.role
FROM teachers t
JOIN profiles p ON p.id = t.profile_id
WHERE p.username = 'teacher.test';

-- Test login credentials:
-- Username: teacher.test
-- Password: Teacher123!
