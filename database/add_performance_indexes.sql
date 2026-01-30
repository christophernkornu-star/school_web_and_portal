-- Indexes to speed up reports and score management

-- SCORES TABLE
-- Frequently queried by student and term for reports
CREATE INDEX IF NOT EXISTS idx_scores_student_term ON scores(student_id, term_id);
-- Frequently queried by subject and term for teacher inputs / analysis
CREATE INDEX IF NOT EXISTS idx_scores_subject_term ON scores(subject_id, term_id);
-- Compound index for uniqueness checks and specific lookups
CREATE INDEX IF NOT EXISTS idx_scores_student_subject_term ON scores(student_id, subject_id, term_id);

-- ATTENDANCE TABLE
-- Counting presence/absence per student
CREATE INDEX IF NOT EXISTS idx_attendance_student_status ON attendance(student_id, status);

-- STUDENTS TABLE
-- Listing students by class
CREATE INDEX IF NOT EXISTS idx_students_class_status ON students(class_id, status);

-- TEACHER ASSIGNMENTS (teacher_subject_assignments)
-- Optimizing teacher dashboard queries
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_teacher ON teacher_subject_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_subject_assignments_class ON teacher_subject_assignments(class_id);

-- Attendance Summary
-- Speed up report card generation
CREATE INDEX IF NOT EXISTS idx_student_attendance_summary ON student_attendance(student_id, term_id);

-- ACADEMIC TERMS
-- Sorting terms
CREATE INDEX IF NOT EXISTS idx_academic_terms_created_at ON academic_terms(created_at DESC);
