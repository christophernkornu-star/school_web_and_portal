-- Function to safely delete a single academic term and all associated data
-- This is necessary because some tables might lack ON DELETE CASCADE for term_id

CREATE OR REPLACE FUNCTION delete_academic_term(p_term_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Delete Assessments (Cascades to grades)
    DELETE FROM assessments WHERE term_id = p_term_id;

    -- 2. Delete Student Attendance records
    DELETE FROM student_attendance WHERE term_id = p_term_id;

    -- 3. Delete Class Subjects (if assignments are tracked per term in any system variation)
    -- Our schema says class_subjects uses academic_year, not term_id, but checking just in case
    -- (No action needed for standard schema)

    -- 4. Delete Scores (If not cascaded)
    DELETE FROM scores WHERE term_id = p_term_id;

    -- 5. Delete the term itself
    DELETE FROM academic_terms WHERE id = p_term_id;

    RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting academic term: %', SQLERRM;
    RETURN FALSE;
END;
$$;
