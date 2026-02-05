-- =================================================================
-- CLEANUP: REMOVE SCORES WITHOUT ASSESSMENTS
-- =================================================================
-- This script enforces consistency:
-- If an Assessment does not exist (was deleted), its Scores should 
-- not be on the Report Card.
-- =================================================================

DO $$
DECLARE
    deleted_count INT;
BEGIN
    RAISE NOTICE 'Starting Ghost Score Cleanup...';

    -- Delete scores where the assessment_id no longer exists
    -- AND the source of the score (student_scores) no longer exists
    -- This handles the case where the parent Assessment was deleted.
    
    -- 1. Identify Scores in the Summary Table that have no matching Assessment Data
    --    This is complex because 'scores' table aggregates Class + Exam.
    --    We need to check if EITHER exists.
    
    -- Logic: If we have a Score entry for Subject X, Term Y...
    -- But there are NO assessments for Subject X, Term Y...
    -- Then that Score entry is a "Ghost" and must be removed.
    
    WITH ghost_scores AS (
        SELECT s.id
        FROM scores s
        -- Join to find valid assessments for this Subject + Term
        LEFT JOIN (
            SELECT a.term_id, cs.subject_id, cs.class_id
            FROM assessments a
            JOIN class_subjects cs ON a.class_subject_id = cs.id
        ) valid_assess 
        ON s.term_id = valid_assess.term_id 
        AND s.subject_id = valid_assess.subject_id
        AND s.student_id IN (SELECT id FROM students WHERE class_id = valid_assess.class_id)
        
        WHERE valid_assess.term_id IS NULL
    )
    DELETE FROM scores
    WHERE id IN (SELECT id FROM ghost_scores);
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % ghost score entries.', deleted_count;
    
END $$;
