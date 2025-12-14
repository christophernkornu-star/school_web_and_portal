-- Sample Data for Testing Biriwa Methodist 'C' Basic School SMS
-- Run this AFTER running the main schema.sql

-- =====================================================
-- SAMPLE USERS (Create these in Supabase Auth first, then use their IDs here)
-- =====================================================

-- Replace 'UUID_HERE' with actual user IDs from Supabase Auth

-- Sample Admin Profile
-- INSERT INTO profiles (id, email, full_name, role, phone_number) 
-- VALUES ('UUID_HERE', 'admin@biriwamethodist.edu.gh', 'Mrs. Abena Mensah', 'admin', '+233244123456');

-- Sample Teachers
-- INSERT INTO profiles (id, email, full_name, role, phone_number, date_of_birth, gender) VALUES
-- ('UUID_HERE', 'kofi.mensah@teacher.com', 'Mr. Kofi Mensah', 'teacher', '+233241234567', '1985-05-15', 'Male'),
-- ('UUID_HERE', 'ama.asante@teacher.com', 'Mrs. Ama Asante', 'teacher', '+233242345678', '1988-08-20', 'Female'),
-- ('UUID_HERE', 'kwame.owusu@teacher.com', 'Mr. Kwame Owusu', 'teacher', '+233243456789', '1982-03-10', 'Male');

-- Sample Teacher Records (after creating profiles)
-- INSERT INTO teachers (user_id, teacher_id, qualification, specialization, hire_date) VALUES
-- ('TEACHER1_UUID', 'TCH001', 'B.Ed. Mathematics', 'Mathematics', '2015-09-01'),
-- ('TEACHER2_UUID', 'TCH002', 'B.A. English Education', 'English Language', '2017-09-01'),
-- ('TEACHER3_UUID', 'TCH003', 'B.Sc. Science Education', 'Science', '2018-09-01');

-- =====================================================
-- SAMPLE STUDENTS (30 students across different classes)
-- =====================================================

-- Primary 4 Students (10 students)
DO $$
DECLARE
    user_uuid UUID;
    student_uuid UUID;
    class_p4_id UUID;
BEGIN
    SELECT id INTO class_p4_id FROM classes WHERE class_name = 'Primary 4';
    
    -- Student 1
    INSERT INTO auth.users (email) VALUES ('kwame.boateng@student.com') RETURNING id INTO user_uuid;
    INSERT INTO profiles (id, email, full_name, role, date_of_birth, gender) 
    VALUES (user_uuid, 'kwame.boateng@student.com', 'Kwame Boateng', 'student', '2010-03-15', 'Male');
    INSERT INTO students (user_id, student_id, admission_date, current_class_id, parent_name, parent_phone, hometown, region)
    VALUES (user_uuid, 'STD001', '2017-09-01', class_p4_id, 'Mr. Samuel Boateng', '+233244111111', 'Biriwa', 'Central Region');
    
    -- Add more students similarly...
END $$;

-- Manual sample students (use this template and create in Supabase Auth first)

-- =====================================================
-- SAMPLE TEACHER ASSIGNMENTS
-- =====================================================

-- Assign Mathematics teacher to Primary 4
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year_id, term_id)
SELECT 
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001'),
    (SELECT id FROM subjects WHERE subject_code = 'MATH'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM academic_years WHERE is_current = TRUE),
    (SELECT id FROM terms WHERE is_current = TRUE);

-- Assign English teacher to Primary 4
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year_id, term_id)
SELECT 
    (SELECT id FROM teachers WHERE teacher_id = 'TCH002'),
    (SELECT id FROM subjects WHERE subject_code = 'ENG'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM academic_years WHERE is_current = TRUE),
    (SELECT id FROM terms WHERE is_current = TRUE);

-- =====================================================
-- SAMPLE ASSESSMENTS
-- =====================================================

-- Create a Mathematics class test for Primary 4
INSERT INTO assessments (subject_id, class_id, teacher_id, term_id, assessment_type_id, assessment_name, max_score, assessment_date)
SELECT 
    (SELECT id FROM subjects WHERE subject_code = 'MATH'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001'),
    (SELECT id FROM terms WHERE is_current = TRUE),
    (SELECT id FROM assessment_types WHERE type_name = 'Class Test'),
    'Mid-Term Mathematics Test',
    30,
    CURRENT_DATE - INTERVAL '10 days';

-- Create an English exam
INSERT INTO assessments (subject_id, class_id, teacher_id, term_id, assessment_type_id, assessment_name, max_score, assessment_date)
SELECT 
    (SELECT id FROM subjects WHERE subject_code = 'ENG'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM teachers WHERE teacher_id = 'TCH002'),
    (SELECT id FROM terms WHERE is_current = TRUE),
    (SELECT id FROM assessment_types WHERE type_name = 'End of Term Exam'),
    'First Term English Examination',
    100,
    CURRENT_DATE - INTERVAL '5 days';

-- =====================================================
-- SAMPLE STUDENT SCORES
-- =====================================================

-- Add scores for Mathematics test (sample for one student)
INSERT INTO student_scores (assessment_id, student_id, score, remarks, entered_by)
SELECT 
    (SELECT id FROM assessments WHERE assessment_name = 'Mid-Term Mathematics Test'),
    (SELECT id FROM students WHERE student_id = 'STD001'),
    25.5,
    'Good performance',
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001');

-- =====================================================
-- SAMPLE TERM RESULTS
-- =====================================================

-- Sample result for one student
INSERT INTO term_results (student_id, subject_id, term_id, class_score, exam_score, total_score, grade, position, teacher_id)
SELECT 
    (SELECT id FROM students WHERE student_id = 'STD001'),
    (SELECT id FROM subjects WHERE subject_code = 'MATH'),
    (SELECT id FROM terms WHERE is_current = TRUE),
    27.5,  -- 30% continuous assessment
    63.0,  -- 70% exam
    90.5,  -- Total
    'A',
    2,
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001');

-- =====================================================
-- SAMPLE EVENTS
-- =====================================================

INSERT INTO events (title, description, event_date, event_time, location, event_type, is_public) VALUES
('Independence Day Celebration', 'Celebrating Ghana''s 67th Independence Anniversary with cultural displays and performances', '2025-03-06', '08:00:00', 'School Assembly Ground', 'cultural', TRUE),
('Inter-House Sports Competition', 'Annual sports day featuring track and field events', '2025-11-20', '09:00:00', 'School Sports Field', 'sports', TRUE),
('End of Term Parent-Teacher Meeting', 'Discussion of student progress and next term plans', '2024-12-15', '14:00:00', 'School Hall', 'academic', TRUE),
('Methodist Church Founder''s Day', 'Special assembly to honor Methodist Church founders', '2025-02-28', '07:30:00', 'School Chapel', 'assembly', TRUE);

-- =====================================================
-- SAMPLE PHOTO ALBUMS
-- =====================================================

INSERT INTO photo_albums (album_name, description, is_public) VALUES
('Independence Day 2024', 'Photos from our Ghana Independence Day celebration', TRUE),
('Science Fair 2024', 'Student science projects and experiments exhibition', TRUE),
('Graduation Ceremony 2024', 'JHS 3 students graduation ceremony', TRUE),
('Sports Day 2024', 'Inter-house sports competition highlights', TRUE);

-- =====================================================
-- SAMPLE ADMISSION APPLICATIONS
-- =====================================================

INSERT INTO admission_applications (applicant_name, date_of_birth, gender, parent_name, parent_phone, parent_email, address, class_applying_for, status)
VALUES 
('Akua Osei', '2015-07-20', 'Female', 'Mrs. Grace Osei', '+233245678901', 'grace.osei@email.com', 'Biriwa New Town, Plot 45', (SELECT id FROM classes WHERE class_name = 'Primary 1'), 'pending'),
('Yaw Adjei', '2013-11-05', 'Male', 'Mr. Peter Adjei', '+233246789012', 'peter.adjei@email.com', 'Cape Coast Road, House 12', (SELECT id FROM classes WHERE class_name = 'Primary 3'), 'approved');

-- =====================================================
-- SAMPLE SCHOOL RESOURCES
-- =====================================================

INSERT INTO resources (resource_name, resource_type, quantity, condition, location, purchase_date) VALUES
('Desktop Computers', 'ICT', 20, 'good', 'ICT Laboratory', '2022-09-01'),
('Mathematics Textbooks (Primary 4)', 'Library', 50, 'excellent', 'School Library', '2024-01-15'),
('Science Equipment Set', 'Laboratory', 5, 'good', 'Science Room', '2023-03-10'),
('Football Balls', 'Sports', 10, 'good', 'Sports Store', '2024-07-20'),
('Classroom Desks', 'Classroom', 200, 'fair', 'Various Classrooms', '2020-06-15');

-- =====================================================
-- SAMPLE ANNOUNCEMENTS
-- =====================================================

INSERT INTO announcements (title, content, target_audience, priority, is_active) VALUES
('End of Term Examinations', 'End of First Term examinations will commence on Monday, December 10th, 2024. All students are advised to prepare adequately. Examination timetables will be posted on notice boards.', 'all', 'high', TRUE),
('Parent-Teacher Association Meeting', 'The PTA meeting is scheduled for Saturday, December 2nd, 2024 at 2:00 PM in the school hall. All parents are encouraged to attend.', 'parents', 'normal', TRUE),
('Staff Training Workshop', 'Professional development workshop for all teaching staff on Saturday, November 30th, 2024. Attendance is mandatory.', 'teachers', 'high', TRUE),
('New Library Books Available', 'The school library has received new books across various subjects. Students are encouraged to visit and borrow books for reading.', 'students', 'normal', TRUE);

-- =====================================================
-- SAMPLE ATTENDANCE RECORDS
-- =====================================================

-- Add attendance for the past week for one student
INSERT INTO attendance (student_id, class_id, date, status, recorded_by)
SELECT 
    (SELECT id FROM students WHERE student_id = 'STD001'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    date_series,
    'present',
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001')
FROM generate_series(
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '1 day',
    INTERVAL '1 day'
) AS date_series
WHERE EXTRACT(DOW FROM date_series) NOT IN (0, 6); -- Exclude weekends

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check data was inserted correctly
SELECT 'Students' as table_name, COUNT(*) as count FROM students
UNION ALL
SELECT 'Teachers', COUNT(*) FROM teachers
UNION ALL
SELECT 'Classes', COUNT(*) FROM classes
UNION ALL
SELECT 'Subjects', COUNT(*) FROM subjects
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Assessments', COUNT(*) FROM assessments
UNION ALL
SELECT 'Announcements', COUNT(*) FROM announcements;
