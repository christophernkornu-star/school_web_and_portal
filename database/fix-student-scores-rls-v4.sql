-- Create student_scores table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score DECIMAL(5,2) NOT NULL CHECK (score >= 0 AND score <= 10),
  remarks TEXT,
  entered_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assessment_id, student_id)
);

-- Enable RLS on student_scores
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Teachers can manage student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can insert student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can update student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can delete student_scores" ON student_scores;
DROP POLICY IF EXISTS "Teachers can select student_scores" ON student_scores;
DROP POLICY IF EXISTS "Students can view own scores" ON student_scores;

-- Create a comprehensive policy for teachers on student_scores
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

-- Enable RLS on assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for assessments
DROP POLICY IF EXISTS "Teachers can manage assessments" ON assessments;

-- Teachers can manage assessments
CREATE POLICY "Teachers can manage assessments" ON assessments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  );

-- Enable RLS on class_subjects
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for class_subjects
DROP POLICY IF EXISTS "Teachers can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can insert class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can manage class_subjects" ON class_subjects;

-- Teachers can manage class_subjects
CREATE POLICY "Teachers can manage class_subjects" ON class_subjects
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  );

-- Enable RLS on scores
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for scores
DROP POLICY IF EXISTS "Teachers can manage scores" ON scores;
DROP POLICY IF EXISTS "Teachers can manage class scores" ON scores;

-- Teachers can manage scores
CREATE POLICY "Teachers can manage scores" ON scores
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teachers 
      WHERE teachers.profile_id = auth.uid()
    )
  );
