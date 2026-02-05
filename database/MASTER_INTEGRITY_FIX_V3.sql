-- =================================================================
-- MASTER INTEGRITY FIX V3: "Fully Dynamic Configuration"
-- =================================================================
-- Fixes:
-- 1. Respects "General Settings" dynamically for ALL levels.
-- 2. "Ghost Scores" (Assessment Deletion Bug).
-- 3. Teacher ID Error (Logic-Aware Assignment).
-- =================================================================

-- 1. UTILITY: FUNCTION TO DETERMINE TEACHING MODEL DYNAMICALLY
--    This reads the actual 'system_settings' table configured in your Admin Portal.
CREATE OR REPLACE FUNCTION get_correct_teacher_for_score(
    p_student_id UUID,
    p_subject_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_class_id UUID;
    v_class_level INTEGER;
    v_class_category TEXT;
    v_teaching_model TEXT;
    v_setting_key TEXT;
    v_teacher_id UUID;
BEGIN
    -- 1. Get Class Details (Level and Category)
    SELECT class_id INTO v_class_id FROM students WHERE id = p_student_id;
    
    -- IMPORTANT: 'level' is an INTEGER (1-12). 'category' is TEXT (Primary, JHS).
    -- If 'level' fails to cast, we catch it.
    -- Some old rows has 'upper_primary' in level column? CHECK SCHEMA.
    -- Schema says: level INTEGER NOT NULL.
    
    SELECT level, category INTO v_class_level, v_class_category FROM classes WHERE id = v_class_id;

    -- 2. Map Level to Setting Key (Matches Admin Portal Logic)
    -- Levels: 1-2 (KG), 3-5 (Lower), 6-8 (Upper), 9+ (JHS)
    
    IF v_class_level <= 2 THEN
        -- KG 1 & 2 (No setting key usually, defaults to Class Teacher)
        v_setting_key := 'kindergarten_teaching_model'; -- Fallback handle
    ELSIF v_class_level BETWEEN 3 AND 5 THEN
        -- Basic 1 - 3
        v_setting_key := 'lower_primary_teaching_model';
    ELSIF v_class_level BETWEEN 6 AND 8 THEN
        -- Basic 4 - 6
        v_setting_key := 'upper_primary_teaching_model';
    ELSE
        -- Basic 7 - 9 (JHS)
        v_setting_key := 'jhs_teaching_model';
    END IF;

    -- 3. Fetch from System Settings
    SELECT setting_value INTO v_teaching_model 
    FROM system_settings 
    WHERE setting_key = v_setting_key;

    -- 4. Apply Defaults if Setting is Missing (Safety Net)
    IF v_teaching_model IS NULL THEN
        IF v_class_level >= 9 THEN 
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
        
        -- Fallback: Any teacher assigned to this class
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

        -- Fallback: Check the legacy class_subjects table
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


-- 2. RECALCULATION HELPER (Updated to use new Teacher Logic)
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
