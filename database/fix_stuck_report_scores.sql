-- =================================================================
-- FIX STUCK REPORT CARD SCORES (RECALCULATE FROM ASSESSMENTS)
-- =================================================================
-- This script fixes the issue where "Deleted Assessments" still show 
-- up as scores on the Report Card.
-- It works by recalculating the 'scores' summary table strictly from 
-- the actual existing 'assessments' and 'student_scores'.
-- If an assessment was deleted, its contribution drops to 0.
-- =================================================================

DO $$
DECLARE
    term_id UUID;
    updated_count INT;
    deleted_count INT;
BEGIN
    SELECT id INTO term_id FROM academic_terms WHERE is_current = true LIMIT 1;
    
    RAISE NOTICE 'Recalculating scores for current term...';

    -- 1. Recalculate Class and Exam scores based on EXISTING Assessments
    --    If an assessment was deleted, the SUM will return NULL (converted to 0).
    WITH calculated_scores AS (
        SELECT 
            s.id as score_id,
            s.student_id,
            s.subject_id,
            -- Sum of Class Work (All non-exam types)
            COALESCE((
                SELECT SUM(ss.score)
                FROM student_scores ss
                JOIN assessments a ON ss.assessment_id = a.id
                JOIN class_subjects cs ON a.class_subject_id = cs.id
                WHERE ss.student_id = s.student_id
                AND a.term_id = term_id
                AND cs.subject_id = s.subject_id
                AND a.assessment_type != 'exam'
            ), 0) as new_class_score,
            
            -- Sum of Exam
            COALESCE((
                SELECT SUM(ss.score)
                FROM student_scores ss
                JOIN assessments a ON ss.assessment_id = a.id
                JOIN class_subjects cs ON a.class_subject_id = cs.id
                WHERE ss.student_id = s.student_id
                AND a.term_id = term_id
                AND cs.subject_id = s.subject_id
                AND a.assessment_type = 'exam'
            ), 0) as new_exam_score
        FROM scores s
        WHERE s.term_id = term_id
    )
    UPDATE scores s
    SET 
        class_score = c.new_class_score,
        exam_score = c.new_exam_score,
        total = c.new_class_score + c.new_exam_score,
        
        -- Auto-update Grading/Remarks based on new total (Generic Scale)
        -- (Specific primary scale will be applied by the other script, but let's do a basic sync here)
        updated_at = NOW()
    FROM calculated_scores c
    WHERE s.id = c.score_id
    AND (s.class_score != c.new_class_score OR s.exam_score != c.new_exam_score);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Recalculated % score entries.', updated_count;

    -- 2. Cleanup "Ghost Rows" (Score entries where NO assessments exist at all)
    --    If both sums are 0, and NO assessments exist, delete the row.
    --    (We check strictly for NO assessments to avoid deleting legitimate 0 scores)
    
    WITH ghost_rows AS (
        SELECT s.id
        FROM scores s
        LEFT JOIN (
            SELECT a.term_id, cs.subject_id, cs.class_id
            FROM assessments a
            JOIN class_subjects cs ON a.class_subject_id = cs.id
        ) valid_assess 
        ON s.term_id = valid_assess.term_id 
        AND s.subject_id = valid_assess.subject_id
        AND s.student_id IN (SELECT id FROM students WHERE class_id = valid_assess.class_id)
        
        WHERE s.term_id = term_id 
        AND valid_assess.term_id IS NULL
    )
    DELETE FROM scores
    WHERE id IN (SELECT id FROM ghost_rows);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % empty ghost score rows.', deleted_count;

END $$;
