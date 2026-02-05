-- =================================================================
-- MASTER FIX SCRIPT
-- Purpose: Fix Schema, Consolidate Duplicates, Fix JHS Subjects
-- =================================================================

-- 1. SCHEMA UPDATES (TEACHERS TABLE)
-- -----------------------------------------------------------------
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Other'));

ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. STANDARDIZE CLASS LEVELS
-- -----------------------------------------------------------------
-- Ensure Basic 7, 8, 9 are marked as 'jhs' level (This is critical for Report Cards)
UPDATE classes SET level = 'jhs' WHERE name ILIKE 'Basic 7%' OR name ILIKE 'JHS 1%';
UPDATE classes SET level = 'jhs' WHERE name ILIKE 'Basic 8%' OR name ILIKE 'JHS 2%';
UPDATE classes SET level = 'jhs' WHERE name ILIKE 'Basic 9%' OR name ILIKE 'JHS 3%';

-- 3. DEFINE MERGE UTILITY
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION merge_subjects(target_uuid UUID, source_uuid UUID) RETURNS void AS $$
BEGIN
    IF target_uuid = source_uuid THEN RETURN; END IF;

    -- Scores: Move scores from source to target
    UPDATE scores 
    SET subject_id = target_uuid 
    WHERE subject_id = source_uuid 
    AND NOT EXISTS (
        SELECT 1 FROM scores s2 
        WHERE s2.student_id = scores.student_id 
        AND s2.term_id = scores.term_id 
        AND s2.subject_id = target_uuid
    );
    DELETE FROM scores WHERE subject_id = source_uuid;

    -- Class Subjects: Move linkages
    UPDATE class_subjects 
    SET subject_id = target_uuid 
    WHERE subject_id = source_uuid
    AND NOT EXISTS (
        SELECT 1 FROM class_subjects cs
        WHERE cs.class_id = class_subjects.class_id 
        AND cs.academic_year = class_subjects.academic_year
        AND cs.subject_id = target_uuid
    );
    DELETE FROM class_subjects WHERE subject_id = source_uuid;

    -- Teacher Assignments: Move linkages
    UPDATE teacher_subject_assignments 
    SET subject_id = target_uuid 
    WHERE subject_id = source_uuid
    AND NOT EXISTS (
        SELECT 1 FROM teacher_subject_assignments tsa
        WHERE tsa.teacher_id = teacher_subject_assignments.teacher_id
        AND tsa.class_id = teacher_subject_assignments.class_id
        AND tsa.subject_id = target_uuid
    );
    DELETE FROM teacher_subject_assignments WHERE subject_id = source_uuid;

    -- Delete Source Subject
    DELETE FROM subjects WHERE id = source_uuid;
END;
$$ LANGUAGE plpgsql;

-- 4. EXECUTE CONSOLIDATION LOGIC
-- -----------------------------------------------------------------
DO $$
DECLARE
    comp_master UUID;
    comp_row RECORD;
    cad_master UUID;
    cad_row RECORD;
    ca_ids UUID[];
    jhs_class_ids UUID[];
BEGIN
    RAISE NOTICE 'Starting Master Fix...';

    -- [A] COMPUTING CONSOLIDATION
    SELECT id INTO comp_master FROM subjects WHERE trim(name) ILIKE 'Computing' AND level = 'jhs' LIMIT 1;
    IF comp_master IS NULL THEN
        SELECT id INTO comp_master FROM subjects WHERE trim(name) ILIKE 'Computing' LIMIT 1;
        IF comp_master IS NOT NULL THEN
            UPDATE subjects SET level = 'jhs', name = 'Computing' WHERE id = comp_master;
        ELSE
            INSERT INTO subjects (name, code, level, description) VALUES ('Computing', 'COMP', 'jhs', 'Computing / ICT') RETURNING id INTO comp_master;
        END IF;
    END IF;

    FOR comp_row IN SELECT id, name FROM subjects WHERE trim(name) ILIKE 'Computing%' AND id != comp_master LOOP
        PERFORM merge_subjects(comp_master, comp_row.id);
    END LOOP;

    -- [B] CREATIVE ARTS & DESIGN CONSOLIDATION
    SELECT id INTO cad_master FROM subjects WHERE name = 'Creative Arts & Design' AND level = 'jhs' LIMIT 1;
    IF cad_master IS NULL THEN
        INSERT INTO subjects (name, code, level, description) VALUES ('Creative Arts & Design', 'CAD', 'jhs', 'Creative Arts & Design (JHS)') RETURNING id INTO cad_master;
    END IF;
    
    -- Ensure master has correct level
    UPDATE subjects SET level = 'jhs' WHERE id = cad_master;

    -- Merge exact duplicates of "Creative Arts & Design"
    FOR cad_row IN SELECT id, name FROM subjects WHERE trim(name) ILIKE 'Creative Arts & Design%' AND id != cad_master LOOP
        PERFORM merge_subjects(cad_master, cad_row.id);
    END LOOP;

    -- [C] MIGRATE 'CREATIVE ARTS' USAGE IN JHS
    -- Identify 'Creative Arts' subjects (typically for Primary)
    SELECT array_agg(id) INTO ca_ids FROM subjects WHERE name = 'Creative Arts';
    -- Identify JHS Classes
    SELECT array_agg(id) INTO jhs_class_ids FROM classes WHERE level = 'jhs' OR name ILIKE 'Basic 7%' OR name ILIKE 'Basic 8%' OR name ILIKE 'Basic 9%' OR name ILIKE 'JHS%';

    IF ca_ids IS NOT NULL AND jhs_class_ids IS NOT NULL THEN
        -- Linkages in ClassSubjects
        UPDATE class_subjects 
        SET subject_id = cad_master 
        WHERE subject_id = ANY(ca_ids) AND class_id = ANY(jhs_class_ids)
        AND NOT EXISTS (SELECT 1 FROM class_subjects cs WHERE cs.class_id = class_subjects.class_id AND cs.subject_id = cad_master);
        
        DELETE FROM class_subjects WHERE subject_id = ANY(ca_ids) AND class_id = ANY(jhs_class_ids);

        -- Linkages in Scores
        -- Move scores for JHS students derived from 'Creative Arts' to 'Creative Arts & Design'
        UPDATE scores
        SET subject_id = cad_master
        WHERE subject_id = ANY(ca_ids)
        AND student_id IN (SELECT id FROM students WHERE class_id = ANY(jhs_class_ids))
        AND NOT EXISTS (SELECT 1 FROM scores s2 WHERE s2.student_id = scores.student_id AND s2.term_id = scores.term_id AND s2.subject_id = cad_master);

        DELETE FROM scores WHERE subject_id = ANY(ca_ids) AND student_id IN (SELECT id FROM students WHERE class_id = ANY(jhs_class_ids));

        -- Linkages in Teacher Assignments
        UPDATE teacher_subject_assignments
        SET subject_id = cad_master
        WHERE subject_id = ANY(ca_ids) AND class_id = ANY(jhs_class_ids)
        AND NOT EXISTS (SELECT 1 FROM teacher_subject_assignments tsa WHERE tsa.teacher_id = teacher_subject_assignments.teacher_id AND tsa.class_id = teacher_subject_assignments.class_id AND tsa.subject_id = cad_master);

        DELETE FROM teacher_subject_assignments WHERE subject_id = ANY(ca_ids) AND class_id = ANY(jhs_class_ids);
    END IF;

    -- [D] SAFETY NET: RECALCULATE AGGREGATES FOR JHS
    -- If scores are in student_scores but missing from scores table, this fills the gap.
    -- We must provide a teacher_id. We try to find it from the assessment creator or the class teacher assignment.
    -- Added exam_score and total to satisfy constraints.
    INSERT INTO scores (student_id, subject_id, term_id, class_score, exam_score, total, grade, remarks, created_at, updated_at, teacher_id)
    SELECT 
        ss.student_id,
        cs.subject_id,
        a.term_id,
        SUM(ss.score),
        0, -- Default exam score to 0
        SUM(ss.score), -- Final Total = Class Score + 0
        -- Default Grade (Constraint Fix)
        CASE 
            WHEN SUM(ss.score) >= 80 THEN 'A'
            WHEN SUM(ss.score) >= 50 THEN 'C'
            ELSE 'F'
        END,
        'Auto-Generated', -- Default Remarks
        NOW(),
        NOW(),
        -- Try to find a valid teacher_id
        COALESCE(
            MAX(a.created_by::text)::uuid, -- Creator of the assessment
            (SELECT teacher_id FROM teacher_subject_assignments tsa WHERE tsa.class_id = cs.class_id AND tsa.subject_id = cs.subject_id LIMIT 1),
            (SELECT id FROM teachers WHERE status = 'active' LIMIT 1) -- Fallback to any active teacher to prevent crash
        )
    FROM student_scores ss
    JOIN assessments a ON ss.assessment_id = a.id
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    JOIN classes c ON cs.class_id = c.id
    WHERE c.level = 'jhs' AND cs.subject_id = cad_master -- Focus on CAD for now
    GROUP BY ss.student_id, cs.subject_id, a.term_id, cs.class_id
    ON CONFLICT (student_id, subject_id, term_id) 
    DO NOTHING; -- Don't overwrite existing calculated scores, just fill gaps

    RAISE NOTICE 'Master Fix Complete.';
END $$;
