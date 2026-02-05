
-- Verify Scores Consistency for Creative Arts
DO $$
DECLARE
    subj_id UUID;
    stud_id UUID;
    score_row RECORD;
    calc_score NUMERIC;
BEGIN
    -- Get Subject
    SELECT id INTO subj_id FROM subjects WHERE name ILIKE '%Creative Arts & Design%' AND level = 'jhs' LIMIT 1;
    -- Get Student (Abakah, Emmanuel)
    SELECT id INTO stud_id FROM students WHERE student_id = 'STU2416' LIMIT 1;

    RAISE NOTICE 'Checking Data for Student % and Subject %', stud_id, subj_id;

    -- Get Current Aggregate Score
    SELECT * INTO score_row FROM scores WHERE student_id = stud_id AND subject_id = subj_id;
    
    RAISE NOTICE 'Current Score Table: Class=%, Exam=%, Total=%', score_row.class_score, score_row.exam_score, score_row.total;

    -- Calculate from Raw Data
    SELECT SUM(ss.score) INTO calc_score
    FROM student_scores ss 
    JOIN assessments a ON ss.assessment_id = a.id 
    JOIN class_subjects cs ON a.class_subject_id = cs.id
    WHERE ss.student_id = stud_id 
    AND cs.subject_id = subj_id;

    RAISE NOTICE 'Calculated from Assessments: %', calc_score;
END $$;
