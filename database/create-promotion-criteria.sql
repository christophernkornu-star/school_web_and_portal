-- Promotion Criteria System
-- Allows admin to configure flexible criteria for student promotion
-- Supports: overall average, core subjects, aggregate system, attendance

-- 1. Create promotion_criteria table
CREATE TABLE IF NOT EXISTS promotion_criteria (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  academic_year VARCHAR(20) NOT NULL,
  class_level VARCHAR(50), -- NULL = applies to all, e.g. 'jhs', 'upper_primary', 'lower_primary'
  
  -- Overall performance
  overall_enabled BOOLEAN DEFAULT TRUE,
  overall_passing_average DECIMAL(5,2) DEFAULT 30.00,
  
  -- Core subject requirements
  core_subjects_enabled BOOLEAN DEFAULT FALSE,
  core_subjects TEXT[] DEFAULT '{"English", "Mathematics", "Integrated Science", "Social Studies"}',
  core_subject_passing_score DECIMAL(5,2) DEFAULT 40.00,
  
  -- Aggregate system (BECE style)
  aggregate_enabled BOOLEAN DEFAULT FALSE,
  max_aggregate INTEGER DEFAULT 30,
  
  -- Attendance
  attendance_enabled BOOLEAN DEFAULT FALSE,
  minimum_attendance_percentage DECIMAL(5,2) DEFAULT 50.00,
  
  -- Decision logic
  require_all_criteria BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_academic_year_criteria UNIQUE (academic_year)
);

-- 2. Create index
CREATE INDEX IF NOT EXISTS idx_promotion_criteria_year ON promotion_criteria(academic_year);

-- 3. Enable RLS
ALTER TABLE promotion_criteria ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
DROP POLICY IF EXISTS admins_manage_promotion_criteria ON promotion_criteria;
DROP POLICY IF EXISTS everyone_view_promotion_criteria ON promotion_criteria;

CREATE POLICY everyone_view_promotion_criteria ON promotion_criteria
  FOR SELECT
  USING (TRUE);

CREATE POLICY admins_manage_promotion_criteria ON promotion_criteria
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 5. Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_promotion_criteria_updated_at ON promotion_criteria;

CREATE OR REPLACE FUNCTION update_promotion_criteria_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promotion_criteria_updated_at
  BEFORE UPDATE ON promotion_criteria
  FOR EACH ROW
  EXECUTE FUNCTION update_promotion_criteria_updated_at();

-- 6. Comments
COMMENT ON TABLE promotion_criteria IS 'Configurable criteria for student promotion decisions';
COMMENT ON COLUMN promotion_criteria.overall_passing_average IS 'Minimum overall average score across all subjects for the academic year';
COMMENT ON COLUMN promotion_criteria.core_subjects IS 'List of core subject names that require minimum passing scores';
COMMENT ON COLUMN promotion_criteria.core_subject_passing_score IS 'Minimum score required in each core subject';
COMMENT ON COLUMN promotion_criteria.max_aggregate IS 'Maximum BECE-style aggregate (English + Math + Science + Social + Best 2) for promotion';
COMMENT ON COLUMN promotion_criteria.minimum_attendance_percentage IS 'Minimum attendance rate required for promotion';
COMMENT ON COLUMN promotion_criteria.require_all_criteria IS 'If true, student must meet ALL enabled criteria. If false, meeting ANY is sufficient';
