-- SIMPLE DIAGNOSTIC QUERIES
-- Run these one by one or all together to see the data.

-- 1. Check what the system thinks is the "Active Term"
SELECT id, name, academic_year, is_current 
FROM academic_terms 
WHERE is_current = true;

-- 2. Check the "Computing" subject for Upper Primary
SELECT id, name, level FROM subjects WHERE name = 'Computing' AND level = 'upper_primary';

-- 3. Check "Class Subject" links for Basic 5 + Computing
-- (Do we have duplicates? Do keys match?)
SELECT cs.id, cs.academic_year, c.name as class_name, s.name as subject_name
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE c.name ILIKE '%Basic 5%' 
  AND s.name = 'Computing';

-- 4. Check ASSESSMENTS for those links
-- IMPORTANT: Look at the 'term_id'. Does it match the Active Term ID from Query #1?
SELECT 
    a.id, 
    a.title, 
    a.term_id, 
    t.name as term_name, 
    a.created_at
FROM assessments a
JOIN academic_terms t ON a.term_id = t.id
WHERE a.class_subject_id IN (
    SELECT cs.id 
    FROM class_subjects cs
    JOIN classes c ON cs.class_id = c.id
    JOIN subjects s ON cs.subject_id = s.id
    WHERE c.name ILIKE '%Basic 5%' 
      AND s.name = 'Computing'
);
