-- Teacher Class and Subject Assignment Tables
-- Run this to add class and subject assignment functionality

-- ============================================
-- TEACHER CLASS ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_class_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id TEXT REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  assigned_date DATE DEFAULT CURRENT_DATE,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(teacher_id, class_id)
);

-- ============================================
-- TEACHER SUBJECT ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id TEXT REFERENCES teachers(teacher_id) ON DELETE CASCADE,
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
DROP POLICY IF EXISTS "Admins can manage teacher class assignments" ON teacher_class_assignments;
DROP POLICY IF EXISTS "Teachers can view own class assignments" ON teacher_class_assignments;

CREATE POLICY "Admins can manage teacher class assignments" ON teacher_class_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can view own class assignments" ON teacher_class_assignments
  FOR SELECT USING (
    teacher_id IN (SELECT teacher_id FROM teachers WHERE profile_id = auth.uid())
  );

-- RLS Policies for Subject Assignments
DROP POLICY IF EXISTS "Admins can manage teacher subject assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Teachers can view own subject assignments" ON teacher_subject_assignments;

CREATE POLICY "Admins can manage teacher subject assignments" ON teacher_subject_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Teachers can view own subject assignments" ON teacher_subject_assignments
  FOR SELECT USING (
    teacher_id IN (SELECT teacher_id FROM teachers WHERE profile_id = auth.uid())
  );

-- ============================================
-- Add password reset tracking to profiles
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_reset_required BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_password_change TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_class ON teacher_class_assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_subject ON teacher_subject_assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_class ON teacher_subject_assignments(class_id);
