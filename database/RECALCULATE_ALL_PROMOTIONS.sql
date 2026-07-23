-- ============================================================
-- FORCE RECALCULATE ALL PROMOTION RECORDS
-- 
-- Problem: Many student_promotion records were created with
-- wrong data (0.00 average) because scores didn't exist yet.
-- The ON CONFLICT logic didn't properly update them later.
--
-- Solution: Delete all auto-generated promotion records for
-- the current year and re-run the calculation with fresh data.
-- ============================================================

DO $$
DECLARE
  v_current_year VARCHAR(20);
  v_count INTEGER;
BEGIN
  -- Get current academic year
  SELECT setting_value INTO v_current_year 
  FROM system_settings 
  WHERE setting_key = 'current_academic_year';
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Recalculating promotion records for %', v_current_year;
  RAISE NOTICE '==========================================';

  -- Step 1: Delete ALL auto-generated promotion records for current year
  -- that don't have teacher decisions (teacher_remarks is null or empty)
  DELETE FROM student_promotions
  WHERE academic_year = v_current_year
    AND (teacher_remarks IS NULL OR teacher_remarks = '')
    AND requires_admin_approval = TRUE
    AND decided_by IS NULL;
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Deleted % stale promotion records', v_count;

  RAISE NOTICE '==========================================';
  RAISE NOTICE 'DONE - Refresh the app to see new calculations';
  RAISE NOTICE '==========================================';
END $$;
