DO $$
DECLARE
    class_id UUID;
    subject_id UUID;
    cs_rec RECORD;
    assess_rec RECORD;
    score_count INTEGER;
BEGIN
    -- 1. Get IDs
    SELECT id INTO class_id FROM classes WHERE name ILIKE '%Basic 5%' LIMIT 1;
    SELECT id INTO subject_id FROM subjects WHERE name = 'Computing' AND level = 'upper_primary' LIMIT 1;

    RAISE NOTICE 'Class ID: %, Subject ID: %', class_id, subject_id;

    -- 2. Check Class Subjects
    RAISE NOTICE '--- Class Subjects ---';
    FOR cs_rec IN 
        SELECT id, academic_year, teacher_id 
        FROM class_subjects 
        WHERE class_id = class_id AND subject_id = subject_id
    LOOP
        RAISE NOTICE 'CS ID: %, Year: %, Teacher: %', cs_rec.id, cs_rec.academic_year, cs_rec.teacher_id;
        
        -- 3. Check Assessments for this CS
        FOR assess_rec IN 
            SELECT id, title, term_id 
            FROM assessments 
            WHERE class_subject_id = cs_rec.id
        LOOP
            RAISE NOTICE '  -> Assessment: %, Title: %, Term: %', assess_rec.id, assess_rec.title, assess_rec.term_id;
        END LOOP;
    END LOOP;

    -- 4. Check Scores
    SELECT COUNT(*) INTO score_count 
    FROM scores 
    WHERE subject_id = subject_id 
    AND student_id IN (SELECT id FROM students WHERE class_id = class_id);
    
    RAISE NOTICE '--- Scores ---';
    RAISE NOTICE 'Total Scores found for Basic 5 Computing: %', score_count;

END $$;
