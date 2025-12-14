-- Add Basic 9 class and show teacher assignments

-- Step 1: Add Basic 9 class if it doesn't exist
INSERT INTO classes (name, level, level_old, category, description) 
VALUES ('Basic 9', 'JHS 3', 11, 'Junior High', 'Third year of Junior High School (Basic 9)')
ON CONFLICT DO NOTHING;

-- Step 2: Update constraint to include Basic 9
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;
ALTER TABLE classes ADD CONSTRAINT classes_level_check 
CHECK (level IN (
  'Basic 1', 'Basic 2', 'Basic 3',
  'Basic 4', 'Basic 5', 'Basic 6', 
  'Basic 7', 'Basic 8', 'Basic 9',
  'JHS 1', 'JHS 2', 'JHS 3',
  'KG 1', 'KG 2',
  'lower_primary', 'upper_primary', 'jhs'
));

-- Step 3: Map Basic 9 to JHS 3
UPDATE classes SET level = 'JHS 3' WHERE name = 'Basic 9';

-- Step 4: Verify all classes
SELECT 
  id, 
  name, 
  level,
  CASE 
    WHEN level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'Lower Primary (1 class teacher, all subjects)'
    WHEN level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN 'Upper Primary (configurable)'
    WHEN level IN ('Basic 7', 'Basic 8', 'Basic 9', 'JHS 1', 'JHS 2', 'JHS 3') THEN 'JHS (subject teachers + 1 class teacher)'
    ELSE 'Other'
  END as teaching_model
FROM classes 
ORDER BY 
  CASE 
    WHEN name LIKE 'KG%' THEN 1
    WHEN name LIKE 'Basic%' THEN 2
    WHEN name LIKE 'JHS%' THEN 3
    ELSE 4
  END,
  name;

-- Step 5: Create view to see teacher assignments by class
CREATE OR REPLACE VIEW teacher_assignments_by_class AS
SELECT 
  c.name as class_name,
  c.level as class_level,
  t.first_name || ' ' || t.last_name as teacher_name,
  t.teacher_id,
  tca.is_class_teacher,
  CASE 
    WHEN tca.is_class_teacher THEN 'Class Teacher'
    ELSE 'Subject Teacher'
  END as teacher_role,
  COUNT(DISTINCT tsa.subject_id) as subjects_count,
  STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) as subjects
FROM classes c
LEFT JOIN teacher_class_assignments tca ON c.id = tca.class_id
LEFT JOIN teachers t ON tca.teacher_id = t.id
LEFT JOIN teacher_subject_assignments tsa ON t.id = tsa.teacher_id AND c.id = tsa.class_id
LEFT JOIN subjects s ON tsa.subject_id = s.id
GROUP BY c.id, c.name, c.level, t.id, t.first_name, t.last_name, t.teacher_id, tca.is_class_teacher
ORDER BY c.name, tca.is_class_teacher DESC;

-- Step 6: Query to show teacher assignments
SELECT * FROM teacher_assignments_by_class;

-- Step 7: Summary by teaching model
SELECT 
  CASE 
    WHEN class_level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'Lower Primary'
    WHEN class_level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN 'Upper Primary'
    WHEN class_level IN ('Basic 7', 'Basic 8', 'Basic 9', 'JHS 1', 'JHS 2', 'JHS 3') THEN 'JHS'
    ELSE 'Other'
  END as section,
  COUNT(DISTINCT class_name) as total_classes,
  COUNT(DISTINCT teacher_id) as total_teachers,
  SUM(CASE WHEN is_class_teacher THEN 1 ELSE 0 END) as class_teachers
FROM teacher_assignments_by_class
GROUP BY 
  CASE 
    WHEN class_level IN ('Basic 1', 'Basic 2', 'Basic 3') THEN 'Lower Primary'
    WHEN class_level IN ('Basic 4', 'Basic 5', 'Basic 6') THEN 'Upper Primary'
    WHEN class_level IN ('Basic 7', 'Basic 8', 'Basic 9', 'JHS 1', 'JHS 2', 'JHS 3') THEN 'JHS'
    ELSE 'Other'
  END;
