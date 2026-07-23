-- ============================================================
-- DIRECT RESTORE: Move ALL Basic 2→Basic 3 students back
--
-- Based on diagnostics:
--   Basic 2 ID = 2a6bee4d-f871-4605-82c7-1f2dc0ab6e4a
--   Basic 3 ID = c23668ed-5067-47a3-aa54-97496ea496e1
--
-- Finds students currently in Basic 3 whose promotion_history
-- shows they came from Basic 2, and moves them back.
-- ============================================================

DO $$
DECLARE
  v_count INTEGER;
  v_basic2_id UUID := '2a6bee4d-f871-4605-82c7-1f2dc0ab6e4a';
  v_basic3_id UUID := 'c23668ed-5067-47a3-aa54-97496ea496e1';
BEGIN
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Restoring Basic 2 students from Basic 3...';
  RAISE NOTICE '==========================================';

  -- Move students back from Basic 3 to Basic 2
  -- Only moves students who have a promotion_history record
  -- showing they came from Basic 2
  UPDATE students s
  SET class_id = v_basic2_id
  WHERE s.class_id = v_basic3_id
    AND EXISTS (
      SELECT 1 FROM promotion_history ph
      WHERE ph.student_id = s.id
        AND ph.from_class_id = v_basic2_id
        AND ph.to_class_id = v_basic3_id
        AND ph.action = 'promoted'
    );
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Moved % students from Basic 3 back to Basic 2', v_count;

  SELECT COUNT(*) INTO v_count 
  FROM students 
  WHERE class_id = v_basic3_id AND status = 'active';
  RAISE NOTICE '📊 Students remaining in Basic 3: %', v_count;
  
  SELECT COUNT(*) INTO v_count
  FROM students
  WHERE class_id = v_basic2_id AND status = 'active';
  RAISE NOTICE '📊 Students now in Basic 2: %', v_count;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ DONE';
  RAISE NOTICE '==========================================';
END $$;
