-- =================================================================
-- FIX DUPLICATE CLASS SUBJECTS FOR UPPER PRIMARY COMPUTING
-- =================================================================
-- This script merges duplicate 'Computing' subject links for Basic 4, 5, 6
-- so that all assessments appear under a single "folder" (Class Subject).

DO $$
DECLARE
    r RECORD;
    comp_id UUID;
    keep_cs_id UUID;
    dup_cs_id UUID;
    moved_count INT;
BEGIN
    -- 1. Get Computing Subject ID
    SELECT id INTO comp_id FROM subjects WHERE name = 'Computing' AND level = 'upper_primary';
    
    IF comp_id IS NULL THEN
        RAISE NOTICE 'Computing (Upper Primary) not found. Skipping.';
        RETURN;
    END IF;

    -- 2. Loop through Upper Primary Classes (Basic 4, 5, 6)
    FOR r IN 
        SELECT id, name FROM classes 
        WHERE level = 'upper_primary' 
           OR name ILIKE 'Basic 4%' 
           OR name ILIKE 'Basic 5%' 
           OR name ILIKE 'Basic 6%'
    LOOP
        RAISE NOTICE 'Checking duplicates for: %', r.name;

        -- Find the "Master" Class Subject (Prefer one with current academic year, or just newest)
        -- We'll pick the most recently created one as the "Master" (Winner)
        SELECT id INTO keep_cs_id
        FROM class_subjects
        WHERE class_id = r.id AND subject_id = comp_id
        ORDER BY created_at DESC
        LIMIT 1;

        IF keep_cs_id IS NOT NULL THEN
            RAISE NOTICE '  Master Class Subject ID: %', keep_cs_id;

            -- Find "Duplicate" (Loser) IDs
            FOR dup_cs_id IN 
                SELECT id FROM class_subjects
                WHERE class_id = r.id 
                  AND subject_id = comp_id 
                  AND id != keep_cs_id
            LOOP
                RAISE NOTICE '  Found Duplicate ID: %. Moving content...', dup_cs_id;

                -- Move Assessments
                UPDATE assessments 
                SET class_subject_id = keep_cs_id 
                WHERE class_subject_id = dup_cs_id;
                
                GET DIAGNOSTICS moved_count = ROW_COUNT;
                RAISE NOTICE '    Moved % assessments.', moved_count;

                -- Delete the Duplicate Class Subject
                DELETE FROM class_subjects WHERE id = dup_cs_id;
                RAISE NOTICE '    Duplicate deleted.';
            END LOOP;
        ELSE
            RAISE NOTICE '  No Class Subject found for Computing in this class.';
        END IF;

    END LOOP;

    RAISE NOTICE 'Consolidation complete. All assessments should now be visible.';
END $$;
