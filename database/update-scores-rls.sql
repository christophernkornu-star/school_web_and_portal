-- Update RLS policies for scores table to allow students to see classmates' scores
-- IMPORTANT: Run this in Supabase SQL Editor

-- First, DROP ALL existing student policies on scores
DROP POLICY IF EXISTS "Students can view own scores" ON scores;
DROP POLICY IF EXISTS "Students can view class scores" ON scores;
DROP POLICY IF EXISTS "Students can view their own scores" ON scores;
DROP POLICY IF EXISTS "Students can view scores in their class" ON scores;

-- Create a SINGLE policy that allows students to view ALL scores in their class
CREATE POLICY "Students can view class scores for ranking"
ON scores
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM students s1
    INNER JOIN students s2 ON s1.class_id = s2.class_id
    WHERE s1.profile_id = auth.uid()
      AND s2.id = scores.student_id
  )
);

-- Verify the policy was created
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    substring(qual, 1, 100) as qual_preview
FROM pg_policies 
WHERE tablename = 'scores'
  AND policyname LIKE '%Student%'
ORDER BY policyname;
