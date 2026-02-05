-- =================================================================
-- MASTER GRADING FIX: "Lower Primary Remarks"
-- =================================================================
-- Fixes:
-- 1. Adds explicit grading logic for LOWER PRIMARY (Basic 1-3)
-- 2. Ensures remarks like "Excellent", "Very Good" etc. appear.
-- =================================================================

CREATE OR REPLACE FUNCTION auto_calculate_grades_and_remarks()
RETURNS TRIGGER AS $$
DECLARE
    student_level TEXT;
    class_name TEXT;
    
    v_total_score DECIMAL := 0;
    
BEGIN
    v_total_score := COALESCE(NEW.class_score, 0) + COALESCE(NEW.exam_score, 0);
    NEW.total := v_total_score;

    -- Get Class Name & Level
    SELECT c.name, c.level INTO class_name, student_level
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = NEW.student_id;
    
    -- 4. APPLY GRADING SCALES
    
    -- === JHS LOGIC ===
    IF class_name ILIKE '%JHS%' OR student_level = 'jhs' THEN
        IF v_total_score >= 80 THEN       NEW.grade := '1'; NEW.remarks := 'Highly Proficient';
        ELSIF v_total_score >= 68 THEN    NEW.grade := '2'; NEW.remarks := 'Proficient';
        ELSIF v_total_score >= 54 THEN    NEW.grade := '3'; NEW.remarks := 'Approaching Proficiency';
        ELSIF v_total_score >= 40 THEN    NEW.grade := '4'; NEW.remarks := 'Developing';
        ELSE                              NEW.grade := '5'; NEW.remarks := 'Emerging';
        END IF;

    -- === UPPER PRIMARY LOGIC (Basic 4-6) ===
    ELSIF class_name ILIKE '%Basic 4%' OR class_name ILIKE '%Basic 5%' OR class_name ILIKE '%Basic 6%'
       OR class_name ILIKE '%Primary 4%' OR class_name ILIKE '%Primary 5%' OR class_name ILIKE '%Primary 6%'
       OR student_level = 'upper_primary' 
    THEN
        IF v_total_score >= 80 THEN       NEW.grade := '1'; NEW.remarks := 'High Proficiency';
        ELSIF v_total_score >= 75 THEN    NEW.grade := '2'; NEW.remarks := 'Proficient';
        ELSIF v_total_score >= 60 THEN    NEW.grade := '3'; NEW.remarks := 'Proficiency';
        ELSIF v_total_score >= 50 THEN    NEW.grade := '4'; NEW.remarks := 'Approaching Proficiency';
        ELSIF v_total_score >= 40 THEN    NEW.grade := '7'; NEW.remarks := 'Developing';
        ELSE                              NEW.grade := '9'; NEW.remarks := 'Emerging';
        END IF;

    -- === LOWER PRIMARY & KINDERGARTEN LOGIC (KG 1-2, Basic 1-3) ===
    -- UPDATED: Uses the Standard Proficiency Scale (Highly Proficient, etc.)
    ELSIF class_name ILIKE '%Basic 1%' OR class_name ILIKE '%Basic 2%' OR class_name ILIKE '%Basic 3%'
       OR class_name ILIKE '%Primary 1%' OR class_name ILIKE '%Primary 2%' OR class_name ILIKE '%Primary 3%'
       OR class_name ILIKE '%KG%' OR class_name ILIKE '%Kindergarten%'
       OR student_level = 'lower_primary' OR student_level = 'kindergarten'
    THEN
        IF v_total_score >= 80 THEN       NEW.grade := '1'; NEW.remarks := 'Highly Proficient';
        ELSIF v_total_score >= 68 THEN    NEW.grade := '2'; NEW.remarks := 'Proficient';
        ELSIF v_total_score >= 54 THEN    NEW.grade := '3'; NEW.remarks := 'Approaching Proficiency';
        ELSIF v_total_score >= 40 THEN    NEW.grade := '4'; NEW.remarks := 'Developing';
        ELSE                              NEW.grade := '5'; NEW.remarks := 'Emerging';
        END IF;

    -- === FALLBACK ===
    ELSE
        -- Default to Lower Primary scale if unsure, or keep existing behavior
        IF NEW.remarks IS NULL OR NEW.remarks = '' THEN 
             NEW.remarks := 'Ungraded'; 
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-install Trigger
DROP TRIGGER IF EXISTS trg_auto_grade_scores ON scores;

CREATE TRIGGER trg_auto_grade_scores
    BEFORE INSERT OR UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_grades_and_remarks();

-- Force Update existing Lower Primary scores to generate remarks
DO $$
DECLARE
    updated_count INT;
BEGIN
    UPDATE scores s
    SET updated_at = NOW()
    FROM students stu
    JOIN classes c ON stu.class_id = c.id
    WHERE s.student_id = stu.id
    AND (
        c.name ILIKE 'Basic 1%' OR c.name ILIKE 'Basic 2%' OR c.name ILIKE 'Basic 3%'
        OR c.name ILIKE 'Primary 1%' OR c.name ILIKE 'Primary 2%' OR c.name ILIKE 'Primary 3%'
        OR c.name ILIKE '%KG%' OR c.name ILIKE '%Kindergarten%'
    )
    AND (s.remarks IS NULL OR s.remarks = '' OR s.remarks = 'Ungraded');
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Refreshed remarks for % Lower Primary/KG scores.', updated_count;
END $$;
