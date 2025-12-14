-- Complete Attendance System Setup
-- Run this in Supabase SQL Editor
-- This creates the attendance system AND sets up all RLS policies

-- ============================================
-- STEP 1: Add total_days column to academic_terms
-- ============================================
ALTER TABLE academic_terms 
ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 0;

-- Update existing terms with a default value
UPDATE academic_terms 
SET total_days = 63 
WHERE total_days = 0 OR total_days IS NULL;

-- ============================================
-- STEP 2: Create student_attendance table
-- ============================================
CREATE TABLE IF NOT EXISTS student_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  days_present INTEGER NOT NULL DEFAULT 0,
  remarks TEXT,
  recorded_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_student 
ON student_attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_term 
ON student_attendance(term_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_class 
ON student_attendance(class_id);

-- ============================================
-- STEP 3: Enable RLS and create policies for student_attendance
-- ============================================
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies first
DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance;
DROP POLICY IF EXISTS "Admins can manage all attendance" ON student_attendance;

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance" 
ON student_attendance
FOR SELECT
USING (
  student_id IN (
    SELECT id FROM students WHERE profile_id = auth.uid()
  )
);

-- Teachers can view attendance for their classes
CREATE POLICY "Teachers can view class attendance" 
ON student_attendance
FOR SELECT
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (
      SELECT id::text FROM teachers WHERE profile_id = auth.uid()
    )
  )
);

-- Teachers can insert/update attendance for their classes (class teachers only)
CREATE POLICY "Teachers can manage class attendance" 
ON student_attendance
FOR ALL
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments 
    WHERE teacher_id IN (
      SELECT id::text FROM teachers WHERE profile_id = auth.uid()
    )
    AND is_class_teacher = true
  )
);

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance" 
ON student_attendance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- STEP 4: Create timestamp update function and trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_student_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_student_attendance_updated_at ON student_attendance;
CREATE TRIGGER set_student_attendance_updated_at
  BEFORE UPDATE ON student_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_student_attendance_timestamp();

-- ============================================
-- STEP 5: Create attendance statistics view
-- ============================================
CREATE OR REPLACE VIEW attendance_statistics AS
SELECT 
  sa.class_id,
  sa.term_id,
  c.name as class_name,
  at.name as term_name,
  at.academic_year,
  at.total_days,
  COUNT(sa.id) as total_students,
  SUM(sa.days_present) as total_days_present,
  AVG(sa.days_present) as average_days_present,
  ROUND(AVG(sa.days_present::decimal / NULLIF(at.total_days, 0) * 100), 2) as attendance_rate,
  COUNT(CASE WHEN s.gender = 'male' OR s.gender = 'Male' THEN 1 END) as boys_count,
  COUNT(CASE WHEN s.gender = 'female' OR s.gender = 'Female' THEN 1 END) as girls_count,
  AVG(CASE WHEN s.gender = 'male' OR s.gender = 'Male' THEN sa.days_present END) as boys_avg_present,
  AVG(CASE WHEN s.gender = 'female' OR s.gender = 'Female' THEN sa.days_present END) as girls_avg_present,
  ROUND(AVG(CASE WHEN s.gender = 'male' OR s.gender = 'Male' THEN sa.days_present::decimal / NULLIF(at.total_days, 0) * 100 END), 2) as boys_attendance_rate,
  ROUND(AVG(CASE WHEN s.gender = 'female' OR s.gender = 'Female' THEN sa.days_present::decimal / NULLIF(at.total_days, 0) * 100 END), 2) as girls_attendance_rate
FROM student_attendance sa
JOIN students s ON sa.student_id = s.id
JOIN classes c ON sa.class_id = c.id
JOIN academic_terms at ON sa.term_id = at.id
GROUP BY sa.class_id, sa.term_id, c.name, at.name, at.academic_year, at.total_days;

-- Grant access to the view
GRANT SELECT ON attendance_statistics TO authenticated;

-- ============================================
-- STEP 6: Add RLS policies for academic_terms table
-- ============================================
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Everyone can view academic terms" ON academic_terms;
DROP POLICY IF EXISTS "Admins can manage academic terms" ON academic_terms;

-- Everyone can view academic terms (needed for public displays, student/teacher access)
CREATE POLICY "Everyone can view academic terms"
ON academic_terms
FOR SELECT
USING (true);

-- Only admins can insert, update, or delete academic terms
CREATE POLICY "Admins can manage academic terms"
ON academic_terms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- STEP 7: Add comments for documentation
-- ============================================
COMMENT ON TABLE academic_terms IS 'Academic terms with total school days per term';
COMMENT ON COLUMN academic_terms.total_days IS 'Total number of school days in this term (set by admin)';
COMMENT ON TABLE student_attendance IS 'Student attendance summary per term - tracks days present out of total days';
COMMENT ON COLUMN student_attendance.days_present IS 'Number of days the student was present (entered by class teacher)';
COMMENT ON VIEW attendance_statistics IS 'Aggregated attendance statistics by class and term, including gender breakdowns';

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify student_attendance table was created
SELECT 'student_attendance table' as check_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_attendance') 
       THEN '✓ Created' ELSE '✗ Missing' END as status;

-- Verify student_attendance policies
SELECT 'student_attendance policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'student_attendance';

-- Verify academic_terms column
SELECT 'academic_terms.total_days' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'academic_terms' AND column_name = 'total_days') 
       THEN '✓ Column exists' ELSE '✗ Missing' END as status;

-- Verify academic_terms policies
SELECT 'academic_terms policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies 
WHERE tablename = 'academic_terms';

-- Verify attendance_statistics view
SELECT 'attendance_statistics view' as check_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'attendance_statistics') 
       THEN '✓ Created' ELSE '✗ Missing' END as status;
