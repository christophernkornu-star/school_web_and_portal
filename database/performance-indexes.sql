CREATE INDEX IF NOT EXISTS idx_students_class_id ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_profile_id ON students(profile_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

CREATE INDEX IF NOT EXISTS idx_scores_student_term ON scores(student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_scores_class_score ON scores(class_score);
CREATE INDEX IF NOT EXISTS idx_scores_exam_score ON scores(exam_score);

CREATE INDEX IF NOT EXISTS idx_attendance_student_status ON attendance(student_id, status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_teachers_profile_id ON teachers(profile_id);
CREATE INDEX IF NOT EXISTS idx_teachers_status ON teachers(status);

CREATE INDEX IF NOT EXISTS idx_academic_terms_current ON academic_terms(is_current);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON academic_terms(academic_year);

CREATE INDEX IF NOT EXISTS idx_class_subjects_class ON class_subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_class_subjects_subject ON class_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_assessments_class_subject ON assessments(class_subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_assessment ON grades(assessment_id);

