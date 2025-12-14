-- Update Attendance System for Term-Based Tracking
-- This script modifies the attendance system to track days present out of total days per term

-- Step 1: Add total_days column to academic_terms table
ALTER TABLE academic_terms 
ADD COLUMN IF NOT EXISTS total_days INTEGER DEFAULT 0;

-- Update existing terms with a default value (you can adjust this)
UPDATE academic_terms 
SET total_days = 63 
WHERE total_days = 0 OR total_days IS NULL;

-- Step 2: Create a new table for student attendance summary per term
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

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_attendance_student 
ON student_attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_term 
ON student_attendance(term_id);

CREATE INDEX IF NOT EXISTS idx_student_attendance_class 
ON student_attendance(class_id);

-- Step 4: Enable RLS on new table
ALTER TABLE student_attendance ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies for student_attendance

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
      SELECT id FROM teachers WHERE profile_id = auth.uid()
    )
  )
);

-- Teachers can insert/update attendance for their classes
CREATE POLICY "Teachers can manage class attendance" 
ON student_attendance
FOR ALL
USING (
  class_id IN (
    SELECT class_id FROM teacher_class_assignments 
    WHERE teacher_id IN (
      SELECT id FROM teachers WHERE profile_id = auth.uid()
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

-- Step 6: Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_student_attendance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for updated_at
DROP TRIGGER IF EXISTS set_student_attendance_updated_at ON student_attendance;
CREATE TRIGGER set_student_attendance_updated_at
  BEFORE UPDATE ON student_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_student_attendance_timestamp();

-- Step 8: Create a view for attendance statistics
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
  COUNT(CASE WHEN s.gender = 'male' THEN 1 END) as boys_count,
  COUNT(CASE WHEN s.gender = 'female' THEN 1 END) as girls_count,
  AVG(CASE WHEN s.gender = 'male' THEN sa.days_present END) as boys_avg_present,
  AVG(CASE WHEN s.gender = 'female' THEN sa.days_present END) as girls_avg_present,
  ROUND(AVG(CASE WHEN s.gender = 'male' THEN sa.days_present::decimal / NULLIF(at.total_days, 0) * 100 END), 2) as boys_attendance_rate,
  ROUND(AVG(CASE WHEN s.gender = 'female' THEN sa.days_present::decimal / NULLIF(at.total_days, 0) * 100 END), 2) as girls_attendance_rate
FROM student_attendance sa
JOIN students s ON sa.student_id = s.id
JOIN classes c ON sa.class_id = c.id
JOIN academic_terms at ON sa.term_id = at.id
GROUP BY sa.class_id, sa.term_id, c.name, at.name, at.academic_year, at.total_days;

-- Step 9: Grant access to the view
GRANT SELECT ON attendance_statistics TO authenticated;

COMMENT ON TABLE academic_terms IS 'Academic terms with total school days per term';
COMMENT ON COLUMN academic_terms.total_days IS 'Total number of school days in this term (set by admin)';
COMMENT ON TABLE student_attendance IS 'Student attendance summary per term - tracks days present out of total days';
COMMENT ON COLUMN student_attendance.days_present IS 'Number of days the student was present (entered by class teacher)';
COMMENT ON VIEW attendance_statistics IS 'Aggregated attendance statistics by class and term, including gender breakdowns';
