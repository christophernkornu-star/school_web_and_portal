-- UPDATE PROMOTIONS LOGIC to Validate Report Cards separate from Class Movement

-- 1. Helper Function: Populate student_promotions without moving students
DROP FUNCTION IF EXISTS calculate_and_save_term3_status(VARCHAR, UUID);

CREATE OR REPLACE FUNCTION calculate_and_save_term3_status(
  p_academic_year VARCHAR(20),
  p_class_id UUID DEFAULT NULL 
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_min_average DECIMAL;
  rec RECORD;
BEGIN
  -- Get system passing average (default 50 if not set)
  SELECT (setting_value)::DECIMAL INTO v_min_average 
  FROM system_settings 
  WHERE setting_key = 'promotion_passing_average';
  
  v_min_average := COALESCE(v_min_average, 50.0);

  -- OPTIMIZED: Set-based operation instead of row-by-row LOOP
  INSERT INTO student_promotions (
      student_id,
      academic_year,
      current_class_id,
      next_class_id,
      promotion_status,
      average_score,
      total_score,
      total_subjects,
      requires_teacher_decision,
      auto_promoted,
      updated_at
  )
  SELECT 
      s.id,
      p_academic_year,
      s.class_id,
      cp.next_class_id,
      CASE 
          WHEN m.average_score >= v_min_average THEN 
              CASE WHEN cp.is_graduation THEN 'graduated' ELSE 'promoted' END
          ELSE 'repeated'
      END,
      m.average_score,
      m.total_score,
      m.total_subjects,
      FALSE, -- Auto calculated
      TRUE,  -- System generated
      NOW()
  FROM students s
  LEFT JOIN class_progression cp ON cp.current_class_id = s.class_id
  CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_academic_year) m
  WHERE s.status = 'active'
    AND (p_class_id IS NULL OR s.class_id = p_class_id)
  ON CONFLICT (student_id, academic_year) 
  DO UPDATE SET
      average_score = EXCLUDED.average_score,
      total_score = EXCLUDED.total_score,
      total_subjects = EXCLUDED.total_subjects,
      promotion_status = CASE 
          WHEN student_promotions.teacher_remarks IS NOT NULL AND student_promotions.teacher_remarks != '' THEN student_promotions.promotion_status
          ELSE EXCLUDED.promotion_status
      END,
      updated_at = NOW();

END;
$$ LANGUAGE plpgsql;


-- 2. Update Admin Decision Function: Only update Status, DO NOT MOVE
DROP FUNCTION IF EXISTS execute_admin_promotion_decision(UUID, VARCHAR, UUID, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION execute_admin_promotion_decision(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_user_id UUID,
  p_status VARCHAR, 
  p_remarks TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_class_id UUID;
  v_current_class_id UUID;
BEGIN
  -- Get student's current class
  SELECT class_id INTO v_current_class_id FROM students WHERE id = p_student_id;
  
  -- Get next class from progression rule
  SELECT next_class_id INTO v_next_class_id 
  FROM class_progression 
  WHERE current_class_id = v_current_class_id;

  -- Upsert into student_promotions
  INSERT INTO student_promotions (
    student_id,
    academic_year,
    current_class_id,
    next_class_id,
    promotion_status,
    teacher_remarks,
    decided_by_teacher_id, 
    decision_date,
    updated_at
  ) VALUES (
    p_student_id,
    p_academic_year,
    v_current_class_id,
    v_next_class_id,
    p_status,
    p_remarks,
    p_user_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, academic_year)
  DO UPDATE SET
    promotion_status = p_status,
    teacher_remarks = p_remarks,
    decision_date = NOW(),
    updated_at = NOW();

  -- NOTE: WE DO NOT UPDATE students TABLE HERE
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;


-- 3. Update Academic Year Transition: This is where movement happens
DROP FUNCTION IF EXISTS execute_academic_year_transition(VARCHAR, VARCHAR);

CREATE OR REPLACE FUNCTION execute_academic_year_transition(
  p_old_academic_year VARCHAR(20),
  p_new_academic_year VARCHAR(20)
)
RETURNS TABLE (
  promoted_count INTEGER,
  repeated_count INTEGER,
  errors TEXT[]
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promoted INTEGER := 0;
  v_repeated INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  rec RECORD;
BEGIN
  -- 1. Ensure all students have a decision record for the old year
  PERFORM calculate_and_save_term3_status(p_old_academic_year);

  -- 2. Process Promotions
  FOR rec IN 
    SELECT * FROM student_promotions 
    WHERE academic_year = p_old_academic_year
  LOOP
    BEGIN
      IF rec.promotion_status IN ('promoted', 'promoted_probation', 'graduated') THEN
        
        -- Graduation Logic
        IF rec.promotion_status = 'graduated' THEN
            UPDATE students SET status = 'graduated' WHERE id = rec.student_id;
            
            INSERT INTO promotion_history (
               student_id, academic_year, from_class_id, to_class_id, action, remarks
            ) VALUES (
               rec.student_id, p_old_academic_year, rec.current_class_id, NULL, 'graduated', 'Year Transition Graduation'
            );
            
        -- Promotion Logic
        ELSIF rec.next_class_id IS NOT NULL THEN
            UPDATE students SET class_id = rec.next_class_id WHERE id = rec.student_id;
            
            INSERT INTO promotion_history (
               student_id, academic_year, from_class_id, to_class_id, action, remarks
            ) VALUES (
               rec.student_id, p_old_academic_year, rec.current_class_id, rec.next_class_id, 'promoted', 'Year Transition Promotion'
            );
        ELSE
             v_errors := array_append(v_errors, 'Student ' || rec.student_id || ' marked promoted but has no next class.');
        END IF;

        v_promoted := v_promoted + 1;

      ELSE
        -- Repeated Logic (Do nothing to class_id)
        INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id, action, remarks
        ) VALUES (
            rec.student_id, p_old_academic_year, rec.current_class_id, rec.current_class_id, 'repeated', 'Year Transition Repeat'
        );
        
        v_repeated := v_repeated + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
       v_errors := array_append(v_errors, 'Error processing student ' || rec.student_id || ': ' || SQLERRM);
    END;
  END LOOP;

  RETURN QUERY SELECT v_promoted, v_repeated, v_errors;
END;
$$ LANGUAGE plpgsql;

-- 4. Lazy Loader for Report Cards
-- Ensures that if a student views their report card, the promotion status is ready on demand
DROP FUNCTION IF EXISTS get_or_create_promotion_status(UUID, VARCHAR);

CREATE OR REPLACE FUNCTION get_or_create_promotion_status(
  p_student_id UUID,
  p_academic_year VARCHAR(20)
)
RETURNS TABLE (
  promotion_status VARCHAR,
  teacher_remarks TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists BOOLEAN;
  v_min_average DECIMAL;
BEGIN
  -- Check if record exists
  SELECT EXISTS (
    SELECT 1 FROM student_promotions 
    WHERE student_id = p_student_id AND academic_year = p_academic_year
  ) INTO v_exists;

  -- If not, generate it for this student only
  IF NOT v_exists THEN
     -- Get min average
     SELECT (setting_value)::DECIMAL INTO v_min_average 
     FROM system_settings WHERE setting_key = 'promotion_passing_average';
     v_min_average := COALESCE(v_min_average, 50.0);

     INSERT INTO student_promotions (
        student_id,
        academic_year,
        current_class_id,
        next_class_id,
        promotion_status,
        average_score,
        total_score,
        total_subjects,
        requires_teacher_decision,
        auto_promoted,
        updated_at
    )
    SELECT 
        s.id,
        p_academic_year,
        s.class_id,
        cp.next_class_id,
        CASE 
            WHEN m.average_score >= v_min_average THEN 
                CASE WHEN cp.is_graduation THEN 'graduated' ELSE 'promoted' END
            ELSE 'repeated'
        END,
        m.average_score,
        m.total_score,
        m.total_subjects,
        FALSE,
        TRUE,
        NOW()
    FROM students s
    LEFT JOIN class_progression cp ON cp.current_class_id = s.class_id
    CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_academic_year) m
    WHERE s.id = p_student_id;
  END IF;

  -- Return the status
  RETURN QUERY SELECT 
    sp.promotion_status::VARCHAR, 
    sp.teacher_remarks::TEXT
  FROM student_promotions sp
  WHERE sp.student_id = p_student_id AND sp.academic_year = p_academic_year;
END;
$$ LANGUAGE plpgsql;
