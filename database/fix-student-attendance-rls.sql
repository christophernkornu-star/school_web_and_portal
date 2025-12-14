-- Fix RLS policies for student_attendance table
-- Run this in Supabase SQL Editor

-- Enable RLS on student_attendance table
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON student_attendance;

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance"
ON student_attendance
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  )
);

-- Teachers can view attendance for students in their classes
CREATE POLICY "Teachers can view class attendance"
ON student_attendance
FOR SELECT
USING (
  student_id IN (
    SELECT s.id 
    FROM students s
    INNER JOIN teacher_class_assignments tca ON s.class_id = tca.class_id
    INNER JOIN teachers t ON tca.teacher_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can insert, update, delete attendance for students in their classes
CREATE POLICY "Teachers can manage class attendance"
ON student_attendance
FOR ALL
USING (
  student_id IN (
    SELECT s.id 
    FROM students s
    INNER JOIN teacher_class_assignments tca ON s.class_id = tca.class_id
    INNER JOIN teachers t ON tca.teacher_id = t.id
    WHERE t.profile_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT s.id 
    FROM students s
    INNER JOIN teacher_class_assignments tca ON s.class_id = tca.class_id
    INNER JOIN teachers t ON tca.teacher_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);

-- Admins can manage all attendance records
CREATE POLICY "Admins can manage all attendance"
ON student_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Verify the policies were created
SELECT 'student_attendance table RLS policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'student_attendance';
