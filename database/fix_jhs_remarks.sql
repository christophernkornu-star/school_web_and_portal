-- =================================================================
-- FIX JHS REMARKS (New Curriculum Standard)
-- =================================================================
-- Applies the specific grading scale provided:
-- 80 – 100% : Highly Proficient
-- 68 – 79%  : Proficient
-- 54 – 67%  : Approaching Proficiency
-- 40 – 53%  : Developing
-- 0 – 39%   : Emerging
-- =================================================================

DO $$
DECLARE
    updated_count INT;
BEGIN
    RAISE NOTICE 'Updating JHS Remarks to New Curriculum Standards...';

    -- Target JHS students (Level = 'jhs' OR Class Name matches)
    WITH target_scores AS (
        SELECT s.id, s.total
        FROM scores s
        JOIN students stu ON s.student_id = stu.id
        JOIN classes c ON stu.class_id = c.id
        WHERE c.level = 'jhs' 
           OR c.level = 'junior_high'
           OR c.name ILIKE 'JHS%' 
           OR c.name ILIKE 'Basic 7%' 
           OR c.name ILIKE 'Basic 8%' 
           OR c.name ILIKE 'Basic 9%'
    )
    UPDATE scores
    SET 
        -- Mapping Remarks to Grades (1-5 Scale)
        grade = CASE 
            WHEN total >= 80 THEN '1'
            WHEN total >= 68 THEN '2'
            WHEN total >= 54 THEN '3' 
            WHEN total >= 40 THEN '4'
            ELSE '5' 
        END,
        
        remarks = CASE 
            WHEN total >= 80 THEN 'Highly Proficient'
            WHEN total >= 68 THEN 'Proficient'
            WHEN total >= 54 THEN 'Approaching Proficiency'
            WHEN total >= 40 THEN 'Developing'
            ELSE 'Emerging'
        END,
        
        updated_at = NOW()
    WHERE id IN (SELECT id FROM target_scores);

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated remarks for % JHS score entries.', updated_count;
    
END $$;
