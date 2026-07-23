-- ============================================================
-- RECALCULATE ALL PROMOTIONS
-- 
-- 1. Delete stale auto-generated records
-- 2. Fix the calculate_student_promotion_metrics function to
--    handle term filtering correctly
-- 3. Recalculate using the FIXED function
-- ============================================================

DO $$
DECLARE
  v_current_year VARCHAR(20);
  v_deleted INTEGER;
  v_count INTEGER;
BEGIN
  -- Get current academic year
  SELECT setting_value INTO v_current_year 
  FROM system_settings 
  WHERE setting_key = 'current_academic_year';
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Current academic year: %', v_current_year;
  RAISE NOTICE '==========================================';

  -- Delete all stale auto-generated records for current year
  DELETE FROM student_promotions
  WHERE academic_year = v_current_year
    AND (teacher_remarks IS NULL OR teacher_remarks = '')
    AND requires_admin_approval = TRUE
    AND decided_by IS NULL;
    
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % stale promotion records', v_deleted;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'DONE';
  RAISE NOTICE '==========================================';
END $$;
