-- Create teacher record for existing teacher profile
-- Run this in Supabase SQL Editor

-- Insert teacher record for teacher.test@school.local
INSERT INTO teachers (profile_id, first_name, last_name, phone, specialization, qualification, hire_date, status)
VALUES (
  '0a6c6272-9a1b-45cb-97af-c7431110ff72', -- teacher.test profile ID
  'Test',
  'Teacher',
  '+233200000000',
  'General Studies',
  'Bachelor of Education',
  '2024-01-01',
  'active'
)
ON CONFLICT (profile_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  specialization = EXCLUDED.specialization,
  qualification = EXCLUDED.qualification,
  hire_date = EXCLUDED.hire_date,
  status = EXCLUDED.status;

-- Verify the teacher was created
SELECT 
  t.teacher_id,
  t.first_name,
  t.last_name,
  t.status,
  p.username,
  p.email
FROM teachers t
JOIN profiles p ON p.id = t.profile_id
WHERE p.email = 'teacher.test@school.local';

-- Now assign the teacher to a class as class teacher
-- First, get the teacher's ID and a class ID
WITH teacher_info AS (
  SELECT id FROM teachers WHERE profile_id = '0a6c6272-9a1b-45cb-97af-c7431110ff72'
),
class_info AS (
  SELECT id FROM classes WHERE name = 'KG 1' LIMIT 1
)
INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher, academic_year)
SELECT 
  t.id::text,
  c.id,
  true,
  '2024/2025'
FROM teacher_info t, class_info c
ON CONFLICT (teacher_id, class_id, academic_year) DO UPDATE SET
  is_class_teacher = EXCLUDED.is_class_teacher;

-- Verify the assignment
SELECT 
  tca.id,
  t.first_name || ' ' || t.last_name as teacher_name,
  c.name as class_name,
  tca.is_class_teacher,
  tca.academic_year
FROM teacher_class_assignments tca
JOIN teachers t ON t.id::text = tca.teacher_id
JOIN classes c ON c.id = tca.class_id
WHERE t.profile_id = '0a6c6272-9a1b-45cb-97af-c7431110ff72';
