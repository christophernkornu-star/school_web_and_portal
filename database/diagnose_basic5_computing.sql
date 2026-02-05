-- =================================================================
-- DIAGNOSTIC: UPPER PRIMARY COMPUTING (BASIC 5)
-- =================================================================

DO $$
DECLARE
    basic5_id UUID;
    comp_id UUID;
    active_term_id UUID;
    active_term_name TEXT;
    
    cs_rec RECORD;
    assess_rec RECORD;
    score_rec RECORD;
    
    term_rec RECORD;
BEGIN
    RAISE NOTICE '=== STARTING DIAGNOSTIC SCAN ===';

    -- 1. Identify Key IDs
    SELECT id INTO basic5_id FROM classes WHERE name ILIKE '%Basic 5%' LIMIT 1;
    SELECT id INTO comp_id FROM subjects WHERE name = 'Computing' AND level = 'upper_primary' LIMIT 1;
    
    SELECT id, name INTO active_term_id, active_term_name 
    FROM academic_terms WHERE is_current = true LIMIT 1;

    RAISE NOTICE 'Class: Basic 5 (ID: %)', basic5_id;
    RAISE NOTICE 'Subject: Computing (ID: %)', comp_id;
    RAISE NOTICE 'Active Term: % (ID: %)', active_term_name, active_term_id;

    -- 2. Inspect Class Subjects (The link between Class and Subject)
    RAISE NOTICE '--- Class Subject Links ---';
    FOR cs_rec IN 
        SELECT id, academic_year, created_at 
        FROM class_subjects 
        WHERE class_id = basic5_id AND subject_id = comp_id
    LOOP
        RAISE NOTICE 'Link ID: %, Year: %, Created: %', cs_rec.id, cs_rec.academic_year, cs_rec.created_at;
        
        -- 3. Inspect Assessments per Link
        RAISE NOTICE '  --> Assessments in this Link:';
        FOR assess_rec IN 
            SELECT id, title, term_id, created_at, (CASE WHEN term_id = active_term_id THEN 'MATCH' ELSE 'MISMATCH' END) as matches_term
            FROM assessments 
            WHERE class_subject_id = cs_rec.id
        LOOP
            SELECT name INTO term_rec FROM academic_terms WHERE id = assess_rec.term_id;
            RAISE NOTICE '      - Assess ID: %, Title: "%"', assess_rec.id, assess_rec.title;
            RAISE NOTICE '        Term ID: % (%) - %', assess_rec.term_id, term_rec.name, assess_rec.matches_term;
        END LOOP;
    END LOOP;

    -- 4. Inspect Scores (What is actually on the report card)
    RAISE NOTICE '--- Actual Scores on Report Card ---';
    FOR score_rec IN
        SELECT count(*) as cnt, term_id
        FROM scores
        WHERE subject_id = comp_id
        AND student_id IN (SELECT id FROM students WHERE class_id = basic5_id)
        GROUP BY term_id
    LOOP
       SELECT name INTO term_rec FROM academic_terms WHERE id = score_rec.term_id;
       RAISE NOTICE 'Term: % (%), Count: %', term_rec.name, score_rec.term_id, score_rec.cnt;
    END LOOP;

    RAISE NOTICE '=== SCAN COMPLETE ===';
END $$;
