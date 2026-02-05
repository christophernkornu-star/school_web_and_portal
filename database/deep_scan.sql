-- =================================================================
-- DEEP SCAN: SYSTEM INTEGRITY CHECK (Assessment & Linkage Health)
-- =================================================================
-- This script checks for potential future issues:
-- 1. Duplicate Class-Subject Links (causes invisible assessments)
-- 2. Stale/Deleted References (causes crashes)
-- 3. Inconsistent Term/Year Data (causes invisible assessments)
-- 4. Missing Teacher assignments (causes permission errors)

SELECT '--- 1. CHECK FOR DUPLICATE CLASS-SUBJECT LINKS ---' as check_name;
-- A "duplicate" is defined as multiple links for the same (class, subject) pair.
-- Ideally, there should only be one active link per academic year, 
-- but our system logic often assumes just one per class/subject globally for current ops.
SELECT 
    c.name as class_name, 
    s.name as subject_name, 
    COUNT(*) as link_count,
    array_agg(cs.academic_year) as years
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
GROUP BY c.name, s.name
HAVING COUNT(*) > 1;


SELECT '--- 2. CHECK FOR ORPHANED ASSESSMENTS ---' as check_name;
-- Assessments linked to class_subjects that don't exist anymore 
-- (This shouldn't happen due to FK constraints, but good to verify).
SELECT COUNT(*) as orphaned_assessments
FROM assessments a
LEFT JOIN class_subjects cs ON a.class_subject_id = cs.id
WHERE cs.id IS NULL;


SELECT '--- 3. CHECK FOR ORPHANED SCORES (Report Card Ghost Data) ---' as check_name;
-- Scores in the report card table that correspond to Deleted Students
SELECT COUNT(*) as scores_for_deleted_students
FROM scores s
LEFT JOIN students stu ON s.student_id = stu.id
WHERE stu.id IS NULL;

-- Scores for Subjects that don't exist
SELECT COUNT(*) as scores_for_deleted_subjects
FROM scores s
LEFT JOIN subjects sub ON s.subject_id = sub.id
WHERE sub.id IS NULL;


SELECT '--- 4. TERM MISMATCH CHECK ---' as check_name;
-- Assessments created in the "Current Term" but linked to "Old Years" in class_subjects
-- This detects the exact bug we just fought.
SELECT 
    a.title, 
    at.name as term_name, 
    at.academic_year as term_year,
    cs.academic_year as link_year,
    c.name as class_name,
    s.name as subject_name
FROM assessments a
JOIN academic_terms at ON a.term_id = at.id
JOIN class_subjects cs ON a.class_subject_id = cs.id
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE at.is_current = true
  AND cs.academic_year != at.academic_year
LIMIT 20;


SELECT '--- 5. MISSING TEACHER ASSIGNMENTS ---' as check_name;
-- Classes that have subjects, but no teacher assigned to view/grade them.
-- (Returns count of unassigned subjects per class)
SELECT 
    c.name as class_name, 
    COUNT(cs.id) as subjects_without_teacher
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
LEFT JOIN teacher_subject_assignments tsa 
    ON tsa.class_id = cs.class_id 
    AND tsa.subject_id = cs.subject_id
WHERE tsa.id IS NULL
GROUP BY c.name
HAVING COUNT(cs.id) > 0
ORDER BY subjects_without_teacher DESC;
