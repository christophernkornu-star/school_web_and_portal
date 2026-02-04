-- Function to merge two subjects (moving all related data)
CREATE OR REPLACE FUNCTION merge_subjects(target_uuid UUID, source_uuid UUID) RETURNS void AS $$
BEGIN
    IF target_uuid = source_uuid THEN RETURN; END IF;

    -- 1. Scores: Move scores from source to target
    -- Use UPDATE with conflict avoidance (if target already has score for same student/term, keep target, else move source)
    UPDATE scores 
    SET subject_id = target_uuid 
    WHERE subject_id = source_uuid 
    AND NOT EXISTS (
        SELECT 1 FROM scores s2 
        WHERE s2.student_id = scores.student_id 
        AND s2.term_id = scores.term_id 
        AND s2.subject_id = target_uuid
    );
    -- Delete any remaining scores associated with source (duplicates/conflicts)
    DELETE FROM scores WHERE subject_id = source_uuid;

    -- 2. Class Subjects: Move linkages
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

    -- 3. Teacher Assignments: Move linkages
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

    -- 4. Delete Source Subject
    DELETE FROM subjects WHERE id = source_uuid;
END;
$$ LANGUAGE plpgsql;

-- Procedure to find and fix the specific duplicates for Computing and Creative Arts
DO $$
DECLARE
    comp_master UUID;
    comp_row RECORD;
    
    cad_master UUID;
    cad_row RECORD;
BEGIN
    RAISE NOTICE 'Starting Subject Consolidation...';

    -- ==========================================
    -- 1. FIX COMPUTING DUPLICATES
    -- ==========================================
    
    -- Find the "Master" Computing subject (preferably one with 'jhs' level, or first available)
    SELECT id INTO comp_master FROM subjects WHERE trim(name) ILIKE 'Computing' AND level = 'jhs' LIMIT 1;
    
    IF comp_master IS NULL THEN
        -- Fallback: Find ANY computing
        SELECT id INTO comp_master FROM subjects WHERE trim(name) ILIKE 'Computing' LIMIT 1;
        
        -- If found, ensure it is JHS
        IF comp_master IS NOT NULL THEN
            UPDATE subjects SET level = 'jhs', name = 'Computing' WHERE id = comp_master;
        ELSE
            -- Create if totally missing
            INSERT INTO subjects (name, code, level, description) VALUES ('Computing', 'COMP', 'jhs', 'Computing / ICT') RETURNING id INTO comp_master;
        END IF;
    END IF;

    RAISE NOTICE 'Master Computing ID: %', comp_master;

    -- Loop through ALL subjects that look like 'Computing' (case insensitive, wildcard) and are NOT the master
    -- This catches 'COMPUTING', 'Computing ', 'computing'
    FOR comp_row IN SELECT id, name FROM subjects WHERE trim(name) ILIKE 'Computing%' AND id != comp_master LOOP
        RAISE NOTICE 'Merging duplicate Computing: % (%)', comp_row.name, comp_row.id;
        PERFORM merge_subjects(comp_master, comp_row.id);
    END LOOP;


    -- ==========================================
    -- 2. FIX CREATIVE ARTS & DESIGN (JHS)
    -- ==========================================

    -- Find Master "Creative Arts & Design" for JHS
    SELECT id INTO cad_master FROM subjects WHERE name = 'Creative Arts & Design' AND level = 'jhs' LIMIT 1;

    IF cad_master IS NULL THEN
        -- Create if missing
        INSERT INTO subjects (name, code, level, description) VALUES ('Creative Arts & Design', 'CAD', 'jhs', 'Creative Arts & Design (JHS)') RETURNING id INTO cad_master;
    END IF;

    RAISE NOTICE 'Master CAD ID: %', cad_master;

    -- Merge duplicates of "Creative Arts & Design" (if any exist due to whitespace/case)
    FOR cad_row IN SELECT id, name FROM subjects WHERE trim(name) ILIKE 'Creative Arts & Design%' AND id != cad_master LOOP
        RAISE NOTICE 'Merging duplicate CAD: % (%)', cad_row.name, cad_row.id;
        PERFORM merge_subjects(cad_master, cad_row.id);
    END LOOP;

    -- Merge old "Creative Arts" (ONLY if JHS or No Level)
    -- We assume "Creative Arts" with 'lower_primary' is valid and should stay separate.
    FOR cad_row IN SELECT id, name FROM subjects 
                   WHERE trim(name) ILIKE 'Creative Arts' 
                   AND (level = 'jhs' OR level IS NULL) 
                   AND id != cad_master 
    LOOP
        RAISE NOTICE 'Merging legacy Creative Arts into CAD: % (%)', cad_row.name, cad_row.id;
        PERFORM merge_subjects(cad_master, cad_row.id);
    END LOOP;

    -- 3. FIX INCORRECT USAGE OF 'CREATIVE ARTS' IN JHS
    -- Sometimes 'Creative Arts' (Lower Primary) is assigned to JHS classes instead of 'Creative Arts & Design'
    -- We need to move those specific records without deleting the 'Creative Arts' subject itself
    -- ==========================================
    
    DECLARE
        ca_ids UUID[];
        jhs_class_ids UUID[];
    BEGIN
        -- Get all IDs for "Creative Arts" (not & Design)
        SELECT array_agg(id) INTO ca_ids FROM subjects WHERE name = 'Creative Arts';
        
        -- Get all JHS Class IDs
        SELECT array_agg(id) INTO jhs_class_ids FROM classes WHERE level = 'jhs' OR name ILIKE 'JHS%' OR name ILIKE 'Basic 7' OR name ILIKE 'Basic 8' OR name ILIKE 'Basic 9';
        
        IF ca_ids IS NOT NULL AND jhs_class_ids IS NOT NULL THEN
            RAISE NOTICE 'Moving JHS usage of Creative Arts to Creative Arts & Design...';
            
            -- Move Class Subjects
            UPDATE class_subjects 
            SET subject_id = cad_master 
            WHERE subject_id = ANY(ca_ids) 
            AND class_id = ANY(jhs_class_ids)
            AND NOT EXISTS (
                SELECT 1 FROM class_subjects cs 
                WHERE cs.class_id = class_subjects.class_id 
                AND cs.academic_year = class_subjects.academic_year 
                AND cs.subject_id = cad_master
            );
            
            -- Cleanup duplicates if any
            DELETE FROM class_subjects 
            WHERE subject_id = ANY(ca_ids) 
            AND class_id = ANY(jhs_class_ids);

            -- Move Scores (Complex Join required to check student class)
            -- We'll do it by finding scores linked to these subjects and students in JHS classes
            UPDATE scores
            SET subject_id = cad_master
            WHERE subject_id = ANY(ca_ids)
            AND student_id IN (SELECT id FROM students WHERE class_id = ANY(jhs_class_ids))
            AND NOT EXISTS (
                SELECT 1 FROM scores s2
                WHERE s2.student_id = scores.student_id
                AND s2.term_id = scores.term_id
                AND s2.subject_id = cad_master
            );
            
            -- Assignments
            UPDATE teacher_subject_assignments
            SET subject_id = cad_master
            WHERE subject_id = ANY(ca_ids)
            AND class_id = ANY(jhs_class_ids)
            AND NOT EXISTS (
                SELECT 1 FROM teacher_subject_assignments tsa
                WHERE tsa.teacher_id = teacher_subject_assignments.teacher_id
                AND tsa.class_id = teacher_subject_assignments.class_id
                AND tsa.subject_id = cad_master
            );
             DELETE FROM teacher_subject_assignments 
            WHERE subject_id = ANY(ca_ids) 
            AND class_id = ANY(jhs_class_ids);
            
            RAISE NOTICE 'JHS Creative Arts usage migrated.';
        END IF;
    END;

    RAISE NOTICE 'Consolidation Complete.';
END $$;
