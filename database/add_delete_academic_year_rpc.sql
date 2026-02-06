-- Function to safely delete an entire academic year and all associated data
-- This ensures all scores, assessments, class subjects, and promotions are removed

CREATE OR REPLACE FUNCTION delete_academic_year(p_academic_year TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_term_ids UUID[];
BEGIN
    -- 1. Get all term IDs for this year
    SELECT ARRAY_AGG(id) INTO v_term_ids FROM academic_terms WHERE academic_year = p_academic_year;

    -- 2. Delete Assessments (Cascades to grades)
    -- We must do this explicitly because assessments might not cascade on term delete depending on creation order/def
    IF v_term_ids IS NOT NULL THEN
        DELETE FROM assessments WHERE term_id = ANY(v_term_ids);
    END IF;

    -- 3. Delete Class Subjects (Clean up assignments for that year)
    DELETE FROM class_subjects WHERE academic_year = p_academic_year;

    -- 4. Delete Student Promotions (Clean up history)
    DELETE FROM student_promotions WHERE academic_year = p_academic_year;
    
    -- 5. Delete Promotion History
    DELETE FROM promotion_history WHERE academic_year = p_academic_year;

    -- 6. Delete Academic Terms (Cascades to scores table)
    -- This is the main action
    DELETE FROM academic_terms WHERE academic_year = p_academic_year;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting academic year: %', SQLERRM;
    RETURN FALSE;
END;
$$;
