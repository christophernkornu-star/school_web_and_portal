-- =================================================================
-- FIX MISSING REPORT CARD SCORES (COMPUTING & CREATIVE ARTS)
-- =================================================================

-- 1. UTILITY: Ensure valid numeric cast
CREATE OR REPLACE FUNCTION safe_cast_numeric(text, numeric) RETURNS numeric AS $$
BEGIN
    RETURN $1::numeric;
EXCEPTION WHEN OTHERS THEN
    RETURN $2;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Prevent Constraint Errors
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_class_score_check;
ALTER TABLE scores ADD CONSTRAINT scores_class_score_check CHECK (class_score >= 0 AND class_score <= 100);

DO $$
DECLARE
    comp_id UUID;
    cad_id UUID;
    class_pct NUMERIC := 50;
    setting_val TEXT;
BEGIN
    -- 1. LOCATE MASTER SUBJECTS (JHS Level)
    SELECT id INTO comp_id FROM subjects WHERE name ILIKE 'Computing' AND level = 'jhs' LIMIT 1;
    SELECT id INTO cad_id FROM subjects WHERE name ILIKE 'Creative Arts & Design' AND level = 'jhs' LIMIT 1;

    -- Fallback: If strict JHS 'Computing' not found, take ANY 'Computing' that looks correct
    IF comp_id IS NULL THEN
        SELECT id INTO comp_id FROM subjects WHERE name ILIKE 'Computing' ORDER BY created_at DESC LIMIT 1;
    END IF;

    RAISE NOTICE 'Target Subjects: Computing=%, Creative Arts=%', comp_id, cad_id;

    -- 2. GET SETTINGS (Score Percentage)
    SELECT setting_value INTO setting_val FROM system_settings WHERE setting_key = 'class_score_percentage';
    class_pct := safe_cast_numeric(setting_val, 50);

    RAISE NOTICE 'Using Class Score Percentage: %', class_pct;

    -- 3. SYNC LOGIC (Do for both subjects)
    -- We process ALL scores in `student_scores` for these subjects and UPSERT them into `scores`.
    
    -- [A] SYNC CREATIVE ARTS (CAD)
    IF cad_id IS NOT NULL THEN
        RAISE NOTICE 'Syncing Creative Arts...';
        
        -- Insert/Update Scores based on Assessments
        INSERT INTO scores (student_id, subject_id, term_id, class_score, exam_score, total, grade, remarks, created_at, updated_at, teacher_id)
        SELECT 
            ss.student_id,
            cad_id, -- Force Master ID
            a.term_id,
            -- Calculate Weighted Class Score
            ROUND( (SUM(ss.score) / GREATEST(SUM(a.max_score), 1)) * class_pct, 2 ),
            0, -- Default Exam Score (Update manually later or if exists)
            ROUND( (SUM(ss.score) / GREATEST(SUM(a.max_score), 1)) * class_pct, 2 ), -- Total (Initial)
            '9', -- Default Grade (Recalculated below)
            NULL, -- Remarks
            NOW(),
            NOW(),
            -- Find Teacher (Best Effort)
            COALESCE(
                 MAX(a.created_by::text)::uuid, 
                 (SELECT id FROM teachers WHERE status = 'active' LIMIT 1)
            )
        FROM student_scores ss
        JOIN assessments a ON ss.assessment_id = a.id
        JOIN class_subjects cs ON a.class_subject_id = cs.id
        -- Match any subject that looks like Creative Arts (including old duplicates)
        JOIN subjects s ON cs.subject_id = s.id
        -- Ensure student actually exists (Filter out deleted students)
        JOIN students stud ON ss.student_id = stud.id
        WHERE s.name ILIKE '%Creative Arts%'
        GROUP BY ss.student_id, a.term_id
        ON CONFLICT (student_id, subject_id, term_id) 
        DO UPDATE SET
            class_score = EXCLUDED.class_score,
            total = EXCLUDED.class_score + scores.exam_score, -- Preserve existing exam score
            updated_at = NOW();
    END IF;

    -- [B] SYNC COMPUTING
    IF comp_id IS NOT NULL THEN
        RAISE NOTICE 'Syncing Computing...';
        
        INSERT INTO scores (student_id, subject_id, term_id, class_score, exam_score, total, grade, remarks, created_at, updated_at, teacher_id)
        SELECT 
            ss.student_id,
            comp_id, -- Force Master ID
            a.term_id,
            ROUND( (SUM(ss.score) / GREATEST(SUM(a.max_score), 1)) * class_pct, 2 ),
            0,
            ROUND( (SUM(ss.score) / GREATEST(SUM(a.max_score), 1)) * class_pct, 2 ),
            '9',
            NULL,
            NOW(),
            NOW(),
            COALESCE(
                 MAX(a.created_by::text)::uuid, 
                 (SELECT id FROM teachers WHERE status = 'active' LIMIT 1)
            )
        FROM student_scores ss
        JOIN assessments a ON ss.assessment_id = a.id
        JOIN class_subjects cs ON a.class_subject_id = cs.id
        JOIN subjects s ON cs.subject_id = s.id
        -- Ensure student actually exists
        JOIN students stud ON ss.student_id = stud.id
        WHERE s.name ILIKE '%Computing%' OR s.name ILIKE '%ICT%'
        GROUP BY ss.student_id, a.term_id
        ON CONFLICT (student_id, subject_id, term_id) 
        DO UPDATE SET
            class_score = EXCLUDED.class_score,
            total = EXCLUDED.class_score + scores.exam_score,
            updated_at = NOW();
    END IF;

    -- 4. RECALCULATE GRADES AND REMARKS (Post-Update)
    -- Align Remarks with the Grade Labels (HP, P, AP, D, E)
    UPDATE scores
    SET 
        grade = CASE 
            WHEN total >= 80 THEN '1'
            WHEN total >= 70 THEN '2'
            WHEN total >= 60 THEN '3'
            WHEN total >= 50 THEN '4'
            WHEN total >= 45 THEN '5'
            WHEN total >= 40 THEN '6'
            WHEN total >= 35 THEN '7'
            WHEN total >= 30 THEN '8'
            ELSE '9'
        END,
        remarks = CASE 
            WHEN total >= 80 THEN 'High Proficiency'
            WHEN total >= 60 THEN 'Proficiency'
            WHEN total >= 50 THEN 'Approaching Proficiency'
            WHEN total >= 40 THEN 'Developing'
            ELSE 'Emerging'
        END
    WHERE subject_id IN (comp_id, cad_id);

    RAISE NOTICE 'Sync Complete.';
END $$;
