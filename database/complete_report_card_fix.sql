-- =================================================================
-- COMPLETE REPORT CARD FIX (STUCK SCORES + GHOSTS + REMARKS)
-- =================================================================
-- This master script resolves three common issues:
-- 1. "Stuck Scores": Scores remaining on Report Card after Class Assessment is deleted.
-- 2. "Ghost Rows": Subjects appearing on Report Card when they have been fully deleted.
-- 3. "Missing Remarks": Primary Level scores having empty/null remarks.
-- =================================================================

DO $$
DECLARE
    active_term_id UUID;
    recalc_count INT;
    deleted_count INT;
    remark_count INT;
BEGIN
    -- 1. Get Current Term
    SELECT id INTO active_term_id FROM academic_terms WHERE is_current = true LIMIT 1;
    RAISE NOTICE 'Running fixes for Term ID: %', active_term_id;

    -- =================================================================
    -- PART 1: RECALCULATE SCORES FROM ASSESSMENTS (Fixes "Stuck Scores")
    -- =================================================================
    RAISE NOTICE '1. Recalculating scores based on existing assessments...';
    
    WITH calculated_scores AS (
        SELECT 
            s.id as score_id,
            s.student_id,
            s.subject_id,
            COALESCE((
                SELECT SUM(ss.score)
                FROM student_scores ss
                JOIN assessments a ON ss.assessment_id = a.id
                JOIN class_subjects cs ON a.class_subject_id = cs.id
                WHERE ss.student_id = s.student_id
                AND a.term_id = active_term_id
                AND cs.subject_id = s.subject_id
                AND a.assessment_type != 'exam'
            ), 0) as new_class_score,
            COALESCE((
                SELECT SUM(ss.score)
                FROM student_scores ss
                JOIN assessments a ON ss.assessment_id = a.id
                JOIN class_subjects cs ON a.class_subject_id = cs.id
                WHERE ss.student_id = s.student_id
                AND a.term_id = active_term_id
                AND cs.subject_id = s.subject_id
                AND a.assessment_type = 'exam'
            ), 0) as new_exam_score
        FROM scores s
        WHERE s.term_id = active_term_id
    )
    UPDATE scores s
    SET 
        class_score = c.new_class_score,
        exam_score = c.new_exam_score,
        total = c.new_class_score + c.new_exam_score,
        updated_at = NOW()
    FROM calculated_scores c
    WHERE s.id = c.score_id
    AND (s.class_score != c.new_class_score OR s.exam_score != c.new_exam_score);

    GET DIAGNOSTICS recalc_count = ROW_COUNT;
    RAISE NOTICE '   - Recalculated % score entries.', recalc_count;


    -- =================================================================
    -- PART 2: CLEANUP GHOST ROWS (Fixes "Visible but Deleted")
    -- =================================================================
    RAISE NOTICE '2. Cleaning up ghost rows (Rows with 0 score and NO assessments)...';

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
        
        WHERE s.term_id = active_term_id 
        AND valid_assess.term_id IS NULL
    )
    DELETE FROM scores
    WHERE id IN (SELECT id FROM ghost_rows);

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '   - Deleted % ghost score rows.', deleted_count;


    -- =================================================================
    -- PART 3: UPDATE REMARKS FOR UPPER PRIMARY (Fixes "Empty Remarks")
    -- =================================================================
    RAISE NOTICE '3. Updating Proficiency Remarks for Upper Primary...';

    WITH target_scores AS (
        SELECT s.id, s.total
        FROM scores s
        JOIN students stu ON s.student_id = stu.id
        JOIN classes c ON stu.class_id = c.id
        WHERE s.term_id = active_term_id
        AND (
               c.level = 'upper_primary' 
            OR c.name ILIKE 'Basic 4%' 
            OR c.name ILIKE 'Basic 5%' 
            OR c.name ILIKE 'Basic 6%'
            OR c.name ILIKE 'Primary%'
        )
    )
    UPDATE scores
    SET 
        grade = CASE 
            WHEN total >= 80 THEN '1'
            WHEN total >= 70 THEN '2'
            WHEN total >= 60 THEN '3' 
            WHEN total >= 55 THEN '4'
            WHEN total >= 50 THEN '5'
            WHEN total >= 45 THEN '6'
            WHEN total >= 40 THEN '7'
            WHEN total >= 35 THEN '8'
            ELSE '9'
        END,
        remarks = CASE 
            WHEN total >= 80 THEN 'High Proficiency'
            WHEN total >= 75 THEN 'Proficient'
            WHEN total >= 60 THEN 'Proficiency'
            WHEN total >= 50 THEN 'Approaching Proficiency'
            WHEN total >= 40 THEN 'Developing'
            ELSE 'Emerging'
        END,
        updated_at = NOW()
    WHERE id IN (SELECT id FROM target_scores);

    GET DIAGNOSTICS remark_count = ROW_COUNT;
    RAISE NOTICE '   - Updated remarks for % entries.', remark_count;
    
    RAISE NOTICE 'DONE. Report Cards should now be clean and accurate.';

END $$;
