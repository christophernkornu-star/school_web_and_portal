-- Fix Teacher Assignment Tables to use UUID foreign keys

-- Drop existing tables if they exist
DROP TABLE IF EXISTS teacher_subject_assignments CASCADE;
DROP TABLE IF EXISTS teacher_class_assignments CASCADE;

-- TEACHER CLASS ASSIGNMENTS (using UUID foreign key)
CREATE TABLE teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, class_id)
);

-- TEACHER SUBJECT ASSIGNMENTS (using UUID foreign key)
CREATE TABLE teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id, class_id)
);

-- Enable RLS
ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Class Assignments
CREATE POLICY "Admins can manage teacher class assignments" ON teacher_class_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can view own class assignments" ON teacher_class_assignments
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Everyone can view class assignments" ON teacher_class_assignments
  FOR SELECT USING (true);

-- RLS Policies for Subject Assignments
CREATE POLICY "Admins can manage teacher subject assignments" ON teacher_subject_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can view own subject assignments" ON teacher_subject_assignments
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Everyone can view subject assignments" ON teacher_subject_assignments
  FOR SELECT USING (true);

-- Indexes for performance
CREATE INDEX idx_teacher_class_assignments_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX idx_teacher_class_assignments_class ON teacher_class_assignments(class_id);
CREATE INDEX idx_teacher_subject_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX idx_teacher_subject_assignments_subject ON teacher_subject_assignments(subject_id);
CREATE INDEX idx_teacher_subject_assignments_class ON teacher_subject_assignments(class_id);
