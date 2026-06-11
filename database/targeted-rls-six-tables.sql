-- ============================================================================
-- TARGETED RLS POLICIES FOR: class_subjects, classes, mock_scores,
--   students, subjects, teacher_subject_assignments
-- Biriwa Methodist 'C' Basic School Management System
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (prevents infinite recursion via profiles table)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. CLASSES
-- ============================================================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own class" ON classes;
DROP POLICY IF EXISTS "Teachers can view assigned classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update assigned classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete assigned classes" ON classes;
DROP POLICY IF EXISTS "Teachers can insert classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Admins can insert classes" ON classes;
DROP POLICY IF EXISTS "Admins can update classes" ON classes;
DROP POLICY IF EXISTS "Admins can delete classes" ON classes;

-- Everyone can view classes (for dropdowns, filters, etc.)
CREATE POLICY "Anyone can view classes" ON classes
  FOR SELECT USING (true);

-- Only admins can insert/update/delete classes
CREATE POLICY "Admins can insert classes" ON classes
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update classes" ON classes
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete classes" ON classes
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 2. SUBJECTS
-- ============================================================================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can insert subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can update subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can delete subjects" ON subjects;

-- Everyone can view subjects (for dropdowns, filters, etc.)
CREATE POLICY "Anyone can view subjects" ON subjects
  FOR SELECT USING (true);

-- Only admins can insert/update/delete subjects
CREATE POLICY "Admins can insert subjects" ON subjects
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update subjects" ON subjects
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subjects" ON subjects
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 3. CLASS_SUBJECTS
-- ============================================================================
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can insert class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Staff can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Staff can insert class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Staff can update class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Admins can delete class_subjects" ON class_subjects;

-- Everyone can view class_subjects (for filtering, assessments lookups, etc.)
CREATE POLICY "Anyone can view class_subjects" ON class_subjects
  FOR SELECT USING (true);

-- Staff can insert class_subjects (teachers creating assessments need this)
CREATE POLICY "Staff can insert class_subjects" ON class_subjects
  FOR INSERT WITH CHECK (is_staff());

-- Staff can update class_subjects
CREATE POLICY "Staff can update class_subjects" ON class_subjects
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

-- Only admins can delete class_subjects
CREATE POLICY "Admins can delete class_subjects" ON class_subjects
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 4. STUDENTS
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Admins can view students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;
DROP POLICY IF EXISTS "Admins can delete students" ON students;
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Anyone can view students" ON students;

-- Everyone can view students (needed for teachers to see their class roster)
CREATE POLICY "Anyone can view students" ON students
  FOR SELECT USING (true);

-- Only admins can insert/update/delete students
CREATE POLICY "Admins can insert students" ON students
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update students" ON students
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete students" ON students
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 5. MOCK_SCORES
-- ============================================================================
ALTER TABLE mock_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON mock_scores;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users" ON mock_scores;

-- Students can view their own mock scores
CREATE POLICY "Students can view own mock scores" ON mock_scores
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Staff can view all mock scores
CREATE POLICY "Staff can view mock scores" ON mock_scores
  FOR SELECT USING (is_staff());

-- Staff can insert mock scores
CREATE POLICY "Staff can insert mock scores" ON mock_scores
  FOR INSERT WITH CHECK (is_staff());

-- Staff can update mock scores
CREATE POLICY "Staff can update mock scores" ON mock_scores
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

-- Admins can delete mock scores
CREATE POLICY "Admins can delete mock scores" ON mock_scores
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 6. TEACHER_SUBJECT_ASSIGNMENTS
-- ============================================================================
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Allow authenticated full access teacher_subject_assignments" ON teacher_subject_assignments;

-- Everyone can view teacher subject assignments (needed for lookups)
CREATE POLICY "Anyone can view teacher_subject_assignments" ON teacher_subject_assignments
  FOR SELECT USING (true);

-- Only staff can insert teacher subject assignments
CREATE POLICY "Staff can insert teacher_subject_assignments" ON teacher_subject_assignments
  FOR INSERT WITH CHECK (is_staff());

-- Only staff can update teacher subject assignments
CREATE POLICY "Staff can update teacher_subject_assignments" ON teacher_subject_assignments
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

-- Only admins can delete teacher subject assignments
CREATE POLICY "Admins can delete teacher_subject_assignments" ON teacher_subject_assignments
  FOR DELETE USING (is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Run this to verify:
-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   cmd,
--   roles
-- FROM pg_policies
-- WHERE tablename IN ('classes', 'subjects', 'class_subjects', 'students', 'mock_scores', 'teacher_subject_assignments')
-- ORDER BY tablename, cmd;
