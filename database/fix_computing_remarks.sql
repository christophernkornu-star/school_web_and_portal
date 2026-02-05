-- =================================================================
-- FIX COMPUTING REMARKS FOR UPPER PRIMARY
-- =================================================================
-- Ensures that the newly added 'Computing' subject uses the standard 
-- Proficiency grading system (High Proficiency, Proficient, etc.)
-- matching the behavior of other Upper Primary subjects.

DO $$
DECLARE
    comp_id UUID;
    term_id UUID;
BEGIN
    -- 1. Identify the Computing Subject
    SELECT id INTO comp_id FROM subjects WHERE name = 'Computing' AND level = 'upper_primary';

    IF comp_id IS NULL THEN
        RAISE NOTICE 'Computing (Upper Primary) subject not found.';
        RETURN;
    END IF;

    RAISE NOTICE 'Updating remarks for subject: %', comp_id;

    -- 2. Update Scores with Correct Grading Logic
    -- using standard Upper Primary / SBA proficiency scale
    UPDATE scores
    SET 
        -- Standard Grade mapping (modify if your school uses strict 1-9 for Primary)
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
        
        -- Proficiency Remarks
        remarks = CASE 
            WHEN total >= 80 THEN 'High Proficiency'
            WHEN total >= 60 THEN 'Proficiency'
            WHEN total >= 50 THEN 'Approaching Proficiency' -- or 'Approaching'
            WHEN total >= 40 THEN 'Developing'
            ELSE 'Emerging'
        END,
        
        updated_at = NOW()
    WHERE subject_id = comp_id;

    -- 3. Ensure integrity of totals (just in case)
    UPDATE scores
    SET total = COALESCE(class_score, 0) + COALESCE(exam_score, 0)
    WHERE subject_id = comp_id
      AND total != (COALESCE(class_score, 0) + COALESCE(exam_score, 0));

    RAISE NOTICE 'Successfully synchronized Computing remarks.';
END $$;
