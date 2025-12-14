-- Fix RLS Policies for student_attendance table
-- Run this in Supabase SQL Editor
-- These policies were using user_id but should use profile_id

-- Drop and recreate policies with correct column names

-- 1. Students can view their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;
CREATE POLICY "Students can view own attendance" 
ON student_attendance
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  )
);

-- 2. Teachers can view attendance for their classes
DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance;
CREATE POLICY "Teachers can view class attendance" 
ON student_attendance
FOR SELECT
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
  )
);

-- 3. Teachers can insert/update attendance for their classes
DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance;
CREATE POLICY "Teachers can manage class attendance" 
ON student_attendance
FOR ALL
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments 
    WHERE teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
    AND is_class_teacher = true
  )
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'student_attendance'
ORDER BY policyname;
