-- Ensure class_exercises table exists (Fixed version with correct FK)
CREATE TABLE IF NOT EXISTS class_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  
  -- Exercise details
  exercise_name VARCHAR(255) NOT NULL, -- e.g., "Quiz 1", "Assignment 2"
  exercise_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Scoring
  score_obtained DECIMAL(5,2) NOT NULL CHECK (score_obtained >= 0),
  max_score DECIMAL(5,2) NOT NULL CHECK (max_score > 0),
  
  -- Metadata
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_exercise_per_date UNIQUE (student_id, subject_id, term_id, exercise_name, exercise_date)
);

-- Enable RLS for class_exercises if newly created
ALTER TABLE class_exercises ENABLE ROW LEVEL SECURITY;

-- Helper function to calculate class score total (if not exists or needs update)
CREATE OR REPLACE FUNCTION calculate_class_score_total(
  p_student_id UUID,
  p_subject_id UUID,
  p_term_id UUID
)
RETURNS TABLE (
  total_obtained DECIMAL,
  total_max DECIMAL,
  percentage DECIMAL,
  converted_score DECIMAL -- Converted to max 40
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(score_obtained), 0) as total_obtained,
    COALESCE(SUM(max_score), 0) as total_max,
    CASE 
      WHEN COALESCE(SUM(max_score), 0) > 0 
      THEN (COALESCE(SUM(score_obtained), 0) / COALESCE(SUM(max_score), 1)) * 100
      ELSE 0
    END as percentage,
    CASE 
      WHEN COALESCE(SUM(max_score), 0) > 0 
      THEN ((COALESCE(SUM(score_obtained), 0) / COALESCE(SUM(max_score), 1)) * 100) * 0.4
      ELSE 0
    END as converted_score
  FROM class_exercises
  WHERE student_id = p_student_id
    AND subject_id = p_subject_id
    AND term_id = p_term_id;
END;
$$ LANGUAGE plpgsql;

-- Main Sync Function
CREATE OR REPLACE FUNCTION sync_scores_to_gradebook(p_quiz_id UUID)
RETURNS VOID 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quiz RECORD;
    v_attempt RECORD;
    v_class_score_val DECIMAL;
    v_exam_score_val DECIMAL;
BEGIN
    -- Get quiz details
    SELECT * INTO v_quiz FROM online_quizzes WHERE id = p_quiz_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz not found';
    END IF;

    -- Loop through valid attempts
    FOR v_attempt IN 
        SELECT student_id, score 
        FROM student_quiz_attempts 
        WHERE quiz_id = p_quiz_id AND status IN ('submitted', 'graded')
    LOOP
        -- Logic splits here based on Category
        
        IF v_quiz.category = 'Exam' THEN
            -- Calculate Exam Score (Scaled to 60)
            IF v_quiz.total_points > 0 THEN
                v_exam_score_val := (v_attempt.score / v_quiz.total_points) * 60;
            ELSE
                v_exam_score_val := 0;
            END IF;

            -- Update scores table directly for Exam
            INSERT INTO scores (student_id, subject_id, term_id, teacher_id, class_score, exam_score, total, grade, remarks)
            VALUES (
                v_attempt.student_id, 
                v_quiz.subject_id, 
                v_quiz.term_id, 
                v_quiz.teacher_id, 
                0, -- Initial class score if new record
                v_exam_score_val, 
                v_exam_score_val, -- Initial total
                'F', -- Placeholder
                'Imported from Exam Quiz'
            )
            ON CONFLICT (student_id, subject_id, term_id) 
            DO UPDATE SET 
                exam_score = EXCLUDED.exam_score,
                total = scores.class_score + EXCLUDED.exam_score,
                teacher_id = EXCLUDED.teacher_id, -- Update teacher if changed
                updated_at = NOW();
            
        ELSE
            -- For Assignments/Tests: Insert into class_exercises
            INSERT INTO class_exercises (
                student_id, subject_id, term_id, teacher_id, 
                exercise_name, exercise_date, 
                score_obtained, max_score
            )
            VALUES (
                v_attempt.student_id,
                v_quiz.subject_id,
                v_quiz.term_id,
                v_quiz.teacher_id,
                v_quiz.title,
                CURRENT_DATE,
                v_attempt.score,
                v_quiz.total_points
            )
            ON CONFLICT (student_id, subject_id, term_id, exercise_name, exercise_date)
            DO UPDATE SET
                score_obtained = EXCLUDED.score_obtained,
                max_score = EXCLUDED.max_score,
                updated_at = NOW();

            -- Recalculate Total Class Score
            SELECT converted_score INTO v_class_score_val 
            FROM calculate_class_score_total(v_attempt.student_id, v_quiz.subject_id, v_quiz.term_id);

            -- Update scores table
             INSERT INTO scores (student_id, subject_id, term_id, teacher_id, class_score, exam_score, total, grade, remarks)
            VALUES (
                v_attempt.student_id, 
                v_quiz.subject_id, 
                v_quiz.term_id, 
                v_quiz.teacher_id, 
                v_class_score_val,
                0, -- Initial exam score
                v_class_score_val, 
                'F',
                'Updated via Class Work'
            )
            ON CONFLICT (student_id, subject_id, term_id) 
            DO UPDATE SET 
                class_score = v_class_score_val,
                total = v_class_score_val + scores.exam_score,
                teacher_id = EXCLUDED.teacher_id,
                updated_at = NOW();

        END IF;
        
        -- Finally, update the grade based on TOTAL (WAEC Standard)
        UPDATE scores 
        SET grade = CASE 
            WHEN total >= 80 THEN 'A1'
            WHEN total >= 70 THEN 'B2'
            WHEN total >= 65 THEN 'B3'
            WHEN total >= 60 THEN 'C4'
            WHEN total >= 55 THEN 'C5'
            WHEN total >= 50 THEN 'C6'
            WHEN total >= 45 THEN 'D7'
            WHEN total >= 40 THEN 'E8'
            ELSE 'F9'
        END
        WHERE student_id = v_attempt.student_id 
          AND subject_id = v_quiz.subject_id 
          AND term_id = v_quiz.term_id;

    END LOOP;
END;
$$ LANGUAGE plpgsql;
