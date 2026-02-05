-- COMPREHENSIVE DEBUGGING SCRIPT
-- Run this in Supabase SQL Editor to see the full picture.

SELECT '--- ACADEMIC TERMS ---' as section;
SELECT id, name, academic_year, is_current, start_date, end_date 
FROM academic_terms 
ORDER BY start_date DESC;

SELECT '--- CLASS SUBJECTS (Basic 5 Computing) ---' as section;
SELECT cs.id, cs.academic_year, cs.created_at
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE c.name ILIKE '%Basic 5%' AND s.name = 'Computing';

SELECT '--- ASSESSMENTS (Basic 5 Computing) ---' as section;
SELECT 
    a.id, 
    a.title, 
    a.term_id, 
    at.name as term_name,
    at.is_current as term_is_current,
    a.class_subject_id,
    a.created_at
FROM assessments a
JOIN academic_terms at ON a.term_id = at.id
WHERE a.class_subject_id IN (
    SELECT cs.id 
    FROM class_subjects cs
    JOIN classes c ON cs.class_id = c.id
    JOIN subjects s ON cs.subject_id = s.id
    WHERE c.name ILIKE '%Basic 5%' AND s.name = 'Computing'
);
