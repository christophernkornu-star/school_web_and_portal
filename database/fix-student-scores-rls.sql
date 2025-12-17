-- Enable RLS on student_scores
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Teachers can manage student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can insert student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can update student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can delete student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can select student_scores" ON student_scores;

-- Create a comprehensive policy for teachers
CREATE POLICY "Teachers can manage student_scores" ON student_scores
  FOR ALL
  USING (
    -- Check if the user is a teacher
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Check if the user is a teacher
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  );

-- Allow students to view their own scores
CREATE POLICY "Students can view own scores" ON student_scores
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students 
      WHERE profile_id = auth.uid()
    )
  );
