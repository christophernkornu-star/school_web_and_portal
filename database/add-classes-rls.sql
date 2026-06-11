-- Enable RLS and create class-level row security policies for classes
-- Students can view the class they are assigned to
-- Teachers can manage classes they are assigned to via teacher_class_assignments
-- Admins can view, insert, update, and delete all classes

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own class" ON classes;
DROP POLICY IF EXISTS "Teachers can view assigned classes" ON classes;
DROP POLICY IF EXISTS "Teachers can update assigned classes" ON classes;
DROP POLICY IF EXISTS "Teachers can delete assigned classes" ON classes;
DROP POLICY IF EXISTS "Teachers can insert classes" ON classes;
DROP POLICY IF EXISTS "Admins can manage classes" ON classes;

-- Students can read the class they are assigned to
CREATE POLICY "Students can view own class"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM students s
    WHERE s.class_id = classes.id
      AND s.profile_id = auth.uid()
  )
);

-- Teachers can read classes they are assigned to
CREATE POLICY "Teachers can view assigned classes"
ON classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teachers t
    JOIN teacher_class_assignments tca ON tca.teacher_id = t.id::text
    WHERE t.profile_id = auth.uid()
      AND tca.class_id = classes.id
  )
);

-- Teachers can update classes they are assigned to
CREATE POLICY "Teachers can update assigned classes"
ON classes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teachers t
    JOIN teacher_class_assignments tca ON tca.teacher_id = t.id::text
    WHERE t.profile_id = auth.uid()
      AND tca.class_id = classes.id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM teachers t
    JOIN teacher_class_assignments tca ON tca.teacher_id = t.id::text
    WHERE t.profile_id = auth.uid()
      AND tca.class_id = NEW.id
  )
);

-- Teachers can delete classes they are assigned to
CREATE POLICY "Teachers can delete assigned classes"
ON classes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM teachers t
    JOIN teacher_class_assignments tca ON tca.teacher_id = t.id::text
    WHERE t.profile_id = auth.uid()
      AND tca.class_id = classes.id
  )
);

-- Teachers can insert classes if they are a teacher user
CREATE POLICY "Teachers can insert classes"
ON classes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'teacher'
  )
);

-- Admins can do anything with classes
CREATE POLICY "Admins can manage classes"
ON classes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
);

-- Verify the policies were created
SELECT 'classes table RLS policies' as check_name,
       COUNT(*)::text || ' policies created' as status
FROM pg_policies
WHERE tablename = 'classes';
