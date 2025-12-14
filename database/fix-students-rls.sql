-- Fix RLS policies for students table
-- Run this in Supabase SQL Editor

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Teachers can view class students" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;

-- Students can view their own record
CREATE POLICY "Students can view own record"
ON students
FOR SELECT
USING (profile_id = auth.uid());

-- Teachers can view students in their assigned classes
CREATE POLICY "Teachers can view class students"
ON students
FOR SELECT
USING (
  class_id IN (
    SELECT tca.class_id 
    FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can update students in their assigned classes
CREATE POLICY "Teachers can update class students"
ON students
FOR UPDATE
USING (
  class_id IN (
    SELECT tca.class_id 
    FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
)
WITH CHECK (
  class_id IN (
    SELECT tca.class_id 
    FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can delete students in their assigned classes
CREATE POLICY "Teachers can delete class students"
ON students
FOR DELETE
USING (
  class_id IN (
    SELECT tca.class_id 
    FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can insert students into their assigned classes
CREATE POLICY "Teachers can insert students to assigned classes"
ON students
FOR INSERT
WITH CHECK (
  class_id IN (
    SELECT tca.class_id 
    FROM teacher_class_assignments tca
    JOIN teachers t ON t.id = tca.teacher_id
    WHERE t.profile_id = auth.uid()
  )
);

-- Admins can manage all students
CREATE POLICY "Admins can manage all students"
ON students
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
SELECT 'students table RLS policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'students';
