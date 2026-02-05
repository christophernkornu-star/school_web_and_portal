-- =================================================================
-- ADD COMPUTING TO UPPER PRIMARY (BASIC 4, 5, 6)
-- =================================================================

DO $$
DECLARE
    comp_id UUID;
    class_row RECORD;
    term_id UUID;
    current_year_id UUID;
BEGIN
    -- 1. Ensure 'Computing' exists for Upper Primary
    SELECT id INTO comp_id FROM subjects WHERE name = 'Computing' AND level = 'upper_primary';
    
    IF comp_id IS NULL THEN
        INSERT INTO subjects (name, code, level, description)
        VALUES ('Computing', 'COMP-UP', 'upper_primary', 'Computing / ICT for Upper Primary')
        RETURNING id INTO comp_id;
        RAISE NOTICE 'Created new Computing subject for Upper Primary: %', comp_id;
    ELSE
        RAISE NOTICE 'Found existing Computing subject for Upper Primary: %', comp_id;
    END IF;

    -- 2. Get Current Academic Year (just to be safe, though usually we link generally)
    -- If you track class_subjects by year, we need the active year.
    -- For now, we'll try to insert for ALL matching classes regardless of year 
    -- or assume the system uses unique (class_id, subject_id) pair for current state.
    
    -- Find Upper Primary Classes
    FOR class_row IN 
        SELECT id, name 
        FROM classes 
        WHERE level = 'upper_primary' 
           OR name ILIKE 'Basic 4%' 
           OR name ILIKE 'Basic 5%' 
           OR name ILIKE 'Basic 6%'
    LOOP
        RAISE NOTICE 'Assigning Computing to Class: % (%)', class_row.name, class_row.id;
        
        -- Insert into class_subjects if not exists
        INSERT INTO class_subjects (class_id, subject_id, academic_year)
        SELECT 
            class_row.id, 
            comp_id, 
            (SELECT setting_value FROM system_settings WHERE setting_key = 'current_academic_year' LIMIT 1)
        WHERE NOT EXISTS (
            SELECT 1 FROM class_subjects 
            WHERE class_id = class_row.id 
            AND subject_id = comp_id
        );

        -- 3. Auto-Assign to Class Teacher (if found)
        -- This ensures the class teacher can immediately see the subject in "Review Assessments"
        -- NOTE: We adapt to the schema that might not have 'academic_year' in teacher_subject_assignments
        INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id)
        SELECT 
            tca.teacher_id,
            comp_id,
            class_row.id
        FROM teacher_class_assignments tca
        WHERE tca.class_id = class_row.id
          AND tca.is_class_teacher = true
        ON CONFLICT (teacher_id, subject_id, class_id) DO NOTHING;
        
        RAISE NOTICE 'Attempted auto-assign to class teacher for %', class_row.name;

    END LOOP;

    RAISE NOTICE 'Computing added to Upper Primary successfully.';
END $$;
