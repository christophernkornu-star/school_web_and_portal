-- Allow teachers to delete student attempts (Rest/Retake functionality)
-- Only for quizzes created by the teacher

CREATE POLICY "Teachers can delete attempts on their quizzes" 
ON student_quiz_attempts 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM online_quizzes
    WHERE online_quizzes.id = student_quiz_attempts.quiz_id
    AND online_quizzes.teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
  )
);
