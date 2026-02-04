-- Enable access for students to view their assessments

-- 1. Allow authenticated users (students) to view class_subjects
-- This is needed because students query assessments by joining class_subjects
DROP POLICY IF EXISTS "Authenticated users can view class_subjects" ON class_subjects;
CREATE POLICY "Authenticated users can view class_subjects" ON class_subjects
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 2. Allow authenticated users (students) to view assessments
-- This is needed for students to see the list of assessments
DROP POLICY IF EXISTS "Authenticated users can view assessments" ON assessments;
CREATE POLICY "Authenticated users can view assessments" ON assessments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Safety check for subjects (though usually public)
DO $$ 
BEGIN
  IF EXISTS (
      SELECT 1 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'subjects' 
      AND rowsecurity = true
  ) THEN
      DROP POLICY IF EXISTS "Authenticated users can view subjects" ON subjects;
      CREATE POLICY "Authenticated users can view subjects" ON subjects
        FOR SELECT
        USING (auth.role() = 'authenticated');
  END IF;
END $$;
