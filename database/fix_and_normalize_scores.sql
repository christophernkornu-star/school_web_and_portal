-- =================================================================
-- FIX & NORMALIZE SCORES (Percentage Conversion)
-- =================================================================
-- This script fixes the issue where RAW scores (e.g., 7/10) appear 
-- on report cards instead of the weighted percentage (e.g., 70% of 30).
--
-- Logic:
-- 1. Fetch Class/Exam Percentages from System Settings (default 40/60? or 50/50?).
-- 2. Sum up (Score Obtained) and (Max Score Possible) for each student/subject.
-- 3. Calculate: (Obtained / Max) * Setting_Percentage.
-- =================================================================

DO $$
DECLARE
    active_term_id UUID;
    
    -- Config Variables
    v_class_pct DECIMAL;
    v_exam_pct DECIMAL;
    
    updated_count INT;
BEGIN
    -- 1. Get Current Term
    SELECT id INTO active_term_id FROM academic_terms WHERE is_current = true LIMIT 1;
    
    -- 2. Get Settings (Handle text/number storage safely)
    -- We assume keys: 'class_score_percentage' and 'exam_score_percentage'
    SELECT CAST(setting_value AS DECIMAL) INTO v_class_pct 
    FROM system_settings WHERE setting_key = 'class_score_percentage';

    SELECT CAST(setting_value AS DECIMAL) INTO v_exam_pct 
    FROM system_settings WHERE setting_key = 'exam_score_percentage';

    -- Defaults if missing
    IF v_class_pct IS NULL THEN v_class_pct := 50; END IF;
    IF v_exam_pct IS NULL THEN v_exam_pct := 50; END IF;

    RAISE NOTICE 'Normalizing Scores for Term: %', active_term_id;
    RAISE NOTICE 'Using Weights -> Class: % %, Exam: % %', v_class_pct, '%', v_exam_pct, '%';

    -- 3. Perform the Normalization Update
    WITH normalized_data AS (
        SELECT 
            ss.student_id,
            cs.subject_id,
            
            -- CLASS SCORE CALCULATION
            -- Sum(Score) / Sum(Max) * Weight
            CASE 
                WHEN SUM(CASE WHEN a.assessment_type != 'exam' THEN a.max_score ELSE 0 END) > 0 THEN
                    (
                        SUM(CASE WHEN a.assessment_type != 'exam' THEN ss.score ELSE 0 END) 
                        / 
                        SUM(CASE WHEN a.assessment_type != 'exam' THEN a.max_score ELSE 0 END)
                    ) * v_class_pct
                ELSE 0 
            END as final_class_score,
            
            -- EXAM SCORE CALCULATION
            CASE 
                WHEN SUM(CASE WHEN a.assessment_type = 'exam' THEN a.max_score ELSE 0 END) > 0 THEN
                    (
                        SUM(CASE WHEN a.assessment_type = 'exam' THEN ss.score ELSE 0 END) 
                        / 
                        SUM(CASE WHEN a.assessment_type = 'exam' THEN a.max_score ELSE 0 END)
                    ) * v_exam_pct
                ELSE 0 
            END as final_exam_score

        FROM student_scores ss
        JOIN assessments a ON ss.assessment_id = a.id
        JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE a.term_id = active_term_id
        GROUP BY ss.student_id, cs.subject_id
    )
    UPDATE scores s
    SET 
        class_score = ROUND(n.final_class_score, 2),
        exam_score = ROUND(n.final_exam_score, 2),
        total = ROUND(n.final_class_score + n.final_exam_score, 2),
        updated_at = NOW() -- This will Trigger the 'trigger_auto_calculate_remarks' we built earlier!
    FROM normalized_data n
    WHERE s.student_id = n.student_id 
    AND s.subject_id = n.subject_id
    AND s.term_id = active_term_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Normalized % score entries.', updated_count;
    
    RAISE NOTICE 'DONE. Scores are now percentages, not raw totals.';

END $$;
