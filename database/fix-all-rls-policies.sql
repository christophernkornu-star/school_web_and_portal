-- Complete RLS Fix - All Tables
-- Run this ONCE to fix all profile, teacher, student creation, AND RANKING FEATURES

-- ==========================================
-- CRITICAL FIX FOR STUDENT RANKINGS
-- ==========================================

-- Drop ALL existing student-related policies on scores table
DROP POLICY IF EXISTS "Students can view own scores" ON scores;
DROP POLICY IF EXISTS "Students can view class scores" ON scores;
DROP POLICY IF EXISTS "Students can view their own scores" ON scores;
DROP POLICY IF EXISTS "Students can view scores in their class" ON scores;
DROP POLICY IF EXISTS "Students can view class scores for ranking" ON scores;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON scores;
DROP POLICY IF EXISTS "Students can view all class scores" ON scores;

-- Create ONE comprehensive policy that allows students to see ALL classmates' scores
CREATE POLICY "Students can view all class scores"
ON scores
FOR SELECT
TO authenticated
USING (
  -- Allow if the score belongs to any student in the same class as the current user
  student_id IN (
    SELECT s2.id
    FROM students s1
    INNER JOIN students s2 ON s1.class_id = s2.class_id
    WHERE s1.profile_id = auth.uid()
  )
);

-- ==========================================
-- END CRITICAL FIX
-- ==========================================

-- ============================================
-- ENSURE SEQUENCES EXIST AND WORK
-- ============================================

-- Create sequences if they don't exist
CREATE SEQUENCE IF NOT EXISTS teacher_id_seq START 1000;
CREATE SEQUENCE IF NOT EXISTS student_id_seq START 2000;

-- Ensure teacher_id has proper default
ALTER TABLE teachers 
  ALTER COLUMN teacher_id SET DEFAULT 'TCH' || LPAD(nextval('teacher_id_seq')::TEXT, 4, '0');

-- Ensure student_id has proper default
ALTER TABLE students 
  ALTER COLUMN student_id SET DEFAULT 'STU' || LPAD(nextval('student_id_seq')::TEXT, 4, '0');

-- ============================================
-- PROFILES TABLE - Allow creation and updates
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Allow users to insert their own profile
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow admins to insert any profile
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update any profile
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- TEACHERS TABLE - Allow admin creation
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can view teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can insert teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can update teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can delete teachers" ON teachers;

-- Allow admins to view all teachers
CREATE POLICY "Admins can view teachers" ON teachers
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to insert teachers
CREATE POLICY "Admins can insert teachers" ON teachers
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to update teachers
CREATE POLICY "Admins can update teachers" ON teachers
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to delete teachers
CREATE POLICY "Admins can delete teachers" ON teachers
  FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- STUDENTS TABLE - Allow admin creation
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Admins can view students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;
DROP POLICY IF EXISTS "Admins can delete students" ON students;

-- Allow admins to view all students
CREATE POLICY "Admins can view students" ON students
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to insert students
CREATE POLICY "Admins can insert students" ON students
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to update students
CREATE POLICY "Admins can update students" ON students
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow admins to delete students
CREATE POLICY "Admins can delete students" ON students
  FOR DELETE 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- ANNOUNCEMENTS TABLE - Allow public viewing
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;

-- Everyone can view published announcements (for public website)
CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT 
  USING (published = true);

-- Admins can manage all announcements
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify all policies are created:

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE tablename IN ('profiles', 'teachers', 'students', 'announcements')
ORDER BY tablename, cmd;
