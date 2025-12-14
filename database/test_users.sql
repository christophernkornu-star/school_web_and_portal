-- Sample Test Users with Usernames
-- These are example users you can create for testing the system

-- Instructions:
-- 1. Go to your Supabase Dashboard: https://okfawhokrtkaibhbcjdk.supabase.co
-- 2. Navigate to Authentication > Users
-- 3. Click "Add User" for each test account below
-- 4. After creating the auth user, run the corresponding SQL to create the profile

-- =====================================================================
-- TEST STUDENT ACCOUNTS
-- =====================================================================

-- Student 1: Kofi Mensah (Primary 4)
-- Email: kofi.mensah@student.biriwa.edu.gh
-- Password: Student123!
-- Username: kofi.mensah
-- After creating auth user, run:
/*
INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  'USER_ID_FROM_AUTH', 
  'kofi.mensah@student.biriwa.edu.gh',
  'kofi.mensah',
  'Kofi Mensah',
  'student'
);

INSERT INTO students (id, profile_id, student_id, first_name, last_name, date_of_birth, gender, class_id, guardian_name, guardian_phone, guardian_email)
SELECT 
  gen_random_uuid(),
  'USER_ID_FROM_AUTH',
  'STU2024001',
  'Kofi',
  'Mensah',
  '2014-03-15',
  'Male',
  id,
  'Mr. Emmanuel Mensah',
  '+233244567890',
  'emmanuel.mensah@email.com'
FROM classes WHERE name = 'Primary 4';
*/

-- Student 2: Ama Asante (JHS 2)
-- Email: ama.asante@student.biriwa.edu.gh
-- Password: Student123!
-- Username: ama.asante

-- Student 3: Kwame Boateng (KG 1)
-- Email: kwame.boateng@student.biriwa.edu.gh
-- Password: Student123!
-- Username: kwame.boateng

-- Student 4: Abena Owusu (Primary 6)
-- Email: abena.owusu@student.biriwa.edu.gh
-- Password: Student123!
-- Username: abena.owusu

-- =====================================================================
-- TEST TEACHER ACCOUNTS
-- =====================================================================

-- Teacher 1: Mr. Samuel Adjei (Mathematics & Science Teacher)
-- Email: samuel.adjei@teacher.biriwa.edu.gh
-- Password: Teacher123!
-- Username: teacher.samuel
-- After creating auth user, run:
/*
INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  'USER_ID_FROM_AUTH',
  'samuel.adjei@teacher.biriwa.edu.gh',
  'teacher.samuel',
  'Mr. Samuel Adjei',
  'teacher'
);

INSERT INTO teachers (id, profile_id, teacher_id, first_name, last_name, phone, specialization, qualification)
VALUES (
  gen_random_uuid(),
  'USER_ID_FROM_AUTH',
  'TCH2024001',
  'Samuel',
  'Adjei',
  '+233201234567',
  'Mathematics & Science',
  'Bachelor of Education (B.Ed) - Mathematics'
);
*/

-- Teacher 2: Mrs. Grace Mensah (English Teacher)
-- Email: grace.mensah@teacher.biriwa.edu.gh
-- Password: Teacher123!
-- Username: teacher.grace

-- Teacher 3: Mr. Joseph Ofori (Physical Education)
-- Email: joseph.ofori@teacher.biriwa.edu.gh
-- Password: Teacher123!
-- Username: teacher.joseph

-- =====================================================================
-- TEST ADMIN ACCOUNT
-- =====================================================================

-- Admin: Mr. Francis Owusu (Headmaster)
-- Email: admin@biriwa.edu.gh
-- Password: Admin123!
-- Username: admin.francis
-- After creating auth user, run:
/*
INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  'USER_ID_FROM_AUTH',
  'admin@biriwa.edu.gh',
  'admin.francis',
  'Mr. Francis Owusu',
  'admin'
);
*/

-- =====================================================================
-- QUICK REFERENCE - Username Format
-- =====================================================================
-- Students: firstname.lastname (e.g., kofi.mensah, ama.asante)
-- Teachers: teacher.firstname (e.g., teacher.samuel, teacher.grace)
-- Admins: admin.firstname (e.g., admin.francis)
-- 
-- If duplicate names exist, add numbers: kofi.mensah1, kofi.mensah2, etc.

-- =====================================================================
-- ALTERNATIVE: Bulk Create via SQL (requires Supabase CLI or API)
-- =====================================================================
-- Note: Creating auth users requires the Supabase service role key
-- You cannot create auth users directly with SQL in the database
-- 
-- Option 1: Use Supabase Dashboard (Recommended for testing)
-- Option 2: Use Supabase CLI: npx supabase gen types typescript
-- Option 3: Use Supabase API with service role key

-- =====================================================================
-- TESTING THE LOGIN
-- =====================================================================
-- After creating the test accounts above:
-- 1. Go to http://localhost:3000/login
-- 2. Enter username (e.g., kofi.mensah) and password
-- 3. System will automatically detect role and redirect to appropriate dashboard
-- 4. Student → /student/dashboard
-- 5. Teacher → /teacher/dashboard
-- 6. Admin → /admin/dashboard
