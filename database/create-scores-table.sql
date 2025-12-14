-- Create scores table for exam results
-- This table stores combined class work and exam scores for easier reporting
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  class_score DECIMAL(5,2) NOT NULL CHECK (class_score >= 0 AND class_score <= 40),
  exam_score DECIMAL(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 60),
  total DECIMAL(5,2) NOT NULL CHECK (total >= 0 AND total <= 100),
  grade VARCHAR(2) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, subject_id, term_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_scores_student ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_subject ON scores(subject_id);
CREATE INDEX IF NOT EXISTS idx_scores_term ON scores(term_id);
CREATE INDEX IF NOT EXISTS idx_scores_teacher ON scores(teacher_id);

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS scores_updated_at_trigger ON scores;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scores_updated_at_trigger
  BEFORE UPDATE ON scores
  FOR EACH ROW
  EXECUTE FUNCTION update_scores_updated_at();

-- Enable RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Teachers can view scores for their classes" ON scores;
DROP POLICY IF EXISTS "Teachers can insert scores for their subjects" ON scores;
DROP POLICY IF EXISTS "Teachers can update their own scores" ON scores;
DROP POLICY IF EXISTS "Teachers can delete their own scores" ON scores;
DROP POLICY IF EXISTS "Authenticated users can view all scores" ON scores;
DROP POLICY IF EXISTS "Public read access for scores" ON scores;
DROP POLICY IF EXISTS "Teachers can insert scores" ON scores;
DROP POLICY IF EXISTS "Teachers can update own scores" ON scores;
DROP POLICY IF EXISTS "Teachers can delete own scores" ON scores;

-- Simplified policies for easier access
-- Public read access (authenticated users can view all scores)
CREATE POLICY "Public read access for scores"
  ON scores FOR SELECT
  TO authenticated
  USING (true);

-- Teachers can insert scores
CREATE POLICY "Teachers can insert scores"
  ON scores FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
  );

-- Teachers can update their own scores
CREATE POLICY "Teachers can update own scores"
  ON scores FOR UPDATE
  TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());

-- Teachers can delete their own scores
CREATE POLICY "Teachers can delete own scores"
  ON scores FOR DELETE
  TO authenticated
  USING (teacher_id = auth.uid());

COMMENT ON TABLE scores IS 'Stores student exam scores with class work and exam components';
COMMENT ON COLUMN scores.class_score IS 'Class/coursework score out of 40';
COMMENT ON COLUMN scores.exam_score IS 'Examination score out of 60';
COMMENT ON COLUMN scores.total IS 'Total score out of 100 (class_score + exam_score)';
COMMENT ON COLUMN scores.grade IS 'Letter grade (A, B, C, D, E, F)';
