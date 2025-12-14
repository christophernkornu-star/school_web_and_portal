-- Create table for recording individual class exercises/assignments
-- This allows teachers to record multiple exercises throughout the term
-- The sum of all exercises will be used as the class score

CREATE TABLE IF NOT EXISTS class_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  
  -- Exercise details
  exercise_name VARCHAR(255) NOT NULL, -- e.g., "Quiz 1", "Assignment 2", "Class Test"
  exercise_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Scoring
  score_obtained DECIMAL(5,2) NOT NULL CHECK (score_obtained >= 0),
  max_score DECIMAL(5,2) NOT NULL CHECK (max_score > 0),
  
  -- Metadata
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_score CHECK (score_obtained <= max_score),
  CONSTRAINT unique_exercise UNIQUE (student_id, subject_id, term_id, exercise_name, exercise_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_class_exercises_student ON class_exercises(student_id);
CREATE INDEX IF NOT EXISTS idx_class_exercises_subject ON class_exercises(subject_id);
CREATE INDEX IF NOT EXISTS idx_class_exercises_term ON class_exercises(term_id);
CREATE INDEX IF NOT EXISTS idx_class_exercises_teacher ON class_exercises(teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_exercises_date ON class_exercises(exercise_date);

-- Add RLS policies
ALTER TABLE class_exercises ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can only see exercises they created
CREATE POLICY teachers_own_exercises ON class_exercises
  FOR ALL
  USING (
    teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
  );

-- Policy: Students can see their own exercises
CREATE POLICY students_own_exercises ON class_exercises
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

-- Policy: Admins can see all exercises
CREATE POLICY admins_all_exercises ON class_exercises
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Create function to calculate total class score for a student
-- This sums all exercises and converts to percentage
CREATE OR REPLACE FUNCTION calculate_class_score_total(
  p_student_id UUID,
  p_subject_id UUID,
  p_term_id UUID
)
RETURNS TABLE (
  total_obtained DECIMAL,
  total_max DECIMAL,
  percentage DECIMAL,
  converted_score DECIMAL -- Converted to max 40
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(score_obtained), 0) as total_obtained,
    COALESCE(SUM(max_score), 0) as total_max,
    CASE 
      WHEN COALESCE(SUM(max_score), 0) > 0 
      THEN (COALESCE(SUM(score_obtained), 0) / COALESCE(SUM(max_score), 1)) * 100
      ELSE 0
    END as percentage,
    CASE 
      WHEN COALESCE(SUM(max_score), 0) > 0 
      THEN ((COALESCE(SUM(score_obtained), 0) / COALESCE(SUM(max_score), 1)) * 100) * 0.4
      ELSE 0
    END as converted_score
  FROM class_exercises
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_class_exercises_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_class_exercises_updated_at
  BEFORE UPDATE ON class_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_class_exercises_updated_at();

COMMENT ON TABLE class_exercises IS 'Stores individual class exercises/assignments throughout the term. The sum of all exercises for a student-subject-term combination is used as the class score.';
COMMENT ON COLUMN class_exercises.exercise_name IS 'Name or description of the exercise (e.g., Quiz 1, Assignment 2)';
COMMENT ON COLUMN class_exercises.score_obtained IS 'Score the student obtained for this exercise';
COMMENT ON COLUMN class_exercises.max_score IS 'Maximum possible score for this exercise (can be any number)';
