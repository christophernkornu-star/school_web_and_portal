-- Create Teacher Assignment Tables
-- These tables manage which classes and subjects teachers are assigned to

-- ============================================
-- CREATE TEACHER CLASS ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year TEXT DEFAULT '2024/2025',
  is_class_teacher BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, class_id, academic_year)
);

-- ============================================
-- CREATE TEACHER SUBJECT ASSIGNMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id TEXT NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year TEXT DEFAULT '2024/2025',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id, academic_year)
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_teacher_class_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_class ON teacher_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_subject ON teacher_subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_class ON teacher_subject_assignments(class_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES
-- ============================================

-- Teacher Class Assignments Policies
DROP POLICY IF EXISTS "Allow public read teacher_class_assignments" ON teacher_class_assignments;
CREATE POLICY "Allow public read teacher_class_assignments"
ON teacher_class_assignments FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access teacher_class_assignments" ON teacher_class_assignments;
CREATE POLICY "Allow authenticated full access teacher_class_assignments"
ON teacher_class_assignments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Teacher Subject Assignments Policies
DROP POLICY IF EXISTS "Allow public read teacher_subject_assignments" ON teacher_subject_assignments;
CREATE POLICY "Allow public read teacher_subject_assignments"
ON teacher_subject_assignments FOR SELECT
TO public
USING (true);

DROP POLICY IF EXISTS "Allow authenticated full access teacher_subject_assignments" ON teacher_subject_assignments;
CREATE POLICY "Allow authenticated full access teacher_subject_assignments"
ON teacher_subject_assignments FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- CREATE UPDATED_AT TRIGGER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION update_teacher_class_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_teacher_subject_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_teacher_class_assignments_updated_at ON teacher_class_assignments;
CREATE TRIGGER trigger_update_teacher_class_assignments_updated_at
BEFORE UPDATE ON teacher_class_assignments
FOR EACH ROW
EXECUTE FUNCTION update_teacher_class_assignments_updated_at();

DROP TRIGGER IF EXISTS trigger_update_teacher_subject_assignments_updated_at ON teacher_subject_assignments;
CREATE TRIGGER trigger_update_teacher_subject_assignments_updated_at
BEFORE UPDATE ON teacher_subject_assignments
FOR EACH ROW
EXECUTE FUNCTION update_teacher_subject_assignments_updated_at();
