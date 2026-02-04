-- Fix Creative Arts & Design for JHS

-- 1. Ensure the subject exists and has the correct name and level
-- Try to find 'Creative Arts' assigned to JHS or 'Creative Arts & Design'
-- and update/insert to ensure it is 'jhs' level.

-- Fix Creative Arts & Design for JHS - Validated Version

DO $$
DECLARE
    target_id UUID;
    old_id UUID;
BEGIN
    -- 1. Identify IDs
    SELECT id INTO target_id FROM subjects WHERE name = 'Creative Arts & Design';
    
    -- Look for 'Creative Arts' intended for JHS or generic
    SELECT id INTO old_id FROM subjects WHERE name = 'Creative Arts' AND (level = 'jhs' OR level IS NULL) LIMIT 1;
    
    RAISE NOTICE 'Target ID: %, Old ID: %', target_id, old_id;

    IF target_id IS NOT NULL AND old_id IS NOT NULL AND target_id != old_id THEN
        -- Case 1: Both exist. MERGE old_id INTO target_id.
        RAISE NOTICE 'Merging Creative Arts into Creative Arts & Design';
        
        -- A. Move Class Subjects
        -- Update references where no conflict exists
        UPDATE class_subjects SET subject_id = target_id 
        WHERE subject_id = old_id 
        AND NOT EXISTS (
            SELECT 1 FROM class_subjects cs 
            WHERE cs.class_id = class_subjects.class_id 
            AND cs.subject_id = target_id
            AND cs.academic_year = class_subjects.academic_year
        );
        -- Delete remaining old references (duplicates)
        DELETE FROM class_subjects WHERE subject_id = old_id;
        
        -- B. Move Scores
        -- Update scores where target doesn't exist for same student/term
        UPDATE scores SET subject_id = target_id 
        WHERE subject_id = old_id 
        AND NOT EXISTS (
            SELECT 1 FROM scores s2 
            WHERE s2.student_id = scores.student_id 
            AND s2.term_id = scores.term_id 
            AND s2.subject_id = target_id
        );
        -- Delete remaining scores for old_id (duplicates)
        DELETE FROM scores WHERE subject_id = old_id;

        -- C. Move Teacher Assignments
        UPDATE teacher_subject_assignments SET subject_id = target_id 
        WHERE subject_id = old_id
        AND NOT EXISTS (
            SELECT 1 FROM teacher_subject_assignments tsa
            WHERE tsa.teacher_id = teacher_subject_assignments.teacher_id
            AND tsa.class_id = teacher_subject_assignments.class_id
            AND tsa.subject_id = target_id
        );
        DELETE FROM teacher_subject_assignments WHERE subject_id = old_id;

        -- D. Delete old subject
        DELETE FROM subjects WHERE id = old_id;
        
        -- Ensure target is JHS
        UPDATE subjects SET level = 'jhs' WHERE id = target_id;

    ELSIF target_id IS NOT NULL AND old_id IS NULL THEN
        -- Case 2: Only target exists.
        UPDATE subjects SET level = 'jhs' WHERE id = target_id;
        
    ELSIF target_id IS NULL AND old_id IS NOT NULL THEN
        -- Case 3: Only old exists. Rename it.
        -- Check if 'CAD' code is taken
        BEGIN
            UPDATE subjects SET name = 'Creative Arts & Design', level = 'jhs', code = 'CAD' WHERE id = old_id;
        EXCEPTION WHEN unique_violation THEN
            -- If code CAD is taken by another subject? Use existing code or CAD_JHS
            UPDATE subjects SET name = 'Creative Arts & Design', level = 'jhs' WHERE id = old_id;
        END;
        
    ELSIF target_id IS NULL AND old_id IS NULL THEN
        -- Case 4: Neither exists. Create new.
        BEGIN
            INSERT INTO subjects (name, code, level, description)
            VALUES ('Creative Arts & Design', 'CAD', 'jhs', 'Creative Arts and Design for JHS');
        EXCEPTION WHEN unique_violation THEN
            -- Handled
            NULL;
        END;
    END IF;

END $$;

-- Verify Computing is also JHS
UPDATE subjects SET level = 'jhs' WHERE name = 'Computing' AND level IS NULL;
UPDATE subjects SET level = 'jhs' WHERE name = 'Career Technology' AND level IS NULL;

-- Fix potentially missing level for other JHS subjects
UPDATE subjects SET level = 'jhs' WHERE name ILIKE '%Language%' AND level IS NULL; -- English, Ghanaian Language
UPDATE subjects SET level = 'jhs' WHERE name = 'Mathematics' AND level IS NULL;
UPDATE subjects SET level = 'jhs' WHERE name = 'Social Studies' AND level IS NULL;
UPDATE subjects SET level = 'jhs' WHERE name = 'Science' AND level IS NULL; -- Integrated Science

-- Ensure Basic 7, 8, 9 are strictly 'jhs'
UPDATE classes SET level = 'jhs' WHERE name IN ('Basic 7', 'Basic 8', 'Basic 9', 'JHS 1', 'JHS 2', 'JHS 3');

-- Ensure Computing is JHS
UPDATE subjects SET level = 'jhs' WHERE name = 'Computing';

-- Ensure Creative Arts is not JHS (it's lower primary usually)
UPDATE subjects SET level = 'lower_primary' WHERE name = 'Creative Arts' AND level = 'jhs'; 
-- (Unless it was the *only* record, in which case the previous block handled it, but this is safety)

-- Ensure "Creative Arts & Design" is strictly JHS
-- (Handled by the block above)
