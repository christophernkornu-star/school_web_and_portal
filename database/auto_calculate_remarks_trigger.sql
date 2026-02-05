-- =================================================================
-- AUTOMATIC REPORT CARD REMARKS & GRADING TRIGGER
-- =================================================================
-- This script creates a database trigger that AUTOMATICALLY calculates
-- the Grade and Remarks whenever a score is entered or updated.
-- You will NO LONGER need to fun manual fix scripts.
-- =================================================================

-- 1. Create the Calculation Function
CREATE OR REPLACE FUNCTION auto_calculate_score_details()
RETURNS TRIGGER AS $$
DECLARE
    student_level TEXT;
    v_total DECIMAL;
BEGIN
    -- Calculate Total (Safety check, though typically passed by App)
    v_total := COALESCE(NEW.class_score, 0) + COALESCE(NEW.exam_score, 0);
    NEW.total := v_total;

    -- Get Student Level (Upper Primary vs Others)
    -- We assume current class structure
    SELECT c.level INTO student_level
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = NEW.student_id;

    -- =========================================================
    -- APPLY GRADING LOGIC (Based on Level)
    -- =========================================================
    
    -- UPPER PRIMARY (Basic 4, 5, 6)
    IF student_level = 'upper_primary' 
       OR student_level = 'primary' -- Some setups use this
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%Basic 4%'
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%Basic 5%'
       OR (SELECT name FROM classes WHERE id = (SELECT class_id FROM students WHERE id = NEW.student_id)) ILIKE '%Basic 6%'
    THEN
        -- Proficiency Scale
        IF v_total >= 80 THEN
            NEW.grade := '1';
            NEW.remarks := 'High Proficiency';
        ELSIF v_total >= 75 THEN
             NEW.grade := '2';
             NEW.remarks := 'Proficient';
        ELSIF v_total >= 60 THEN
             NEW.grade := '3'; -- Adjusted to match >60 Proficiency logic
             NEW.remarks := 'Proficiency';
        ELSIF v_total >= 50 THEN
             NEW.grade := '4'; -- 
             NEW.remarks := 'Approaching Proficiency';
        ELSIF v_total >= 40 THEN
             NEW.grade := '7'; 
             NEW.remarks := 'Developing';
        ELSE 
             NEW.grade := '9';
             NEW.remarks := 'Emerging';
        END IF;

    -- JUNIOR HIGH SCHOOL (JHS) - New Curriculum Grading
    ELSIF student_level = 'jhs' OR student_level = 'junior_high' THEN
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

    -- DEFAULT FALLBACK (If level unknown)
    ELSE 
        IF NEW.remarks IS NULL THEN
             NEW.remarks := 'Ungraded';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach Trigger to 'scores' table
DROP TRIGGER IF EXISTS trigger_auto_calculate_remarks ON scores;

CREATE TRIGGER trigger_auto_calculate_remarks
    BEFORE INSERT OR UPDATE ON scores
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_score_details();

RAISE NOTICE 'Automatic Grading Trigger Installed Successfully.';
