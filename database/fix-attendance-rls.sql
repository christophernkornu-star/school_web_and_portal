-- Fix RLS policies for attendance table
-- Run this in Supabase SQL Editor

-- Enable RLS on attendance table
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Teachers can view class attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage class attendance" ON attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON attendance;

-- Teachers can view attendance for students in their assigned classes
CREATE POLICY "Teachers can view class attendance"
ON attendance
FOR SELECT
USING (
  student_id IN (
    SELECT s.id 
    FROM students s
    JOIN teacher_class_assignments tca ON tca.class_id = s.class_id
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can insert attendance for students in their assigned classes
CREATE POLICY "Teachers can insert class attendance"
ON attendance
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT s.id 
    FROM students s
    JOIN teacher_class_assignments tca ON tca.class_id = s.class_id
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can update attendance for students in their assigned classes
CREATE POLICY "Teachers can update class attendance"
ON attendance
FOR UPDATE
USING (
  student_id IN (
    SELECT s.id 
    FROM students s
    JOIN teacher_class_assignments tca ON tca.class_id = s.class_id
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
)
WITH CHECK (
  student_id IN (
    SELECT s.id 
    FROM students s
    JOIN teacher_class_assignments tca ON tca.class_id = s.class_id
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can delete attendance for students in their assigned classes
CREATE POLICY "Teachers can delete class attendance"
ON attendance
FOR DELETE
USING (
  student_id IN (
    SELECT s.id 
    FROM students s
    JOIN teacher_class_assignments tca ON tca.class_id = s.class_id
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance"
ON attendance
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
SELECT 'attendance table RLS policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'attendance';
