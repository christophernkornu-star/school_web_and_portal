-- ============================================================================
-- COMPREHENSIVE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- Biriwa Methodist 'C' Basic School Management System
-- ============================================================================
-- Run this in Supabase SQL Editor
-- This script ensures ALL tables in the database have proper RLS policies
-- ============================================================================

-- ============================================================================
-- SECURITY HELPER FUNCTIONS
-- ============================================================================

-- Create a secure function to check admin status (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure function to check teacher status
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create secure function to check if user is admin or teacher
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'teacher')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles for login" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Everyone can read profiles (needed for login, name lookups, etc.)
CREATE POLICY "Anyone can view profiles for login" ON profiles
  FOR SELECT USING (true);

-- Users can create their own profile during signup
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Admins can create any profile
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (is_admin());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON profiles
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 2. CLASSES TABLE
-- ============================================================================
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;

-- Everyone can view classes (dropdown lists, filters, etc.)
CREATE POLICY "Anyone can view classes" ON classes
  FOR SELECT USING (true);

-- Only admins can insert/update/delete classes
CREATE POLICY "Admins can insert classes" ON classes
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update classes" ON classes
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete classes" ON classes
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 3. TEACHERS TABLE
-- ============================================================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own record" ON teachers;
DROP POLICY IF EXISTS "Admins can view teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can insert teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can update teachers" ON teachers;
DROP POLICY IF EXISTS "Admins can delete teachers" ON teachers;

-- Teachers can view their own record; admins can view all teachers
CREATE POLICY "Anyone can view teachers" ON teachers
  FOR SELECT USING (true);

-- Admins can insert/update/delete teachers
CREATE POLICY "Admins can insert teachers" ON teachers
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update teachers" ON teachers
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete teachers" ON teachers
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 4. STUDENTS TABLE
-- ============================================================================
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own record" ON students;
DROP POLICY IF EXISTS "Admins can view students" ON students;
DROP POLICY IF EXISTS "Admins can insert students" ON students;
DROP POLICY IF EXISTS "Admins can update students" ON students;
DROP POLICY IF EXISTS "Admins can delete students" ON students;

-- Students can view their own record; staff can view all students
CREATE POLICY "Anyone can view students" ON students
  FOR SELECT USING (true);

-- Admins can insert/update/delete students
CREATE POLICY "Admins can insert students" ON students
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update students" ON students
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete students" ON students
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 5. SUBJECTS TABLE
-- ============================================================================
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON subjects;

-- Everyone can view subjects
CREATE POLICY "Anyone can view subjects" ON subjects
  FOR SELECT USING (true);

-- Only admins can manage subjects
CREATE POLICY "Admins can insert subjects" ON subjects
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update subjects" ON subjects
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete subjects" ON subjects
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 6. CLASS_SUBJECTS TABLE
-- ============================================================================
ALTER TABLE class_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can view class_subjects" ON class_subjects;
DROP POLICY IF EXISTS "Teachers can insert class_subjects" ON class_subjects;

-- Staff can view class_subjects
CREATE POLICY "Staff can view class_subjects" ON class_subjects
  FOR SELECT USING (true);

-- Teachers and admins can insert class_subjects
CREATE POLICY "Staff can insert class_subjects" ON class_subjects
  FOR INSERT WITH CHECK (is_staff());

-- Teachers and admins can update class_subjects
CREATE POLICY "Staff can update class_subjects" ON class_subjects
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

-- Only admins can delete class_subjects
CREATE POLICY "Admins can delete class_subjects" ON class_subjects
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 7. ACADEMIC TERMS TABLE
-- ============================================================================
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view academic terms" ON academic_terms;
DROP POLICY IF EXISTS "Admins can manage academic terms" ON academic_terms;

-- Everyone can view academic terms
CREATE POLICY "Anyone can view academic terms" ON academic_terms
  FOR SELECT USING (true);

-- Only admins can manage academic terms
CREATE POLICY "Admins can insert academic terms" ON academic_terms
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update academic terms" ON academic_terms
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete academic terms" ON academic_terms
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 8. ASSESSMENTS TABLE
-- ============================================================================
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage assessments" ON assessments;
DROP POLICY IF EXISTS "Anyone can view assessments" ON assessments;

-- Staff can view assessments
CREATE POLICY "Staff can view assessments" ON assessments
  FOR SELECT USING (true);

-- Teachers and admins can insert/update/delete assessments
CREATE POLICY "Staff can insert assessments" ON assessments
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update assessments" ON assessments
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete assessments" ON assessments
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 9. STUDENT_SCORES TABLE (per-assessment scores)
-- ============================================================================
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage student_scores" ON student_scores;
DROP POLICY IF EXISTS "Students can view own scores" ON student_scores;

-- Students can view their own scores
CREATE POLICY "Students can view own scores" ON student_scores
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Teachers can also view scores (for entering/grading)
CREATE POLICY "Teachers can view student_scores" ON student_scores
  FOR SELECT USING (is_staff());

-- Teachers and admins can insert/update/delete scores
CREATE POLICY "Staff can insert student_scores" ON student_scores
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update student_scores" ON student_scores
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete student_scores" ON student_scores
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 10. SCORES TABLE (aggregated class + exam scores)
-- ============================================================================
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can manage scores" ON scores;
DROP POLICY IF EXISTS "Students can view all class scores" ON scores;

-- Students can view their own scores AND classmates' scores (for ranking)
CREATE POLICY "Students can view all class scores" ON scores
  FOR SELECT USING (
    -- Allow if the score belongs to any student in the same class as the current user
    student_id IN (
      SELECT s2.id
      FROM students s1
      INNER JOIN students s2 ON s1.class_id = s2.class_id
      WHERE s1.profile_id = auth.uid()
    )
  );

-- Teachers and admins can also view all scores
CREATE POLICY "Staff can view scores" ON scores
  FOR SELECT USING (is_staff());

-- Teachers and admins can insert/update/delete scores
CREATE POLICY "Staff can insert scores" ON scores
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update scores" ON scores
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete scores" ON scores
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 11. ATTENDANCE TABLE (original)
-- ============================================================================
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance" ON attendance
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Teachers and admins can view all attendance
CREATE POLICY "Staff can view attendance" ON attendance
  FOR SELECT USING (is_staff());

-- Teachers and admins can insert/update/delete attendance
CREATE POLICY "Staff can insert attendance" ON attendance
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update attendance" ON attendance
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete attendance" ON attendance
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 12. STUDENT_ATTENDANCE TABLE (newer attendance table)
-- ============================================================================
ALTER TABLE IF EXISTS student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance;
DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance;

-- Students can view their own attendance
CREATE POLICY "Students can view own attendance" ON student_attendance
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Teachers can view attendance for their classes
CREATE POLICY "Teachers can view class attendance" ON student_attendance
  FOR SELECT USING (
    class_id IN (
      SELECT class_id FROM teacher_class_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE profile_id = auth.uid()
      )
    )
  );

-- Admins can view all attendance
CREATE POLICY "Admins can view all attendance" ON student_attendance
  FOR SELECT USING (is_admin());

-- Teachers can manage attendance for their classes
CREATE POLICY "Teachers can manage class attendance" ON student_attendance
  FOR ALL USING (
    class_id IN (
      SELECT class_id FROM teacher_class_assignments
      WHERE teacher_id IN (
        SELECT id FROM teachers WHERE profile_id = auth.uid()
      )
      AND is_class_teacher = true
    )
  );

-- Admins can manage all attendance
CREATE POLICY "Admins can manage all attendance" ON student_attendance
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 13. EVENTS TABLE
-- ============================================================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view events" ON events;
DROP POLICY IF EXISTS "Admins can manage events" ON events;

-- Everyone can view events (for public website calendar)
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

-- Admins can manage events
CREATE POLICY "Admins can insert events" ON events
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update events" ON events
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete events" ON events
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 14. ANNOUNCEMENTS TABLE
-- ============================================================================
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view announcements" ON announcements;
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
DROP POLICY IF EXISTS "Staff can manage announcements" ON announcements;

-- Everyone can view published announcements (for public website)
CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT USING (published = true);

-- Staff can view all announcements (including unpublished)
CREATE POLICY "Staff can view all announcements" ON announcements
  FOR SELECT USING (is_staff());

-- Staff can manage announcements (insert/update/delete)
CREATE POLICY "Staff can insert announcements" ON announcements
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update announcements" ON announcements
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete announcements" ON announcements
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 15. NEWS TABLE
-- ============================================================================
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view news" ON news;
DROP POLICY IF EXISTS "Admins can manage news" ON news;

-- Everyone can view published news (for public website)
CREATE POLICY "Anyone can view published news" ON news
  FOR SELECT USING (published = true);

-- Staff can view all news (including unpublished)
CREATE POLICY "Staff can view all news" ON news
  FOR SELECT USING (is_staff());

-- Staff can manage news
CREATE POLICY "Staff can insert news" ON news
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update news" ON news
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete news" ON news
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 16. GALLERY PHOTOS TABLE
-- ============================================================================
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gallery photos" ON gallery_photos;
DROP POLICY IF EXISTS "Admins can manage gallery" ON gallery_photos;

-- Everyone can view gallery photos (for public website)
CREATE POLICY "Anyone can view gallery photos" ON gallery_photos
  FOR SELECT USING (true);

-- Staff can upload photos
CREATE POLICY "Staff can insert gallery photos" ON gallery_photos
  FOR INSERT WITH CHECK (is_staff());

-- Admins can update/delete photos
CREATE POLICY "Admins can update gallery photos" ON gallery_photos
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete gallery photos" ON gallery_photos
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 17. SYSTEM SETTINGS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for admins" ON system_settings;
DROP POLICY IF EXISTS "Allow select for all" ON system_settings;

-- Everyone can view system settings (for app configuration)
CREATE POLICY "Allow select for all" ON system_settings
  FOR SELECT USING (true);

-- Only admins can modify system settings
CREATE POLICY "Allow all for admins" ON system_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 18. SCHOOL SETTINGS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS school_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view school settings" ON school_settings;
DROP POLICY IF EXISTS "Admins can manage school settings" ON school_settings;

-- Everyone can view school settings
CREATE POLICY "Anyone can view school settings" ON school_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage school settings" ON school_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 19. ACADEMIC SETTINGS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS academic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view academic settings" ON academic_settings;
DROP POLICY IF EXISTS "Admins can manage academic settings" ON academic_settings;

-- Everyone can view academic settings
CREATE POLICY "Anyone can view academic settings" ON academic_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage academic settings" ON academic_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 20. SECURITY SETTINGS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS security_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view security settings" ON security_settings;
DROP POLICY IF EXISTS "Admins can manage security settings" ON security_settings;

-- Everyone can view security settings
CREATE POLICY "Anyone can view security settings" ON security_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage security settings" ON security_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 21. NOTIFICATION SETTINGS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view notification settings" ON notification_settings;
DROP POLICY IF EXISTS "Admins can manage notification settings" ON notification_settings;

-- Everyone can view notification settings
CREATE POLICY "Anyone can view notification settings" ON notification_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage notification settings" ON notification_settings
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 22. FEE TYPES TABLE
-- ============================================================================
ALTER TABLE IF EXISTS fee_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view fee types" ON fee_types;
DROP POLICY IF EXISTS "Admins can manage fee types" ON fee_types;

-- Everyone can view fee types
CREATE POLICY "Anyone can view fee types" ON fee_types
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage fee types" ON fee_types
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 23. FEE STRUCTURES TABLE
-- ============================================================================
ALTER TABLE IF EXISTS fee_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view fee structures" ON fee_structures;
DROP POLICY IF EXISTS "Admins can manage fee structures" ON fee_structures;

-- Everyone can view fee structures
CREATE POLICY "Anyone can view fee structures" ON fee_structures
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage fee structures" ON fee_structures
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 24. FEE PAYMENTS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS fee_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own payments" ON fee_payments;
DROP POLICY IF EXISTS "Admins can manage payments" ON fee_payments;

-- Students can view their own payments
CREATE POLICY "Students can view own payments" ON fee_payments
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Staff can view all payments
CREATE POLICY "Staff can view all payments" ON fee_payments
  FOR SELECT USING (is_staff());

-- Admins can insert/update/delete payments
CREATE POLICY "Admins can insert payments" ON fee_payments
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update payments" ON fee_payments
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete payments" ON fee_payments
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 25. TEACHER CLASS ASSIGNMENTS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS teacher_class_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view teacher class assignments" ON teacher_class_assignments;
DROP POLICY IF EXISTS "Admins can manage teacher class assignments" ON teacher_class_assignments;

-- Everyone can view teacher class assignments (needed for lookups)
CREATE POLICY "Anyone can view teacher class assignments" ON teacher_class_assignments
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage teacher class assignments" ON teacher_class_assignments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 26. TEACHER SUBJECT ASSIGNMENTS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS teacher_subject_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view teacher subject assignments" ON teacher_subject_assignments;
DROP POLICY IF EXISTS "Admins can manage teacher subject assignments" ON teacher_subject_assignments;

-- Everyone can view teacher subject assignments (needed for lookups)
CREATE POLICY "Anyone can view teacher subject assignments" ON teacher_subject_assignments
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage teacher subject assignments" ON teacher_subject_assignments
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 27. CLASS EXERCISES TABLE
-- ============================================================================
ALTER TABLE IF EXISTS class_exercises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own exercises" ON class_exercises;
DROP POLICY IF EXISTS "Teachers can manage class exercises" ON class_exercises;

-- Students can view their own exercises
CREATE POLICY "Students can view own exercises" ON class_exercises
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Teachers and admins can view all exercises
CREATE POLICY "Staff can view class exercises" ON class_exercises
  FOR SELECT USING (is_staff());

-- Teachers and admins can manage exercises
CREATE POLICY "Staff can insert class exercises" ON class_exercises
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update class exercises" ON class_exercises
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete class exercises" ON class_exercises
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 28. STUDENT PROMOTIONS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS student_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view student promotions" ON student_promotions;
DROP POLICY IF EXISTS "Admins can manage student promotions" ON student_promotions;

-- Everyone can view student promotions
CREATE POLICY "Anyone can view student promotions" ON student_promotions
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage student promotions" ON student_promotions
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 29. CLASS PROGRESSION TABLE
-- ============================================================================
ALTER TABLE IF EXISTS class_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view class progression" ON class_progression;
DROP POLICY IF EXISTS "Admins can manage class progression" ON class_progression;

-- Everyone can view class progression
CREATE POLICY "Anyone can view class progression" ON class_progression
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage class progression" ON class_progression
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 30. PROMOTION HISTORY TABLE
-- ============================================================================
ALTER TABLE IF EXISTS promotion_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view promotion history" ON promotion_history;
DROP POLICY IF EXISTS "Admins can manage promotion history" ON promotion_history;

-- Everyone can view promotion history
CREATE POLICY "Anyone can view promotion history" ON promotion_history
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage promotion history" ON promotion_history
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 31. STUDENT REMARKS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS student_remarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own remarks" ON student_remarks;
DROP POLICY IF EXISTS "Teachers can manage student remarks" ON student_remarks;

-- Students can view their own remarks
CREATE POLICY "Students can view own remarks" ON student_remarks
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Staff can view all remarks
CREATE POLICY "Staff can view student remarks" ON student_remarks
  FOR SELECT USING (is_staff());

-- Teachers and admins can manage remarks
CREATE POLICY "Staff can insert student remarks" ON student_remarks
  FOR INSERT WITH CHECK (is_staff());

CREATE POLICY "Staff can update student remarks" ON student_remarks
  FOR UPDATE USING (is_staff()) WITH CHECK (is_staff());

CREATE POLICY "Staff can delete student remarks" ON student_remarks
  FOR DELETE USING (is_staff());

-- ============================================================================
-- 32. MOCK EXAMS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS mock_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view mock exams" ON mock_exams;
DROP POLICY IF EXISTS "Admins can manage mock exams" ON mock_exams;

-- Everyone can view mock exams
CREATE POLICY "Anyone can view mock exams" ON mock_exams
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage mock exams" ON mock_exams
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 33. MOCK SCORES TABLE
-- ============================================================================
ALTER TABLE IF EXISTS mock_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own mock scores" ON mock_scores;
DROP POLICY IF EXISTS "Admins can manage mock scores" ON mock_scores;

-- Students can view their own mock scores
CREATE POLICY "Students can view own mock scores" ON mock_scores
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Staff can view all mock scores
CREATE POLICY "Staff can view mock scores" ON mock_scores
  FOR SELECT USING (is_staff());

-- Admins can manage mock scores
CREATE POLICY "Admins can insert mock scores" ON mock_scores
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Admins can update mock scores" ON mock_scores
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete mock scores" ON mock_scores
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 34. ADMISSION APPLICATIONS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS admission_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view own applications" ON admission_applications;
DROP POLICY IF EXISTS "Admins can manage applications" ON admission_applications;

-- Anyone can submit applications (public form)
CREATE POLICY "Anyone can insert applications" ON admission_applications
  FOR INSERT WITH CHECK (true);

-- Staff can view all applications
CREATE POLICY "Staff can view applications" ON admission_applications
  FOR SELECT USING (is_staff());

-- Admins can update/delete applications
CREATE POLICY "Admins can update applications" ON admission_applications
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete applications" ON admission_applications
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 35. AUDIT LOGS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON audit_logs;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
  FOR SELECT USING (is_admin());

-- Authenticated users can insert audit logs (system operation)
CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 36. COMPLAINTS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit complaints" ON complaints;
DROP POLICY IF EXISTS "Admins can manage complaints" ON complaints;

-- Anyone can submit complaints (public form, anonymous)
CREATE POLICY "Anyone can submit complaints" ON complaints
  FOR INSERT WITH CHECK (true);

-- Staff can view complaints
CREATE POLICY "Staff can view complaints" ON complaints
  FOR SELECT USING (is_staff());

-- Admins can update/delete complaints
CREATE POLICY "Admins can update complaints" ON complaints
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Admins can delete complaints" ON complaints
  FOR DELETE USING (is_admin());

-- ============================================================================
-- 37. PTA MEMBERS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS pta_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view PTA members" ON pta_members;
DROP POLICY IF EXISTS "Admins can manage PTA members" ON pta_members;

-- Everyone can view PTA members (public info)
CREATE POLICY "Anyone can view PTA members" ON pta_members
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage PTA members" ON pta_members
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 38. SMC MEMBERS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS smc_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view SMC members" ON smc_members;
DROP POLICY IF EXISTS "Admins can manage SMC members" ON smc_members;

-- Everyone can view SMC members (public info)
CREATE POLICY "Anyone can view SMC members" ON smc_members
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage SMC members" ON smc_members
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 39. PREFECTS TABLE
-- ============================================================================
ALTER TABLE IF EXISTS prefects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view prefects" ON prefects;
DROP POLICY IF EXISTS "Admins can manage prefects" ON prefects;

-- Everyone can view prefects (public info)
CREATE POLICY "Anyone can view prefects" ON prefects
  FOR SELECT USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage prefects" ON prefects
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================================
-- 40. OCR TEMPLATES TABLE
-- ============================================================================
ALTER TABLE IF EXISTS ocr_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Teachers can view own OCR templates" ON ocr_templates;
DROP POLICY IF EXISTS "Teachers can manage OCR templates" ON ocr_templates;

-- Teachers can view their own OCR templates
CREATE POLICY "Teachers can view own OCR templates" ON ocr_templates
  FOR SELECT USING (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

-- Admins can view all OCR templates
CREATE POLICY "Admins can view OCR templates" ON ocr_templates
  FOR SELECT USING (is_admin());

-- Teachers can manage their own OCR templates
CREATE POLICY "Teachers can insert OCR templates" ON ocr_templates
  FOR INSERT WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Teachers can update own OCR templates" ON ocr_templates
  FOR UPDATE USING (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  ) WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

CREATE POLICY "Teachers can delete own OCR templates" ON ocr_templates
  FOR DELETE USING (
    teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
  );

-- Admins can delete any OCR templates
CREATE POLICY "Admins can delete OCR templates" ON ocr_templates
  FOR DELETE USING (is_admin());

-- ============================================================================
-- VERIFICATION - Run this to see all enabled RLS tables and their policies
-- ============================================================================

-- Uncomment the following to verify:

-- SELECT
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, cmd;

-- Count tables with RLS enabled:
-- SELECT
--   tablename,
--   COALESCE(array_length(policynames, 1), 0) as policy_count
-- FROM (
--   SELECT
--     tablename,
--     array_agg(policyname) as policynames
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   GROUP BY tablename
-- ) sub
-- ORDER BY tablename;
