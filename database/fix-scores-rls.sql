-- Fix RLS policies for scores table
-- Run this in Supabase SQL Editor

-- Enable RLS on scores table
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can view own scores" ON scores;
DROP POLICY IF EXISTS "Teachers can view class scores" ON scores;
DROP POLICY IF EXISTS "Teachers can manage class scores" ON scores;
DROP POLICY IF EXISTS "Admins can manage all scores" ON scores;

-- Students can view their own scores
CREATE POLICY "Students can view own scores"
ON scores
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  )
);

-- Teachers can view scores for students in their classes
CREATE POLICY "Teachers can view class scores"
ON scores
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

-- Teachers can insert, update, delete scores for students in their classes
CREATE POLICY "Teachers can manage class scores"
ON scores
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

-- Admins can manage all scores
CREATE POLICY "Admins can manage all scores"
ON scores
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
SELECT 'scores table RLS policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'scores';
