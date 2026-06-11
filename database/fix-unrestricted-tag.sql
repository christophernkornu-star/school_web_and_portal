-- ============================================================================
-- FIX: Replace overly permissive SELECT policies (USING true) with
--      proper authenticated-restricted policies for 6 targeted tables.
-- ============================================================================
-- The issue: USING (true) allows ANYONE (even unauthenticated) to read data.
-- Supabase shows these tables as "unrestricted" despite RLS being enabled.
-- 
-- This script replaces USING (true) with proper role-based policies.
-- ============================================================================

-- Drop the overly permissive "Anyone can view" policies
DROP POLICY IF EXISTS "Anyone can view classes" ON classes;

DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;

DROP POLICY IF EXISTS "Anyone can view class_subjects" ON class_subjects;

DROP POLICY IF EXISTS "Anyone can view students" ON students;

DROP POLICY IF EXISTS "Anyone can view teacher_subject_assignments" ON teacher_subject_assignments;

-- ============================================================================
-- 1. CLASSES - Only authenticated users can view
-- ============================================================================
CREATE POLICY "Authenticated users can view classes" ON classes
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 2. SUBJECTS - Only authenticated users can view
-- ============================================================================
CREATE POLICY "Authenticated users can view subjects" ON subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 3. CLASS_SUBJECTS - Only authenticated users can view
-- ============================================================================
CREATE POLICY "Authenticated users can view class_subjects" ON class_subjects
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 4. STUDENTS - Authenticated users OR anon can view (needed for portal login)
--               Actually students need to be visible for lookup purposes.
--               Let's restrict to authenticated only.
-- ============================================================================
CREATE POLICY "Authenticated users can view students" ON students
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- 5. MOCK_SCORES - Already has proper restricted policies, no change needed.
--    Students see own scores, Staff see all scores.
-- ============================================================================

-- ============================================================================
-- 6. TEACHER_SUBJECT_ASSIGNMENTS - Only authenticated users can view
-- ============================================================================
CREATE POLICY "Authenticated users can view teacher_subject_assignments" ON teacher_subject_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  tablename,
  COUNT(*) as policy_count,
  string_agg(cmd || ': ' || policyname, E'\n') as policies
FROM pg_policies
WHERE tablename IN ('classes', 'subjects', 'class_subjects', 'students', 'mock_scores', 'teacher_subject_assignments')
GROUP BY tablename
ORDER BY tablename;
