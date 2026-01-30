-- Create tables for Mock Exams

CREATE TABLE IF NOT EXISTS mock_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id),
  term_id UUID NOT NULL REFERENCES academic_terms(id),
  name TEXT NOT NULL, -- e.g. "First", "Second"
  academic_year TEXT NOT NULL,
  created_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, term_id, name)
);

CREATE TABLE IF NOT EXISTS mock_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mock_exam_id UUID NOT NULL REFERENCES mock_exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id),
  subject_id UUID NOT NULL REFERENCES subjects(id),
  score DECIMAL(5, 2), -- 0-100
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(mock_exam_id, student_id, subject_id)
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_mock_scores_exam ON mock_scores(mock_exam_id);
CREATE INDEX IF NOT EXISTS idx_mock_scores_student ON mock_scores(student_id);
-- Enable RLS
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_scores ENABLE ROW LEVEL SECURITY;

-- Policies for mock_exams
DROP POLICY IF EXISTS "Enable read access for all users" ON mock_exams;
CREATE POLICY "Enable read access for all users" ON mock_exams
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON mock_exams;
CREATE POLICY "Enable insert for authenticated users" ON mock_exams
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable update for creators and admins" ON mock_exams;
CREATE POLICY "Enable update for creators and admins" ON mock_exams
  FOR UPDATE USING (
    auth.uid() IN (
        SELECT profile_id FROM teachers WHERE id = mock_exams.created_by
    ) OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Enable delete for creators and admins" ON mock_exams;
CREATE POLICY "Enable delete for creators and admins" ON mock_exams
  FOR DELETE USING (
    auth.uid() IN (
        SELECT profile_id FROM teachers WHERE id = mock_exams.created_by
    ) OR 
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for mock_scores
DROP POLICY IF EXISTS "Enable read access for all users" ON mock_scores;
CREATE POLICY "Enable read access for all users" ON mock_scores
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert/update for authenticated users" ON mock_scores;
CREATE POLICY "Enable insert/update for authenticated users" ON mock_scores
  FOR ALL USING (auth.role() = 'authenticated');
