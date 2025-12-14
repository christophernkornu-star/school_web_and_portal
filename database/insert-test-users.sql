-- COMPLETE USER SETUP WITH PROFILES AND RECORDS
-- Run this in Supabase SQL Editor after creating auth users

-- 1. ADMIN PROFILE
INSERT INTO profiles (id, email, username, full_name, role)
VALUES ('53e02371-6b79-4cda-9d93-792c1f998eb3', 'admin@biriwa.edu.gh', 'admin.francis', 'Mr. Francis Owusu', 'admin')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

-- 2. TEACHER PROFILE AND RECORD
INSERT INTO profiles (id, email, username, full_name, role)
VALUES ('d77abc0e-c525-46ef-9ba1-23b9f9289bae', 'samuel.adjei@teacher.biriwa.edu.gh', 'teacher.samuel', 'Mr. Samuel Adjei', 'teacher')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, phone, specialization, qualification, hire_date)
VALUES ('d77abc0e-c525-46ef-9ba1-23b9f9289bae', 'TCH2024001', 'Samuel', 'Adjei', '+233201234567', 'Mathematics & Science', 'Bachelor of Education (B.Ed) - Mathematics', '2020-09-01')
ON CONFLICT (profile_id) DO UPDATE SET
  teacher_id = EXCLUDED.teacher_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  specialization = EXCLUDED.specialization,
  qualification = EXCLUDED.qualification,
  hire_date = EXCLUDED.hire_date;

-- 3. STUDENT PROFILE AND RECORD
INSERT INTO profiles (id, email, username, full_name, role)
VALUES ('9d1f97be-76c7-405c-a382-765fb3e25df3', 'kofi.mensah@student.biriwa.edu.gh', 'kofi.mensah', 'Kofi Mensah', 'student')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;

INSERT INTO students (profile_id, student_id, first_name, last_name, date_of_birth, gender, class_id, guardian_name, guardian_phone, guardian_email, admission_date)
SELECT '9d1f97be-76c7-405c-a382-765fb3e25df3', 'STU2024001', 'Kofi', 'Mensah', '2014-03-15', 'Male', id, 'Mr. Emmanuel Mensah', '+233244567890', 'emmanuel.mensah@email.com', '2020-09-01'
FROM classes WHERE name = 'Primary 4'
ON CONFLICT (profile_id) DO UPDATE SET
  student_id = EXCLUDED.student_id,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  date_of_birth = EXCLUDED.date_of_birth,
  gender = EXCLUDED.gender,
  guardian_name = EXCLUDED.guardian_name,
  guardian_phone = EXCLUDED.guardian_phone,
  guardian_email = EXCLUDED.guardian_email,
  admission_date = EXCLUDED.admission_date;

-- Verify the users were created
SELECT 
  p.username,
  p.email,
  p.full_name,
  p.role,
  CASE 
    WHEN t.id IS NOT NULL THEN 'Teacher Record ✓'
    WHEN s.id IS NOT NULL THEN 'Student Record ✓'
    ELSE 'Admin Only ✓'
  END as record_status
FROM profiles p
LEFT JOIN teachers t ON t.profile_id = p.id
LEFT JOIN students s ON s.profile_id = p.id
WHERE p.email IN (
  'admin@biriwa.edu.gh',
  'samuel.adjei@teacher.biriwa.edu.gh',
  'kofi.mensah@student.biriwa.edu.gh'
);
