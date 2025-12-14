-- Fix RLS policies to allow login username lookup
-- Run this in Supabase SQL Editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow anyone to read profiles by username (needed for login)
CREATE POLICY "Allow username lookup for login" ON profiles
  FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- STUDENTS TABLE POLICIES
-- ============================================

-- Drop existing student policy
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;

-- Students can view their own record
CREATE POLICY "Students can view own record" ON students
  FOR SELECT USING (profile_id = auth.uid());

-- Teachers can view students in their assigned classes
CREATE POLICY "Teachers can view students in their classes" ON students
  FOR SELECT USING (
    class_id IN (
      SELECT tca.class_id 
      FROM teacher_class_assignments tca
      JOIN teachers t ON t.teacher_id = tca.teacher_id
      WHERE t.profile_id = auth.uid()
    )
  );

-- Admins can do everything with students
CREATE POLICY "Admins can manage students" ON students
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
