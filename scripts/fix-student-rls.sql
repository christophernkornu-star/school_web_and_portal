-- ============================================
-- FIX STUDENT RLS POLICIES
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Drop all existing policies on students table
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Students can update own record" ON students;
DROP POLICY IF EXISTS "Teachers can view their students" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Public read for students" ON students;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON students;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON students;

-- Step 2: Create comprehensive RLS policies

-- Allow students to view their own record
CREATE POLICY "Students can view own record" ON students
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- Allow students to update their own record (limited fields)
CREATE POLICY "Students can update own record" ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id);

-- Allow teachers to view students in their assigned classes
CREATE POLICY "Teachers can view their students" ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teachers t
      INNER JOIN teacher_class_assignments tca ON tca.teacher_id = t.id
      WHERE t.profile_id = auth.uid()
      AND tca.class_id = students.class_id
    )
  );

-- Allow admins full access to all students
CREATE POLICY "Admins can manage all students" ON students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Step 3: Verify RLS is enabled
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Step 4: Test the policies (optional - run one at a time)
-- Replace the UUID with your test student's profile_id

-- Test as student (should return their own record)
-- SELECT * FROM students WHERE profile_id = '5fee84d2-663a-419d-9f8d-b7e17c044c65';

-- Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'students';
