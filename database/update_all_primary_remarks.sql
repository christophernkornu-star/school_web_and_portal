-- =================================================================
-- FORCE UPDATE REMARKS FOR UPPER PRIMARY (Basic 4, 5, 6)
-- =================================================================
-- This script ensures that ALL subjects for Upper Primary students
-- have the correct Proficiency remarks (High Proficiency, etc.)
-- based on their Total Score.

DO $$
DECLARE
    updated_count INT;
BEGIN
    RAISE NOTICE 'Updating remarks for Upper Primary students...';

    -- Update scores for students in Basic 4, 5, 6
    -- We join with 'students' and 'classes' to filter by level/name
    
    WITH target_scores AS (
        SELECT s.id, s.total
        FROM scores s
        JOIN students stu ON s.student_id = stu.id
        JOIN classes c ON stu.class_id = c.id
        WHERE c.level = 'upper_primary' 
           OR c.name ILIKE 'Basic 4%' 
           OR c.name ILIKE 'Basic 5%' 
           OR c.name ILIKE 'Basic 6%'
           OR c.name ILIKE 'Primary%'
    )
    UPDATE scores
    SET 
        -- PROFICIENCY GRADING SCALE
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
            WHEN total >= 75 THEN 'Proficient' -- Some schools split 75-79
            WHEN total >= 60 THEN 'Proficiency'
            WHEN total >= 50 THEN 'Approaching Proficiency'
            WHEN total >= 40 THEN 'Developing'
            ELSE 'Emerging'
        END,
        
        updated_at = NOW()
    WHERE id IN (SELECT id FROM target_scores);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated remarks for % score entries.', updated_count;
    
END $$;
