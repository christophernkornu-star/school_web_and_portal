-- =================================================================
-- MASTER INTEGRITY FIX V4: "Type-Safe Edition"
-- =================================================================
-- Fixes:
-- 1. ERROR: "invalid input syntax for type integer: 'upper_primary'"
--    (Caused because 'level' column is actually TEXT in your active database, not INTEGER)
-- 2. "Ghost Scores" (Assessment Deletion Bug).
-- 3. Teacher ID Error (Logic-Aware Assignment).
-- =================================================================

-- 1. UTILITY: FUNCTION TO DETERMINE TEACHING MODEL DYNAMICALLY
--    Updated to handle TEXT levels ('Basic 1', 'JHS 1', 'upper_primary', etc.)
CREATE OR REPLACE FUNCTION get_correct_teacher_for_score(
    p_student_id UUID,
    p_subject_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_class_id UUID;
    v_class_level TEXT; -- CHANGED FROM INTEGER TO TEXT
    v_class_category TEXT;
    v_teaching_model TEXT;
    v_setting_key TEXT;
    v_teacher_id UUID;
BEGIN
    -- 1. Get Class Details
    SELECT class_id INTO v_class_id FROM students WHERE id = p_student_id;
    SELECT level, category INTO v_class_level, v_class_category FROM classes WHERE id = v_class_id;

    -- 2. Map TEXT Level to Setting Key (Matches Admin Portal Logic)
    -- Your database uses STRINGS like 'Basic 4', 'JHS 1', 'KG 1' for levels.
    
    IF v_class_level ILIKE 'KG%' OR v_class_level IN ('1', '2') THEN
        v_setting_key := 'kindergarten_teaching_model';
        
    ELSIF v_class_level ILIKE 'Basic 1%' OR v_class_level ILIKE 'Basic 2%' OR v_class_level ILIKE 'Basic 3%' 
       OR v_class_level ILIKE 'Primary 1%' OR v_class_level ILIKE 'Primary 2%' OR v_class_level ILIKE 'Primary 3%'
       OR v_class_level = 'lower_primary' THEN
        v_setting_key := 'lower_primary_teaching_model';
        
    ELSIF v_class_level ILIKE 'Basic 4%' OR v_class_level ILIKE 'Basic 5%' OR v_class_level ILIKE 'Basic 6%'
       OR v_class_level ILIKE 'Primary 4%' OR v_class_level ILIKE 'Primary 5%' OR v_class_level ILIKE 'Primary 6%'
       OR v_class_level = 'upper_primary' THEN
        v_setting_key := 'upper_primary_teaching_model';
        
    ELSIF v_class_level ILIKE 'Basic 7%' OR v_class_level ILIKE 'Basic 8%' OR v_class_level ILIKE 'Basic 9%'
       OR v_class_level ILIKE 'JHS%' 
       OR v_class_level = 'jhs' THEN
        v_setting_key := 'jhs_teaching_model';
    ELSE
        -- Fallback for weird values
        v_setting_key := 'upper_primary_teaching_model';
    END IF;

    -- 3. Fetch from System Settings
    SELECT setting_value INTO v_teaching_model 
    FROM system_settings 
    WHERE setting_key = v_setting_key;

    -- 4. Apply Defaults if Setting is Missing
    IF v_teaching_model IS NULL THEN
        IF v_setting_key = 'jhs_teaching_model' THEN 
            v_teaching_model := 'subject_teacher'; 
        ELSE 
            v_teaching_model := 'class_teacher'; 
        END IF;
    END IF;

    -- 5. Fetch Teacher ID based on Resolved Model
    IF v_teaching_model = 'class_teacher' THEN
        -- Link to the Class Teacher
        SELECT teacher_id INTO v_teacher_id 
        FROM teacher_class_assignments 
        WHERE class_id = v_class_id 
        AND is_class_teacher = true
        LIMIT 1;
        
        -- Fallback
        IF v_teacher_id IS NULL THEN
            SELECT teacher_id INTO v_teacher_id 
            FROM teacher_class_assignments 
            WHERE class_id = v_class_id 
            LIMIT 1;
        END IF;

    ELSE
        -- Subject Teacher Model
        SELECT teacher_id INTO v_teacher_id 
        FROM teacher_subject_assignments 
        WHERE class_id = v_class_id 
        AND subject_id = p_subject_id
        LIMIT 1;

        -- Fallback
        IF v_teacher_id IS NULL THEN
             SELECT teacher_id INTO v_teacher_id 
             FROM class_subjects 
             WHERE class_id = v_class_id 
             AND subject_id = p_subject_id;
        END IF;
    END IF;

    RETURN v_teacher_id;
END;
$$ LANGUAGE plpgsql;


-- 2. RECALCULATION HELPER (Safe for Text Levels)
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
    v_correct_teacher_id UUID;
BEGIN
    SELECT COUNT(*) INTO v_assessment_count
    FROM student_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    WHERE ss.student_id = p_student_id
    AND a.term_id = p_term_id
    AND cs.subject_id = p_subject_id;

    -- CLEANUP GHOST ROW
    IF v_assessment_count = 0 THEN
        DELETE FROM scores 
        WHERE student_id = p_student_id 
        AND subject_id = p_subject_id 
        AND term_id = p_term_id;
        RETURN;
    END IF;

    -- Calculate Sums
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
    
    -- Get Correct Teacher
    v_correct_teacher_id := get_correct_teacher_for_score(p_student_id, p_subject_id);

    -- Update Score
    UPDATE scores
    SET 
        class_score = v_class_score,
        exam_score = v_exam_score,
        total = v_class_score + v_exam_score,
        teacher_id = CASE WHEN v_correct_teacher_id IS NOT NULL THEN v_correct_teacher_id ELSE teacher_id END,
        updated_at = NOW()
    WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id;
END;
$$ LANGUAGE plpgsql;


-- 3. TRIGGER: SYNC SCORES (The Real-Time Brain)
CREATE OR REPLACE FUNCTION sync_scores_summary_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id UUID;
    v_term_id UUID;
    v_subject_id UUID;
    v_new_class_score DECIMAL;
    v_new_exam_score DECIMAL;
    v_teacher_id UUID;
    v_class_pct DECIMAL;
    v_exam_pct DECIMAL;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_student_id := OLD.student_id;
        SELECT term_id, subject_id INTO v_term_id, v_subject_id
        FROM assessments a JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE a.id = OLD.assessment_id;
    ELSE
        v_student_id := NEW.student_id;
        SELECT term_id, subject_id INTO v_term_id, v_subject_id
        FROM assessments a JOIN class_subjects cs ON a.class_subject_id = cs.id
        WHERE a.id = NEW.assessment_id;
    END IF;

    IF v_term_id IS NULL OR v_subject_id IS NULL THEN RETURN NULL; END IF;

    SELECT CAST(setting_value AS DECIMAL) INTO v_class_pct FROM system_settings WHERE setting_key = 'class_score_percentage';
    SELECT CAST(setting_value AS DECIMAL) INTO v_exam_pct  FROM system_settings WHERE setting_key = 'exam_score_percentage';
    v_class_pct := COALESCE(v_class_pct, 50);
    v_exam_pct := COALESCE(v_exam_pct, 50);

    SELECT 
        COALESCE((SUM(CASE WHEN a.assessment_type != 'exam' THEN ss.score ELSE 0 END) / NULLIF(SUM(CASE WHEN a.assessment_type != 'exam' THEN a.max_score ELSE 0 END), 0)) * v_class_pct, 0),
        COALESCE((SUM(CASE WHEN a.assessment_type = 'exam' THEN ss.score ELSE 0 END) / NULLIF(SUM(CASE WHEN a.assessment_type = 'exam' THEN a.max_score ELSE 0 END), 0)) * v_exam_pct, 0)
    INTO v_new_class_score, v_new_exam_score
    FROM student_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    WHERE ss.student_id = v_student_id AND a.term_id = v_term_id AND cs.subject_id = v_subject_id;

    IF (v_new_class_score + v_new_exam_score) > 0 THEN
         v_teacher_id := get_correct_teacher_for_score(v_student_id, v_subject_id);

         INSERT INTO scores (student_id, subject_id, term_id, class_score, exam_score, total, teacher_id, grade, remarks)
         VALUES (v_student_id, v_subject_id, v_term_id, v_new_class_score, v_new_exam_score, (v_new_class_score + v_new_exam_score), v_teacher_id, '', '')
         ON CONFLICT (student_id, subject_id, term_id) 
         DO UPDATE SET 
            class_score = EXCLUDED.class_score,
            exam_score = EXCLUDED.exam_score,
            total = EXCLUDED.total,
            teacher_id = COALESCE(EXCLUDED.teacher_id, scores.teacher_id),
            updated_at = NOW();
    ELSE
         DELETE FROM scores 
         WHERE student_id = v_student_id AND subject_id = v_subject_id AND term_id = v_term_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_scores ON student_scores;
CREATE TRIGGER trg_sync_scores AFTER INSERT OR UPDATE OR DELETE ON student_scores
FOR EACH ROW EXECUTE FUNCTION sync_scores_summary_trigger();


-- 4. TRIGGER: ASSESSMENT DELETION
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


-- 5. SAFETY: Make teacher_id nullable
DO $$
BEGIN
    ALTER TABLE scores ALTER COLUMN teacher_id DROP NOT NULL;
EXCEPTION
    WHEN OTHERS THEN RAISE NOTICE 'Already nullable';
END $$;
