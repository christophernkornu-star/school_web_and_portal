-- Function to safely delete an entire academic year and all its terms
-- Cascades down to terms, which cascades to data

CREATE OR REPLACE FUNCTION delete_academic_year(p_academic_year TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    term_record RECORD;
BEGIN
    -- 1. Loop through all terms in this year and delete them using the term deleter
    -- This ensures all child data (assessments, attendance) is cleaned up first
    FOR term_record IN SELECT id FROM academic_terms WHERE academic_year = p_academic_year LOOP
        PERFORM delete_academic_term(term_record.id);
    END LOOP;

    -- 2. Delete Class Subjects assigned to this year
    DELETE FROM class_subjects WHERE academic_year = p_academic_year;

    -- 3. Note: There is no 'academic_years' table to delete from, as it is just a grouping string.

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting academic year: %', SQLERRM;
    RETURN FALSE;
END;
$$;
