-- Performance Optimization Indexes
-- This script adds missing indexes to critical tables to speed up dashboard loading and data retrieval.

-- 1. Students Table Optimization
-- Used heavily in Admin Students list, Teacher Entry, and Report Cards
CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- 2. Scores Table Optimization
-- Used heavily in Report Cards and Transcripts
CREATE INDEX IF NOT EXISTS idx_scores_student_term ON scores(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_scores_class_score ON scores(class_score); -- For analytics
CREATE INDEX IF NOT EXISTS idx_scores_exam_score ON scores(exam_score);   -- For analytics

-- 3. Attendance Table Optimization
-- Used in calculating attendance percentages for dashboards
CREATE INDEX IF NOT EXISTS idx_attendance_student_status ON attendance(student_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

-- 4. Profiles Table Optimization
-- Used for Auth and User lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- 5. Teachers Table Optimization
-- Used in Teacher Dashboard and Assignments
CREATE INDEX IF NOT EXISTS idx_teachers_profile_id ON teachers(profile_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

-- 6. Academic Terms Optimization
-- Used to quickly find current term
CREATE INDEX IF NOT EXISTS idx_academic_terms_current ON academic_terms(is_current);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON academic_terms(academic_year);

-- 7. Class Subjects & Assessments
-- Used in Enter Scores page
CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class_subject ON assessments(class_subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);

-- 8. Activity Logs
-- (Section removed as activity_logs table is not yet implemented)
