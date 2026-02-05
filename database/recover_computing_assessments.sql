-- =================================================================
-- RECOVER MISSING ASSESSMENTS FROM REPORT CARD SCORES
-- =================================================================
-- It appears the original raw assessment records were deleted during the 
-- duplicate cleanup (due to database cascading), but the Report Card 
-- scores (Class Score + Exam Score) are safe.
--
-- This script will:
-- 1. Check if 'Computing' assessments are missing for Basic 5.
-- 2. If missing, it will use the saved Report Card scores to RE-CREATE
--    them so they show up in 'Review Assessments'.

DO $$
DECLARE
    basic5_id UUID;
    comp_id UUID;
    active_term_id UUID;
    target_cs_id UUID;
    
    assess_count INT;
    score_rec RECORD;
    
    cw_assess_id UUID;
    exam_assess_id UUID;
    
    recovered_count INT := 0;
BEGIN
    RAISE NOTICE 'Starting Recovery...';

    -- 1. IDs
    SELECT id INTO basic5_id FROM classes WHERE name ILIKE '%Basic 5%' LIMIT 1;
    SELECT id INTO comp_id FROM subjects WHERE name = 'Computing' AND level = 'upper_primary' LIMIT 1;
    SELECT id INTO active_term_id FROM academic_terms WHERE is_current = true LIMIT 1;

    -- 2. Ensure Class Subject Link Exists (The 2026 one)
    SELECT id INTO target_cs_id
    FROM class_subjects 
    WHERE class_id = basic5_id AND subject_id = comp_id
    ORDER BY created_at DESC LIMIT 1;

    IF target_cs_id IS NULL THEN
        RAISE EXCEPTION 'No Class Subject found for Basic 5 Computing. Cannot recover.';
    END IF;

    -- 3. Check if Assessments already exist
    SELECT COUNT(*) INTO assess_count 
    FROM assessments 
    WHERE class_subject_id = target_cs_id AND term_id = active_term_id;

    IF assess_count > 0 THEN
        RAISE NOTICE 'Assessments already exist (% found). Skipping recovery to avoid duplicates.', assess_count;
        RETURN;
    END IF;

    RAISE NOTICE 'No assessments found. Attempting to recover from Report Card Scores...';

    -- 4. Create Placeholder Assessments
    
    -- Class Work (40%)
    INSERT INTO assessments (class_subject_id, term_id, title, max_score, weight, assessment_type, assessment_date)
    VALUES (target_cs_id, active_term_id, 'Recovered Class Work', 40, 40, 'class_work', CURRENT_DATE)
    RETURNING id INTO cw_assess_id;
    
    -- Exam (60%)
    INSERT INTO assessments (class_subject_id, term_id, title, max_score, weight, assessment_type, assessment_date)
    VALUES (target_cs_id, active_term_id, 'Recovered Exam', 60, 60, 'exam', CURRENT_DATE)
    RETURNING id INTO exam_assess_id;

    RAISE NOTICE 'Created container assessments. Populating scores...';

    -- 5. Loop through Scores and Populate
    FOR score_rec IN 
        SELECT student_id, class_score, exam_score 
        FROM scores 
        WHERE subject_id = comp_id 
        AND term_id = active_term_id -- Ensure we pull from the current term
        AND student_id IN (SELECT id FROM students WHERE class_id = basic5_id)
    LOOP
        -- Insert Class Score Link
        IF score_rec.class_score IS NOT NULL THEN
            INSERT INTO student_scores (student_id, assessment_id, score)
            VALUES (score_rec.student_id, cw_assess_id, score_rec.class_score)
            ON CONFLICT (student_id, assessment_id) DO UPDATE SET score = EXCLUDED.score;
        END IF;

        -- Insert Exam Score Link
        IF score_rec.exam_score IS NOT NULL THEN
            INSERT INTO student_scores (student_id, assessment_id, score)
            VALUES (score_rec.student_id, exam_assess_id, score_rec.exam_score)
            ON CONFLICT (student_id, assessment_id) DO UPDATE SET score = EXCLUDED.score;
        END IF;
        
        recovered_count := recovered_count + 1;
    END LOOP;

    RAISE NOTICE 'Recovery Complete. Restored scores for % students.', recovered_count;

END $$;
