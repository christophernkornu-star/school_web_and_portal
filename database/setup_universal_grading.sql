-- =================================================================
-- UNIVERSAL GRADING SYSTEM (Primary + JHS)
-- =================================================================
-- 1. Defines automation for FUTURE scores (Trigger).
-- 2. Updates ALL EXISTING scores to match this new standard.
-- =================================================================

-- PART A: Create the Automation Function
CREATE OR REPLACE FUNCTION auto_calculate_score_details()
RETURNS TRIGGER AS $$
DECLARE
    student_level TEXT;
    v_total DECIMAL;
BEGIN
    -- Calculate Total (Safety check)
    v_total := COALESCE(NEW.class_score, 0) + COALESCE(NEW.exam_score, 0);
    NEW.total := v_total;

    -- Get Student Level
    SELECT c.level INTO student_level
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = NEW.student_id;

    -- =========================================================
    -- 1. UPPER PRIMARY LOGIC (Basic 4 - 6)
    -- =========================================================
    IF student_level = 'upper_primary' 
       OR student_level = 'primary'
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%Basic 4%'
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%Basic 5%'
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%Basic 6%'
    THEN
        IF v_total >= 80 THEN
            NEW.grade := '1';
            NEW.remarks := 'High Proficiency';
        ELSIF v_total >= 75 THEN
             NEW.grade := '2';
             NEW.remarks := 'Proficient';
        ELSIF v_total >= 60 THEN
             NEW.grade := '3'; 
             NEW.remarks := 'Proficiency';
        ELSIF v_total >= 50 THEN
             NEW.grade := '4'; 
             NEW.remarks := 'Approaching Proficiency';
        ELSIF v_total >= 40 THEN
             NEW.grade := '7'; 
             NEW.remarks := 'Developing';
        ELSE 
             NEW.grade := '9';
             NEW.remarks := 'Emerging';
        END IF;

    -- =========================================================
    -- 2. JHS LOGIC (Basic 7 - 9 / JHS 1 - 3)
    -- =========================================================
    ELSIF student_level = 'jhs' 
       OR student_level = 'junior_high' 
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%JHS%'
    THEN
        -- 80 – 100% Highly Proficient
        IF v_total >= 80 THEN
            NEW.grade := '1';
            NEW.remarks := 'Highly Proficient';
        -- 68 – 79% Proficient
        ELSIF v_total >= 68 THEN
            NEW.grade := '2';
            NEW.remarks := 'Proficient';
        -- 54 – 67% Approaching Proficiency
        ELSIF v_total >= 54 THEN
            NEW.grade := '3';
            NEW.remarks := 'Approaching Proficiency';
        -- 40 – 53% Developing
        ELSIF v_total >= 40 THEN
            NEW.grade := '4';
            NEW.remarks := 'Developing';
        -- 0 – 39% Emerging
        ELSE
             NEW.grade := '5';
             NEW.remarks := 'Emerging';
        END IF;

    -- =========================================================
    -- 3. DEFAULT / FALLBACK
    -- =========================================================
    ELSE 
        IF NEW.remarks IS NULL THEN
             NEW.remarks := 'Ungraded';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- PART B: Install the Trigger
DROP TRIGGER IF EXISTS trigger_auto_calculate_remarks ON scores;

CREATE TRIGGER trigger_auto_calculate_remarks
    BEFORE INSERT OR UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_score_details();

-- PART C: Force Update Everything NOW
DO $$
BEGIN
    RAISE NOTICE 'Universal Grading Trigger Installed.';
    
    -- This "dummy update" fires the trigger for every row, applying the new logic immediately.
    UPDATE scores SET updated_at = NOW();
    
    RAISE NOTICE 'All existing scores have been refreshed with the new grading logic.';
END $$;
