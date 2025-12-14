-- Disable RLS on teacher assignment tables temporarily

ALTER TABLE teacher_class_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_assignments DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('teacher_class_assignments', 'teacher_subject_assignments');
