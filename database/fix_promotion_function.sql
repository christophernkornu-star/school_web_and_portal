-- Function to execute academic year transition (triggered by admin)
-- Automatically promotes students with 30+ average
-- Creates promotion records for below-30 students requiring teacher decisions
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
  -- Process all active students who haven't been processed yet
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
    CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_old_academic_year) AS metrics
    WHERE s.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM student_promotions sp 
      WHERE sp.student_id = s.id 
      AND sp.academic_year = p_old_academic_year
    )
  LOOP
    BEGIN
      -- Check if student meets auto-promotion criteria (average >= p_min_average)
      IF rec.average_score >= p_min_average THEN
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
          auto_promoted
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
          FALSE
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
