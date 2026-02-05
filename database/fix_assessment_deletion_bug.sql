-- =================================================================
-- FIX: ASSESSMENT DELETION "GHOST SCORE" BUG
-- =================================================================
-- Description:
-- When an Assessment is deleted, the contained scores are deleted via CASCADE.
-- However, PostgreSQL does NOT fire triggers on cascaded deletes.
-- This means the Report Card (scores table) is never notified to lower the score.
--
-- This script adds a trigger to the PARENT table (assessments) to manually
-- force a recalculation of the Report Card when an assessment is removed.
-- =================================================================

-- 1. Helper Function: Recalculate Single Student Subject Score
--    (Same logic as the sync trigger, but callable on demand)
CREATE OR REPLACE FUNCTION recalculate_student_subject_score(
    p_student_id UUID,
    p_subject_id UUID,
    p_term_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_class_score DECIMAL;
    v_exam_score DECIMAL;
    v_assessment_count INTEGER;
BEGIN
    -- Check if there are ANY assessments left for this subject/student/term
    SELECT COUNT(*)
    INTO v_assessment_count
    FROM student_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    WHERE ss.student_id = p_student_id
    AND a.term_id = p_term_id
    AND cs.subject_id = p_subject_id;

    -- IF NO ASSESSMENTS REMAIN, DELETE THE GHOST ROW
    IF v_assessment_count = 0 THEN
        DELETE FROM scores 
        WHERE student_id = p_student_id 
        AND subject_id = p_subject_id 
        AND term_id = p_term_id;
        
        RETURN; -- Exit early
    END IF;

    -- Calculate fresh sums from remaining assessments
    SELECT 
        COALESCE(SUM(CASE WHEN a.assessment_type != 'exam' THEN ss.score ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN a.assessment_type = 'exam' THEN ss.score ELSE 0 END), 0)
    INTO v_class_score, v_exam_score
    FROM student_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    WHERE ss.student_id = p_student_id
    AND a.term_id = p_term_id
    AND cs.subject_id = p_subject_id;

    -- Update Report Card (scores table)
    -- This update will fire the 'auto_calculate_grades_and_remarks' trigger 
    -- on the scores table to handle Remarks/Grading automatically.
    UPDATE scores
    SET 
        class_score = v_class_score,
        exam_score = v_exam_score,
        total = v_class_score + v_exam_score,
        updated_at = NOW()
    WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id;
END;
$$ LANGUAGE plpgsql;


-- 2. Trigger Function: Run on Assessment Deletion
CREATE OR REPLACE FUNCTION on_assessment_delete_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_subject_id UUID;
    v_class_id UUID;
    student_record RECORD;
BEGIN
    -- Identify the Subject and Class from the deleted Assessment
    -- (We must query class_subjects to map the ID to real entities)
    SELECT subject_id, class_id INTO v_subject_id, v_class_id
    FROM class_subjects
    WHERE id = OLD.class_subject_id;

    -- Iterate through all students in this class and refresh their scores
    -- We do this because we don't know exactly which students had scores 
    -- (since they are deleted), so we act on the whole class to be safe.
    FOR student_record IN 
        SELECT id FROM students WHERE class_id = v_class_id
    LOOP
        PERFORM recalculate_student_subject_score(
            student_record.id, 
            v_subject_id, 
            OLD.term_id
        );
    END LOOP;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;


-- 3. Apply Trigger
DROP TRIGGER IF EXISTS trigger_recalc_on_assessment_delete ON assessments;

CREATE TRIGGER trigger_recalc_on_assessment_delete
AFTER DELETE ON assessments
FOR EACH ROW
EXECUTE FUNCTION on_assessment_delete_fn();


-- 4. FORCE CLEANUP: Remove "Ghost Rows" Directly
--    (Deletes any score row where NO assessments exist for that subject)
DO $$
DECLARE
    deleted_count INT;
BEGIN
    RAISE NOTICE 'Cleaning up Ghost Scores...';

    -- Delete scores where no matching assessment exists for the student's class and subject
    DELETE FROM scores s
    WHERE NOT EXISTS (
        SELECT 1
        FROM assessments a
        JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE cs.subject_id = s.subject_id
        AND a.term_id = s.term_id
        AND cs.class_id = (SELECT class_id FROM students WHERE id = s.student_id)
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % ghost score rows.', deleted_count;
END $$;
