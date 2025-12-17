-- Fix RLS policies using profiles table to avoid recursion/permission issues
-- Run this in Supabase SQL Editor

-- 1. STUDENT_SCORES
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can insert student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can update student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can delete student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can select student_scores" ON student_scores;
DROP POLICY IF EXISTS "Students can view own scores" ON student_scores;

CREATE POLICY "Teachers can manage student_scores" ON student_scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  );

CREATE POLICY "Students can view own scores" ON student_scores
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students 
      WHERE profile_id = auth.uid()
    )
  );

-- 2. ASSESSMENTS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage assessments" ON assessments;

CREATE POLICY "Teachers can manage assessments" ON assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  );

-- 3. CLASS_SUBJECTS
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can insert class_subjects" ON class_subjects;

CREATE POLICY "Teachers can manage class_subjects" ON class_subjects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  );

-- 4. SCORES
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage scores" ON scores;
DROP POLICY IF EXISTS "Teachers can manage class scores" ON scores;

CREATE POLICY "Teachers can manage scores" ON scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'
    )
  );
