-- ============================================================
-- EMERGENCY RESTORE: Move Basic 2 students back from Basic 3
--
-- Run this in Supabase SQL Editor if the main fix didn't work.
-- This uses multiple methods to find and restore students.
-- ============================================================

DO $$
DECLARE
  v_basic2_id UUID;
  v_basic3_id UUID;
  v_count INTEGER;
BEGIN
  -- Get class IDs by name
  SELECT id INTO v_basic2_id FROM classes WHERE LOWER(name) = 'basic 2' LIMIT 1;
  SELECT id INTO v_basic3_id FROM classes WHERE LOWER(name) = 'basic 3' LIMIT 1;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '🔍 SEARCHING FOR CLASSES...';
  RAISE NOTICE '==========================================';
  
  IF v_basic2_id IS NULL THEN
    RAISE EXCEPTION '❌ Could not find Basic 2 class. Check class names in the database.';
  END IF;
  
  IF v_basic3_id IS NULL THEN
    RAISE EXCEPTION '❌ Could not find Basic 3 class. Check class names in the database.';  
  END IF;

  RAISE NOTICE '✅ Basic 2 ID: %', v_basic2_id;
  RAISE NOTICE '✅ Basic 3 ID: %', v_basic3_id;
  RAISE NOTICE '';

  -- Count students currently in Basic 3
  SELECT COUNT(*) INTO v_count FROM students WHERE class_id = v_basic3_id AND status = 'active';
  RAISE NOTICE '📊 Students currently in Basic 3: %', v_count;
  
  -- ══════════════════════════════════════════════════════════
  -- METHOD 1: Use student_promotions.current_class_id
  -- Finds students in Basic 3 whose promotion record says
  -- they originally came from Basic 2
  -- ══════════════════════════════════════════════════════════
  
  UPDATE students s
  SET class_id = sp.current_class_id
  FROM student_promotions sp
  WHERE s.id = sp.student_id
    AND s.class_id = v_basic3_id
    AND sp.current_class_id = v_basic2_id
    AND sp.promotion_status IN ('promoted', 'graduated');
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Method 1 (current_class_id): Restored % students', v_count;

  -- ══════════════════════════════════════════════════════════
  -- METHOD 2: Use student_promotions.next_class_id
  -- Finds students in Basic 3 whose promotion says next
  -- class should be Basic 3 (and current_class_id is NULL
  -- or wrong)
  -- ══════════════════════════════════════════════════════════
  
  UPDATE students s
  SET class_id = v_basic2_id
  FROM student_promotions sp
  WHERE s.id = sp.student_id
    AND s.class_id = v_basic3_id
    AND sp.next_class_id = v_basic3_id
    AND (sp.current_class_id IS NULL OR sp.current_class_id = v_basic3_id)
    AND sp.promotion_status IN ('promoted', 'graduated');
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Method 2 (next_class_id): Restored % students', v_count;

  -- ══════════════════════════════════════════════════════════
  -- METHOD 3: Check promotion_history records
  -- ══════════════════════════════════════════════════════════
  
  UPDATE students s
  SET class_id = ph.from_class_id
  FROM promotion_history ph
  WHERE s.id = ph.student_id
    AND s.class_id = v_basic3_id
    AND ph.from_class_id = v_basic2_id
    AND ph.action = 'promoted';
    
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ Method 3 (promotion_history): Restored % students', v_count;

  -- ══════════════════════════════════════════════════════════
  -- RESULTS
  -- ══════════════════════════════════════════════════════════
  
  SELECT COUNT(*) INTO v_count FROM students WHERE class_id = v_basic3_id AND status = 'active';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Students remaining in Basic 3 after restore: %', v_count;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE '✅ RESTORE COMPLETE';
  RAISE NOTICE '==========================================';
END $$;
