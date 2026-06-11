-- ============================================================================
-- FINAL FIX: Enable RLS and set proper restricted policies for 6 tables
-- Biriwa Methodist 'C' Basic School Management System
-- ============================================================================
-- Run this entire script in Supabase SQL Editor at:
-- https://okfawhokrtkaibhbcjdk.supabase.co/project/okfawhokrtkaibhbcjdk/sql/new
-- ============================================================================

-- ============================================================================
-- HELPER FUNCTIONS (must exist before policies reference them)
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
-- ENABLE RLS ON ALL 6 TABLES (required for policies to take effect)
-- ============================================================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- DROP ALL EXISTING POLICIES for these tables to start clean
-- ============================================================================
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
DROP POLICY IF EXISTS "Authenticated users can view classes" ON classes;
DROP POLICY IF EXISTS "Auth users can view classes" ON classes;

DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can insert subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can update subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can delete subjects" ON subjects;
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON subjects;
DROP POLICY IF EXISTS "Auth users can view subjects" ON subjects;

DROP POLICY IF EXISTS "Teachers can manage class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can insert class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Staff can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Staff can insert class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Staff can update class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Admins can delete class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Anyone can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Authenticated users can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Auth users can view class_subjects" ON class_subjects;

DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Admins can view students" ON students;
DROP POLICY IF EXISTS "Students can update own record" ON students;
DROP POLICY IF EXISTS "Teachers can view their students" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Public read for students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;
DROP POLICY IF EXISTS "Admins can delete students" ON students;
DROP POLICY IF EXISTS "Anyone can view students" ON students;
DROP POLICY IF EXISTS "Authenticated users can view students" ON students;
DROP POLICY IF EXISTS "Auth users can view students" ON students;

DROP POLICY IF EXISTS "Enable read access for all users" ON mock_scores;
DROP POLICY IF EXISTS "Enable insert/update for authenticated users" ON mock_scores;
DROP POLICY IF EXISTS "Students can view own mock scores" ON mock_scores;
DROP POLICY IF EXISTS "Staff can view mock scores" ON mock_scores;
DROP POLICY IF EXISTS "Staff can insert mock scores" ON mock_scores;
DROP POLICY IF EXISTS "Staff can update mock scores" ON mock_scores;
DROP POLICY IF EXISTS "Admins can delete mock scores" ON mock_scores;

DROP POLICY IF EXISTS "Allow public read teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Allow authenticated full access teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Anyone can view teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Staff can insert teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Staff can update teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Admins can delete teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Authenticated users can view teacher_subject_assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Auth users can view teacher_subject_assignments" ON teacher_subject_assignments;

-- ============================================================================
-- CLASSES
-- ============================================================================
CREATE POLICY "view" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert" ON classes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "update" ON classes FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete" ON classes FOR DELETE USING (is_admin());

-- ============================================================================
-- SUBJECTS
-- ============================================================================
CREATE POLICY "view" ON subjects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert" ON subjects FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "update" ON subjects FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete" ON subjects FOR DELETE USING (is_admin());

-- ============================================================================
-- CLASS_SUBJECTS
-- ============================================================================
CREATE POLICY "view" ON class_subjects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert" ON class_subjects FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "update" ON class_subjects FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "delete" ON class_subjects FOR DELETE USING (is_admin());

-- ============================================================================
-- STUDENTS
-- ============================================================================
CREATE POLICY "view" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert" ON students FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "update" ON students FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "delete" ON students FOR DELETE USING (is_admin());

-- ============================================================================
-- MOCK_SCORES
-- ============================================================================
CREATE POLICY "student_view_own" ON mock_scores FOR SELECT
  USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));
CREATE POLICY "staff_view_all" ON mock_scores FOR SELECT
  USING (is_staff());
CREATE POLICY "staff_insert" ON mock_scores FOR INSERT
  WITH CHECK (is_staff());
CREATE POLICY "staff_update" ON mock_scores FOR UPDATE
  USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "admin_delete" ON mock_scores FOR DELETE
  USING (is_admin());

-- ============================================================================
-- TEACHER_SUBJECT_ASSIGNMENTS
-- ============================================================================
CREATE POLICY "view" ON teacher_subject_assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "insert" ON teacher_subject_assignments FOR INSERT WITH CHECK (is_staff());
CREATE POLICY "update" ON teacher_subject_assignments FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());
CREATE POLICY "delete" ON teacher_subject_assignments FOR DELETE USING (is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT tablename, policyname, cmd,
  CASE WHEN qual IS NULL THEN 'N/A' ELSE LEFT(qual::text, 60) END as using_clause
FROM pg_policies
WHERE tablename IN ('classes','subjects','class_subjects','students','mock_scores','teacher_subject_assignments')
ORDER BY tablename, cmd;
