-- Complete School Structure Setup
-- Handles: Lower Primary (1 teacher all subjects), Upper Primary (flexible), JHS (multiple teachers)
-- NOTE: Run add-level-columns.sql BEFORE running this file

-- ============================================
-- 1. UPDATE CLASS LEVELS
-- ============================================

-- Update existing classes with their levels
-- Lower Primary: Primary 1, 2, 3
UPDATE classes SET level = 'lower_primary' WHERE name LIKE 'Primary 1%' OR name LIKE 'Primary 2%' OR name LIKE 'Primary 3%';

-- Upper Primary: Primary 4, 5, 6
UPDATE classes SET level = 'upper_primary' WHERE name LIKE 'Primary 4%' OR name LIKE 'Primary 5%' OR name LIKE 'Primary 6%';

-- JHS: JHS 1, 2, 3
UPDATE classes SET level = 'jhs' WHERE name LIKE 'JHS%';

-- ============================================
-- 2. CREATE/UPDATE SUBJECTS FOR EACH LEVEL
-- ============================================

-- Lower Primary Subjects (8 subjects)
INSERT INTO subjects (name, code, level) VALUES
('Mathematics (LP)', 'MATH_LP', 'lower_primary'),
('English Language (LP)', 'ENG_LP', 'lower_primary'),
('History (LP)', 'HIST_LP', 'lower_primary'),
('RME (LP)', 'RME_LP', 'lower_primary'),
('Ghanaian Language (LP)', 'GH_LANG_LP', 'lower_primary'),
('Creative Arts (LP)', 'ARTS_LP', 'lower_primary'),
('Computing (LP)', 'COMP_LP', 'lower_primary'),
('Science (LP)', 'SCI_LP', 'lower_primary')
ON CONFLICT (code) DO UPDATE SET level = EXCLUDED.level;

-- Upper Primary Subjects (same 8 subjects but different codes)
INSERT INTO subjects (name, code, level) VALUES
('Mathematics (UP)', 'MATH_UP', 'upper_primary'),
('English Language (UP)', 'ENG_UP', 'upper_primary'),
('History (UP)', 'HIST_UP', 'upper_primary'),
('RME (UP)', 'RME_UP', 'upper_primary'),
('Ghanaian Language (UP)', 'GH_LANG_UP', 'upper_primary'),
('Creative Arts (UP)', 'ARTS_UP', 'upper_primary'),
('Computing (UP)', 'COMP_UP', 'upper_primary'),
('Science (UP)', 'SCI_UP', 'upper_primary')
ON CONFLICT (code) DO UPDATE SET level = EXCLUDED.level;

-- JHS Subjects (9 subjects)
INSERT INTO subjects (name, code, level) VALUES
('English Language (JHS)', 'ENG_JHS', 'jhs'),
('Mathematics (JHS)', 'MATH_JHS', 'jhs'),
('Social Studies', 'SOC_JHS', 'jhs'),
('Ghanaian Language (JHS)', 'GH_LANG_JHS', 'jhs'),
('Computing (JHS)', 'COMP_JHS', 'jhs'),
('Career Technology', 'CAREER_JHS', 'jhs'),
('RME (JHS)', 'RME_JHS', 'jhs'),
('Integrated Science', 'SCI_JHS', 'jhs'),
('Creative Arts (JHS)', 'ARTS_JHS', 'jhs')
ON CONFLICT (code) DO UPDATE SET level = EXCLUDED.level;

-- ============================================
-- 3. ADD CLASS TEACHER DESIGNATION
-- ============================================

-- The teacher_class_assignments table already has is_class_teacher column
-- This marks which teacher handles attendance for each class

-- ============================================
-- 4. VIEW CURRENT STRUCTURE
-- ============================================

-- View all classes with their levels
SELECT 
  id,
  name as class_name,
  level,
  CASE 
    WHEN level = 'lower_primary' THEN '1 Teacher (All Subjects)'
    WHEN level = 'upper_primary' THEN 'Flexible (1 or Multiple Teachers)'
    WHEN level = 'jhs' THEN 'Multiple Teachers (1 Class Teacher for attendance)'
    ELSE 'Not Set'
  END as teaching_model
FROM classes
ORDER BY name;

-- View all subjects by level
SELECT 
  level,
  COUNT(*) as subject_count,
  STRING_AGG(name, ', ') as subjects
FROM subjects
GROUP BY level
ORDER BY 
  CASE 
    WHEN level = 'lower_primary' THEN 1
    WHEN level = 'upper_primary' THEN 2
    WHEN level = 'jhs' THEN 3
  END;

-- ============================================
-- 5. EXAMPLE: ASSIGN TEACHERS TO CLASSES
-- ============================================

-- Example 1: Lower Primary (1 teacher for ALL subjects in Primary 1)
-- Run after creating teachers:
/*
-- Get teacher ID
SELECT teacher_id, first_name, last_name FROM teachers WHERE teacher_id = 'TCH0001';

-- Get class ID for Primary 1
SELECT id, name as class_name FROM classes WHERE name = 'Primary 1';

-- Assign as class teacher
INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher, academic_year)
VALUES ('TCH0001', 'primary-1-uuid-here', true, '2024/2025');

-- Assign to ALL Lower Primary subjects for that class
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
SELECT 
  'TCH0001' as teacher_id,
  s.id as subject_id,
  'primary-1-uuid-here' as class_id,
  '2024/2025' as academic_year
FROM subjects s
WHERE s.level = 'lower_primary';
*/

-- Example 2: JHS (Multiple teachers, one is class teacher)
/*
-- Math teacher for JHS 1 (NOT class teacher)
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
VALUES ('TCH0002', (SELECT id FROM subjects WHERE code = 'MATH_JHS'), 'jhs-1-uuid', '2024/2025');

-- English teacher for JHS 1 (IS class teacher - handles attendance)
INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher, academic_year)
VALUES ('TCH0003', 'jhs-1-uuid', true, '2024/2025');

INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
VALUES ('TCH0003', (SELECT id FROM subjects WHERE code = 'ENG_JHS'), 'jhs-1-uuid', '2024/2025');
*/

-- Example 3: Upper Primary (Flexible - can be like Lower Primary OR JHS)
-- Option A: One teacher for all subjects (like Lower Primary)
-- Option B: Multiple teachers (like JHS)

-- ============================================
-- 6. HELPER QUERIES
-- ============================================

-- Get class teacher for each class
SELECT 
  c.name as class_name,
  c.level,
  t.first_name || ' ' || t.last_name as class_teacher,
  t.teacher_id
FROM classes c
LEFT JOIN teacher_class_assignments tca ON tca.class_id = c.id AND tca.is_class_teacher = true
LEFT JOIN teachers t ON t.teacher_id = tca.teacher_id
ORDER BY c.name;

-- Get all subject teachers for a class
SELECT 
  c.name as class_name,
  s.name as subject_name,
  t.first_name || ' ' || t.last_name as teacher_name,
  t.teacher_id,
  CASE WHEN tca.is_class_teacher = true THEN '✅ Class Teacher' ELSE '' END as class_teacher_status
FROM teacher_subject_assignments tsa
JOIN classes c ON c.id = tsa.class_id
JOIN subjects s ON s.id = tsa.subject_id
JOIN teachers t ON t.teacher_id = tsa.teacher_id
LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = t.teacher_id AND tca.class_id = c.id
WHERE c.name = 'JHS 1'  -- Change this to any class
ORDER BY s.name;

-- Count teachers per class
SELECT 
  c.name as class_name,
  c.level,
  COUNT(DISTINCT tsa.teacher_id) as num_subject_teachers,
  COUNT(DISTINCT CASE WHEN tca.is_class_teacher THEN tca.teacher_id END) as num_class_teachers
FROM classes c
LEFT JOIN teacher_subject_assignments tsa ON tsa.class_id = c.id
LEFT JOIN teacher_class_assignments tca ON tca.class_id = c.id AND tca.is_class_teacher = true
GROUP BY c.id, c.name, c.level
ORDER BY c.name;
