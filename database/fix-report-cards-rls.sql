-- Fix RLS policies for report cards
-- Run this in Supabase SQL Editor

-- Enable RLS on report_cards table
ALTER TABLE report_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Students can view own report cards" ON report_cards;
DROP POLICY IF EXISTS "Teachers can view class report cards" ON report_cards;
DROP POLICY IF EXISTS "Teachers can manage class report cards" ON report_cards;
DROP POLICY IF EXISTS "Admins can manage all report cards" ON report_cards;

-- Students can view their own report cards
CREATE POLICY "Students can view own report cards"
ON report_cards
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  )
);

-- Teachers can view report cards for students in their assigned classes
CREATE POLICY "Teachers can view class report cards"
ON report_cards
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

-- Teachers can insert report cards for students in their assigned classes
CREATE POLICY "Teachers can insert class report cards"
ON report_cards
FOR INSERT
WITH CHECK (
  student_id IN (
    SELECT s.id 
    FROM students s
    INNER JOIN teacher_class_assignments tca ON s.class_id = tca.class_id
    INNER JOIN teachers t ON tca.teacher_id = t.id
    WHERE t.profile_id = auth.uid()
  )
);

-- Teachers can update report cards for students in their assigned classes
CREATE POLICY "Teachers can update class report cards"
ON report_cards
FOR UPDATE
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

-- Admins can manage all report cards
CREATE POLICY "Admins can manage all report cards"
ON report_cards
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
SELECT 'report_cards table RLS policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'report_cards';
