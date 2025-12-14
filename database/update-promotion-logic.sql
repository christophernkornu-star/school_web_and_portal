-- Update promotion logic to support dynamic passing average

-- 1. Add setting for promotion passing average (default 30)
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES ('promotion_passing_average', '30', 'Minimum average score required for automatic promotion')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Update calculation function to accept min_average parameter
CREATE OR REPLACE FUNCTION calculate_student_promotion_metrics(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_min_average DECIMAL DEFAULT 30.0
)
RETURNS TABLE (
  total_subjects INTEGER,
  total_score DECIMAL,
  average_score DECIMAL,
  minimum_required DECIMAL,
  meets_criteria BOOLEAN,
  recommendation VARCHAR
) AS $$
DECLARE
  v_total_subjects INTEGER;
  v_total_score DECIMAL;
  v_average_score DECIMAL;
  v_meets_criteria BOOLEAN;
  v_recommendation VARCHAR;
BEGIN
  -- Calculate average score across all subjects
  WITH student_scores AS (
    SELECT 
      COUNT(DISTINCT subject_id) as subject_count,
      AVG(total) as avg_score
    FROM scores
    WHERE student_id = p_student_id
  )
  SELECT 
    COALESCE(subject_count, 0),
    COALESCE(subject_count, 0) * COALESCE(avg_score, 0),
    COALESCE(avg_score, 0)
  INTO v_total_subjects, v_total_score, v_average_score
  FROM student_scores;
  
  -- Determine if criteria is met
  v_meets_criteria := v_average_score >= p_min_average AND v_total_subjects > 0;
  
  -- Make recommendation
  IF v_meets_criteria THEN
    v_recommendation := 'auto_promote';
  ELSE
    v_recommendation := 'teacher_decision';
  END IF;
  
  RETURN QUERY SELECT 
    v_total_subjects,
    v_total_score,
    v_average_score,
    p_min_average,
    v_meets_criteria,
    v_recommendation;
END;
$$ LANGUAGE plpgsql;

-- 3. Update recommendation generator to accept min_average
CREATE OR REPLACE FUNCTION generate_promotion_recommendations(
  p_class_id UUID,
  p_academic_year VARCHAR(20),
  p_teacher_id UUID,
  p_min_average DECIMAL DEFAULT 30.0
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  total_subjects INTEGER,
  total_score DECIMAL,
  average_score DECIMAL,
  minimum_required DECIMAL,
  meets_criteria BOOLEAN,
  recommendation VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    (s.first_name || ' ' || s.last_name)::TEXT,
    metrics.total_subjects,
    metrics.total_score,
    metrics.average_score,
    metrics.minimum_required,
    metrics.meets_criteria,
    metrics.recommendation
  FROM students s
  CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_academic_year, p_min_average) AS metrics
  WHERE s.class_id = p_class_id
    AND s.status = 'active'
    AND metrics.recommendation = 'teacher_decision'
  ORDER BY metrics.average_score DESC;
END;
$$ LANGUAGE plpgsql;

-- 4. Update execution function to accept min_average
CREATE OR REPLACE FUNCTION execute_academic_year_transition(
  p_old_academic_year VARCHAR(20),
  p_new_academic_year VARCHAR(20),
  p_min_average DECIMAL DEFAULT 30.0
)
RETURNS TABLE (
  auto_promoted_count INTEGER,
  teacher_decision_required_count INTEGER,
  errors TEXT[]
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_promoted INTEGER := 0;
  v_teacher_decision INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_next_class_id UUID;
  v_is_graduation BOOLEAN;
  rec RECORD;
BEGIN
  -- Process all active students
  FOR rec IN 
    SELECT 
      s.id as student_id,
      s.first_name,
      s.last_name,
      s.class_id,
      cp.next_class_id,
      cp.is_graduation,
      metrics.average_score,
      metrics.total_subjects,
      metrics.total_score,
      metrics.meets_criteria
    FROM students s
    LEFT JOIN class_progression cp ON cp.current_class_id = s.class_id
    CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_old_academic_year, p_min_average) AS metrics
    WHERE s.status = 'active'
  LOOP
    BEGIN
      -- Check if student meets auto-promotion criteria
      IF rec.meets_criteria THEN
        -- Create promotion record
        INSERT INTO student_promotions (
          student_id, 
          academic_year, 
          current_class_id, 
          promotion_status,
          next_class_id,
          total_subjects,
          total_score,
          average_score,
          minimum_required_average,
          meets_auto_promotion_criteria,
          requires_teacher_decision,
          auto_promoted,
          transition_executed_at
        ) VALUES (
          rec.student_id,
          p_old_academic_year,
          rec.class_id,
          CASE 
            WHEN rec.is_graduation THEN 'graduated'
            ELSE 'promoted'
          END,
          rec.next_class_id,
          rec.total_subjects,
          rec.total_score,
          rec.average_score,
          p_min_average,
          TRUE,
          FALSE,
          TRUE,
          NOW()
        );
        
        -- Execute promotion immediately
        IF rec.is_graduation THEN
          UPDATE students SET status = 'graduated' WHERE id = rec.student_id;
          
          INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id, 
            action, performed_by, remarks
          ) VALUES (
            rec.student_id, p_old_academic_year, rec.class_id, NULL,
            'graduated', auth.uid(), 'Auto-graduated: Average >= ' || p_min_average || '%'
          );
        ELSIF rec.next_class_id IS NOT NULL THEN
          UPDATE students SET class_id = rec.next_class_id WHERE id = rec.student_id;
          
          INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id,
            action, performed_by, remarks
          ) VALUES (
            rec.student_id, p_old_academic_year, rec.class_id, rec.next_class_id,
            'promoted', auth.uid(), 'Auto-promoted: Average >= ' || p_min_average || '%'
          );
        END IF;
        
        v_auto_promoted := v_auto_promoted + 1;
        
      ELSE
        -- Student requires teacher decision
        INSERT INTO student_promotions (
          student_id, 
          academic_year, 
          current_class_id, 
          promotion_status,
          next_class_id,
          total_subjects,
          total_score,
          average_score,
          minimum_required_average,
          meets_auto_promotion_criteria,
          requires_teacher_decision,
          auto_promoted,
          transition_executed_at
        ) VALUES (
          rec.student_id,
          p_old_academic_year,
          rec.class_id,
          'pending',
          rec.next_class_id,
          rec.total_subjects,
          rec.total_score,
          rec.average_score,
          p_min_average,
          FALSE,
          TRUE,
          FALSE,
          NOW()
        );
        
        v_teacher_decision := v_teacher_decision + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error processing student ' || rec.first_name || ' ' || rec.last_name || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_auto_promoted, v_teacher_decision, v_errors;
END;
$$ LANGUAGE plpgsql;
