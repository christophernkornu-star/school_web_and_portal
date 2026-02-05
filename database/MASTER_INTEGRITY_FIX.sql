-- =================================================================
-- MASTER INTEGRITY FIX: The "Silver Bullet"
-- =================================================================
-- This script permanently resolves:
-- 1. "Ghost Scores" (Scores staying after deletion).
-- 2. "Teacher ID Error" (Errors when adding scores).
-- 3. "Stuck Report Cards" (Inaccuracies in summaries).
-- =================================================================

-- PART 1: RELAX DATABASE CONSTRAINTS (Prevent "Null Value" Crashes)
-- We make teacher_id nullable because the system should calculate grades 
-- even if we don't know who the teacher is yet.
DO $$
BEGIN
    ALTER TABLE scores ALTER COLUMN teacher_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'Column modification already applied or skipped.';
END $$;


-- PART 2: HELPER FUNCTION (Smart Recalculation)
-- If assessments map to 0, it DELETES the report card row.
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
    SELECT COUNT(*) INTO v_assessment_count
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
        RETURN;
    END IF;

    -- Calculate fresh sums
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

    -- Update Report Card
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


-- PART 3: TRIGGER FOR ASSESSMENT DELETION (Fixes "Ghost Scores")
CREATE OR REPLACE FUNCTION on_assessment_delete_fn()
RETURNS TRIGGER AS $$
DECLARE
    v_subject_id UUID;
    v_class_id UUID;
    student_record RECORD;
BEGIN
    SELECT subject_id, class_id INTO v_subject_id, v_class_id
    FROM class_subjects WHERE id = OLD.class_subject_id;

    FOR student_record IN SELECT id FROM students WHERE class_id = v_class_id
    LOOP
        PERFORM recalculate_student_subject_score(student_record.id, v_subject_id, OLD.term_id);
    END LOOP;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_recalc_on_assessment_delete ON assessments;
CREATE TRIGGER trigger_recalc_on_assessment_delete
AFTER DELETE ON assessments
FOR EACH ROW
EXECUTE FUNCTION on_assessment_delete_fn();


-- PART 4: TRIGGER FOR REAL-TIME SYNC (Fixes "Teacher ID" Error)
CREATE OR REPLACE FUNCTION sync_scores_summary_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id UUID;
    v_term_id UUID;
    v_subject_id UUID;
    v_class_id UUID;
    v_new_class_score DECIMAL;
    v_new_exam_score DECIMAL;
    v_teacher_id UUID;
    v_class_pct DECIMAL;
    v_exam_pct DECIMAL;
BEGIN
    -- Determine IDs
    IF (TG_OP = 'DELETE') THEN
        v_student_id := OLD.student_id;
        -- Lookup helper
        SELECT term_id, subject_id INTO v_term_id, v_subject_id
        FROM assessments a JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE a.id = OLD.assessment_id;
    ELSE
        v_student_id := NEW.student_id;
        SELECT term_id, subject_id INTO v_term_id, v_subject_id
        FROM assessments a JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE a.id = NEW.assessment_id;
    END IF;

    -- If we can't find context (likely parent deleted), skip (Part 3 handles it)
    IF v_term_id IS NULL OR v_subject_id IS NULL THEN RETURN NULL; END IF;

    -- Settings
    SELECT CAST(setting_value AS DECIMAL) INTO v_class_pct FROM system_settings WHERE setting_key = 'class_score_percentage';
    SELECT CAST(setting_value AS DECIMAL) INTO v_exam_pct  FROM system_settings WHERE setting_key = 'exam_score_percentage';
    v_class_pct := COALESCE(v_class_pct, 50);
    v_exam_pct := COALESCE(v_exam_pct, 50);

    -- Calculate
    SELECT 
        COALESCE((SUM(CASE WHEN a.assessment_type != 'exam' THEN ss.score ELSE 0 END) / NULLIF(SUM(CASE WHEN a.assessment_type != 'exam' THEN a.max_score ELSE 0 END), 0)) * v_class_pct, 0),
        COALESCE((SUM(CASE WHEN a.assessment_type = 'exam' THEN ss.score ELSE 0 END) / NULLIF(SUM(CASE WHEN a.assessment_type = 'exam' THEN a.max_score ELSE 0 END), 0)) * v_exam_pct, 0)
    INTO v_new_class_score, v_new_exam_score
    FROM student_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    WHERE ss.student_id = v_student_id AND a.term_id = v_term_id AND cs.subject_id = v_subject_id;

    -- Update Summary
    IF (v_new_class_score + v_new_exam_score) > 0 THEN
         -- Attempt to find teacher
         SELECT class_id INTO v_class_id FROM students WHERE id = v_student_id;
         SELECT teacher_id INTO v_teacher_id FROM class_subjects WHERE subject_id = v_subject_id AND class_id = v_class_id LIMIT 1;
         
         INSERT INTO scores (student_id, subject_id, term_id, class_score, exam_score, total, teacher_id, grade, remarks)
         VALUES (v_student_id, v_subject_id, v_term_id, v_new_class_score, v_new_exam_score, (v_new_class_score + v_new_exam_score), v_teacher_id, '', '')
         ON CONFLICT (student_id, subject_id, term_id) 
         DO UPDATE SET 
            class_score = EXCLUDED.class_score,
            exam_score = EXCLUDED.exam_score,
            total = EXCLUDED.total,
            updated_at = NOW();
    ELSE
         -- Cleanup if total is 0 (keep DB clean)
         DELETE FROM scores 
         WHERE student_id = v_student_id AND subject_id = v_subject_id AND term_id = v_term_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_scores ON student_scores;
CREATE TRIGGER trg_sync_scores AFTER INSERT OR UPDATE OR DELETE ON student_scores
FOR EACH ROW EXECUTE FUNCTION sync_scores_summary_trigger();


-- PART 5: CLEANUP GHOSTS (Immediate Fix)
DO $$
DECLARE deleted_count INT;
BEGIN
    DELETE FROM scores s
    WHERE NOT EXISTS (
        SELECT 1 FROM assessments a
        JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE cs.subject_id = s.subject_id
        AND a.term_id = s.term_id
        AND cs.class_id = (SELECT class_id FROM students WHERE id = s.student_id)
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % ghost score rows.', deleted_count;
END $$;
