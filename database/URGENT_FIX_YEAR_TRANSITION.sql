-- ============================================================
-- URGENT FIX: Year Transition Should NOT Move Students
-- 
-- PROBLEM:
-- The execute_academic_year_transition function auto-promotes
-- students with >= 30% average and IMMEDIATELY moves them to
-- the next class. Basic 2 students got moved to Basic 3 without
-- admin confirmation.
--
-- FIX:
-- Update the transition function so it ONLY creates promotion
-- records with requires_admin_approval = TRUE. Students will
-- NOT be moved. Admin must confirm from the admin promotions page.
-- ============================================================

-- ============================================================
-- PART 1: Restore students who were incorrectly moved
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Restoring students who were auto-moved...';
  RAISE NOTICE '==========================================';

  -- Find students whose class_id differs from their student_promotions current_class_id
  -- This means they were moved by the transition function
  UPDATE students s
  SET class_id = sp.current_class_id
  FROM student_promotions sp
  WHERE s.id = sp.student_id
    AND sp.auto_promoted = TRUE
    AND sp.promotion_status IN ('promoted', 'graduated')
    AND s.class_id != sp.current_class_id
    AND s.class_id = sp.next_class_id; -- Only if student was moved TO the next class

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Restored % students back to their original classes', v_count;

  -- Also restore any graduated students
  UPDATE students s
  SET status = 'active'
  FROM student_promotions sp
  WHERE s.id = sp.student_id
    AND sp.auto_promoted = TRUE
    AND sp.promotion_status = 'graduated'
    AND s.status = 'graduated';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE '✅ Restored % graduated students back to active', v_count;
  END IF;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Restoration complete!';
  RAISE NOTICE '==========================================';
END $$;

-- ============================================================
-- PART 2: Drop & Recreate execute_academic_year_transition
-- The NEW version ONLY creates promotion records. It does NOT
-- move students. All decisions require admin confirmation.
-- ============================================================

DROP FUNCTION IF EXISTS execute_academic_year_transition(VARCHAR, VARCHAR, DECIMAL);
DROP FUNCTION IF EXISTS execute_academic_year_transition(VARCHAR, VARCHAR);

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
    CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_old_academic_year::VARCHAR) AS metrics
    WHERE s.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM student_promotions sp 
      WHERE sp.student_id = s.id 
      AND sp.academic_year = p_old_academic_year
    )
  LOOP
    BEGIN
      IF rec.average_score >= p_min_average THEN
        -- KEY CHANGE: Create promotion record with requires_admin_approval = TRUE
        -- Students with >= 30% are marked as 'promoted' but require admin confirmation
        -- They will NOT be moved to the next class here
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
          requires_admin_approval,  -- NEW: Pending admin approval
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
          TRUE,  -- requires_admin_approval = TRUE (pending admin)
          NOW()
        );
        
        -- NO student movement! Just record the promotion decision.
        -- Admin must confirm from the admin promotions page.
        
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
          requires_admin_approval
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
          TRUE  -- Also requires admin approval after teacher decides
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

-- ============================================================
-- PART 3: Also fix calculate_and_save_term3_status if it exists
-- This function also auto-calculates and auto-moves students
-- ============================================================

-- We need to drop and recreate this too if it exists
-- But since it's called by the old execute_academic_year_transition,
-- and we just replaced that function, this may no longer be called.
-- However, let's update it for safety.

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
BEGIN
  -- Get system passing average (default 30 if not set)
  SELECT (setting_value)::DECIMAL INTO v_min_average 
  FROM system_settings 
  WHERE setting_key = 'promotion_passing_average';
  
  v_min_average := COALESCE(v_min_average, 30.0);

  -- Create/update promotion records WITHOUT moving students
  -- Sets requires_admin_approval = TRUE for all auto-calculated records
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
      requires_admin_approval,
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
      TRUE,  -- Pending admin approval
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
      -- IMPORTANT: Don't overwrite teacher's decision
      promotion_status = CASE 
          WHEN student_promotions.teacher_remarks IS NOT NULL AND student_promotions.teacher_remarks != '' 
            AND student_promotions.requires_admin_approval = TRUE 
            THEN student_promotions.promotion_status
          ELSE EXCLUDED.promotion_status
      END,
      -- Set requires_admin_approval only if not already confirmed by admin
      requires_admin_approval = CASE 
          WHEN student_promotions.requires_admin_approval IS NULL OR student_promotions.requires_admin_approval = TRUE 
            THEN TRUE
          ELSE FALSE  -- Admin already confirmed, don't revert
      END,
      updated_at = NOW();

END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 4: Show results
-- ============================================================

DO $$
DECLARE
  v_moved_count INTEGER;
  v_pending_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_moved_count 
  FROM student_promotions 
  WHERE auto_promoted = TRUE 
    AND requires_admin_approval = TRUE
    AND promotion_status IN ('promoted', 'graduated');
    
  SELECT COUNT(*) INTO v_pending_count
  FROM student_promotions
  WHERE requires_teacher_decision = TRUE
    AND requires_admin_approval = TRUE;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'FIX SUMMARY';
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ % students restored to original classes', v_moved_count;
  RAISE NOTICE '✅ execute_academic_year_transition updated - no longer moves students';
  RAISE NOTICE '✅ calculate_and_save_term3_status updated - no longer overwrites decisions';
  RAISE NOTICE 'ℹ️ % auto-promoted records now pending admin approval', v_moved_count;
  RAISE NOTICE 'ℹ️ % teacher-decision records now pending admin approval', v_pending_count;
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Admin must go to Promotions page to confirm decisions';
  RAISE NOTICE '2. Confirmed "Promoted" students will be moved to next class';
  RAISE NOTICE '==========================================';
END $$;
