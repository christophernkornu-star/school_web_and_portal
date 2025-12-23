-- Allow Teachers and Students to view security settings
-- This is needed so they can check permissions like 'allow_teacher_delete_scores' and 'allow_student_profile_edit'

-- Policy for Teachers
CREATE POLICY "Teachers can view security settings" ON security_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Policy for Students
CREATE POLICY "Students can view security settings" ON security_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );
