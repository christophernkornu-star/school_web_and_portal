-- ============================================================
-- FIX Basic 1 students who were incorrectly marked as "repeated"
-- because they had no scores (average = 0).
--
-- PROBLEM:
-- The calculate_and_save_term3_status function marked students
-- with 0.00 average as "repeated" instead of "pending".
-- Students with NO scores should be "pending" until they have data.
--
-- FIX:
-- 1. Update existing records for students with 0 average & no teacher decision
-- 2. Fix the function to use "pending" instead of "repeated" for zero-average students
-- ============================================================

-- ============================================================
-- PART 1: Fix existing bad data
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Fixing Basic 1 repeated records...';
  RAISE NOTICE '==========================================';

  -- For students with average_score = 0 AND no teacher remarks AND NOT auto-promoted
  -- Change from 'repeated' to 'pending' so the teacher can make a proper decision
  UPDATE student_promotions sp
  SET 
    promotion_status = 'pending',
    requires_teacher_decision = TRUE,
    requires_admin_approval = TRUE,
    updated_at = NOW()
  WHERE sp.academic_year = (
    SELECT setting_value FROM system_settings WHERE setting_key = 'current_academic_year' LIMIT 1
  )
  AND sp.average_score = 0
  AND (sp.teacher_remarks IS NULL OR sp.teacher_remarks = '')
  AND sp.auto_promoted = FALSE
  AND sp.promotion_status = 'repeated';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Fixed % students from repeated -> pending (no scores, no teacher decision)', v_count;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'DONE';
  RAISE NOTICE '==========================================';
END $$;

-- ============================================================
-- PART 2: Fix the calculate_and_save_term3_status function
-- Students with NO scores should be "pending", not "repeated"
-- ============================================================

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
          WHEN m.average_score IS NULL OR m.total_subjects = 0 THEN 'pending'  -- No scores yet
          WHEN m.average_score >= v_min_average THEN 
              CASE WHEN cp.is_graduation THEN 'graduated' ELSE 'promoted' END
          ELSE 'repeated'  -- Has scores but below threshold
      END,
      COALESCE(m.average_score, 0),
      COALESCE(m.total_score, 0),
      COALESCE(m.total_subjects, 0),
      CASE 
          WHEN m.average_score IS NULL OR m.total_subjects = 0 THEN TRUE  -- Needs teacher decision
          WHEN m.average_score >= v_min_average THEN FALSE
          ELSE TRUE  -- Below threshold, needs teacher decision
      END,
      CASE 
          WHEN m.average_score >= v_min_average AND m.total_subjects > 0 THEN TRUE
          ELSE FALSE
      END,
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
      -- IMPORTANT: Don't overwrite teacher's decision if already submitted
      promotion_status = CASE 
          WHEN student_promotions.teacher_remarks IS NOT NULL 
            AND student_promotions.teacher_remarks != '' 
            AND student_promotions.requires_admin_approval = TRUE 
            THEN student_promotions.promotion_status
          ELSE EXCLUDED.promotion_status
      END,
      -- Set requires_admin_approval only if not already confirmed by admin
      requires_admin_approval = CASE 
          WHEN student_promotions.requires_admin_approval IS NULL 
            OR student_promotions.requires_admin_approval = TRUE 
            THEN TRUE
          ELSE FALSE  -- Admin already confirmed, don't revert
      END,
      updated_at = NOW();

END;
$$ LANGUAGE plpgsql;
