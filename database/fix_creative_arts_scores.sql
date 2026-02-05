-- =================================================================
-- FIX CREATIVE ARTS SCORES & REMOVE 'AUTO-GENERATED'
-- =================================================================

-- 1. Fix Constraints (Allow up to 100)
-- The previous error suggests the constraint might be too low (e.g. <= 30 or 40)
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_class_score_check;
ALTER TABLE scores ADD CONSTRAINT scores_class_score_check CHECK (class_score >= 0 AND class_score <= 100);

DO $$
DECLARE
    cad_id UUID;
    class_pct NUMERIC := 50; -- Default to 50% based on your Report Card header
    setting_val TEXT;
BEGIN
    -- 1. Identify the Subject
    SELECT id INTO cad_id FROM subjects WHERE name ILIKE '%Creative Arts & Design%' AND level = 'jhs' LIMIT 1;
    
    -- 2. Get the actual class score percentage setting (if available)
    SELECT setting_value INTO setting_val FROM system_settings WHERE setting_key = 'class_score_percentage';
    IF setting_val IS NOT NULL THEN
        -- Safely cast via text first
        BEGIN
            class_pct := setting_val::numeric;
        EXCEPTION WHEN OTHERS THEN
            class_pct := 50; -- Fallback if parse fails
        END;
    END IF;

    RAISE NOTICE 'Fixing scores for Subject: % using Percentage: %', cad_id, class_pct;

    -- 3. Update existing scores with Real Calculations
    -- We match scores table entries with actual assessments in student_scores
    WITH raw_stats AS (
        SELECT 
            ss.student_id,
            a.term_id,
            SUM(ss.score) as obtained,
            SUM(a.max_score) as max_possible
        FROM student_scores ss
        JOIN assessments a ON ss.assessment_id = a.id
        JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE cs.subject_id = cad_id
        GROUP BY ss.student_id, a.term_id
    )
    UPDATE scores s
    SET 
        -- Calculate weighted class score
        class_score = CASE 
            WHEN rs.max_possible > 0 THEN ROUND((rs.obtained / rs.max_possible) * class_pct, 2)
            ELSE 0 
        END,
        -- Update Total (Class + Exam)
        total = (CASE 
            WHEN rs.max_possible > 0 THEN ROUND((rs.obtained / rs.max_possible) * class_pct, 2)
            ELSE 0 
        END) + COALESCE(s.exam_score, 0),
        -- Recalculate Grade based on new Total
        grade = CASE 
            WHEN ((CASE WHEN rs.max_possible > 0 THEN (rs.obtained / rs.max_possible) * class_pct ELSE 0 END) + COALESCE(s.exam_score, 0)) >= 80 THEN '1'
            WHEN ((CASE WHEN rs.max_possible > 0 THEN (rs.obtained / rs.max_possible) * class_pct ELSE 0 END) + COALESCE(s.exam_score, 0)) >= 70 THEN '2'
            WHEN ((CASE WHEN rs.max_possible > 0 THEN (rs.obtained / rs.max_possible) * class_pct ELSE 0 END) + COALESCE(s.exam_score, 0)) >= 60 THEN '3'
            WHEN ((CASE WHEN rs.max_possible > 0 THEN (rs.obtained / rs.max_possible) * class_pct ELSE 0 END) + COALESCE(s.exam_score, 0)) >= 50 THEN '4'
            ELSE '9'
        END,
        -- Clear the "Auto-Generated" remark
        remarks = CASE 
            WHEN s.remarks = 'Auto-Generated' THEN NULL 
            ELSE s.remarks 
        END,
        updated_at = NOW()
    FROM raw_stats rs
    WHERE s.subject_id = cad_id
    AND s.student_id = rs.student_id
    AND s.term_id = rs.term_id;

    -- 4. Delete "Phantom" Scores
    -- If a row says "Auto-Generated" but we found NO matching assessment data in the previous step (didn't get updated), delete it.
    -- This handles the "I deleted the class score" scenario.
    DELETE FROM scores 
    WHERE subject_id = cad_id 
    AND remarks = 'Auto-Generated';

    -- 5. Final Cleanup
    -- If score is 0 and exam is 0, user implies they deleted it.
    DELETE FROM scores
    WHERE subject_id = cad_id
    AND class_score = 0 
    AND (exam_score IS NULL OR exam_score = 0)
    AND total = 0;

    RAISE NOTICE 'Fix Complete.';
END $$;
