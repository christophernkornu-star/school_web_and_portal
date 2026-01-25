-- Fix duplicates in student_quiz_attempts
-- Strategy: Identify duplicates (same student, same quiz)
-- Keep the 'best' attempt (Graded > Submitted > In Progress (Latest))

BEGIN;

-- 1. Create a temporary table to store IDs to KEEP
CREATE TEMP TABLE items_to_keep AS
SELECT DISTINCT ON (student_id, quiz_id) id
FROM student_quiz_attempts
ORDER BY 
    student_id, 
    quiz_id, 
    -- Preference order:
    CASE status 
        WHEN 'graded' THEN 1 
        WHEN 'submitted' THEN 2 
        WHEN 'in_progress' THEN 3 
        ELSE 4 
    END ASC,
    -- Tie breaker: Latest start time
    start_time DESC;

-- 2. Delete attempts NOT in the keep list
DELETE FROM student_quiz_attempts
WHERE id NOT IN (SELECT id FROM items_to_keep);

-- 3. Add Unique Constraint to prevent future duplicates
ALTER TABLE student_quiz_attempts
ADD CONSTRAINT unique_student_quiz_attempt UNIQUE (student_id, quiz_id);

COMMIT;
