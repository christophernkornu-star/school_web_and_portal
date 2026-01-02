-- Check class progression for Basic 6
DO $$
DECLARE
  v_basic6_id UUID;
  v_basic7_id UUID;
  v_progression_exists BOOLEAN;
  v_next_class_id UUID;
BEGIN
  -- Get Basic 6 ID
  SELECT id INTO v_basic6_id FROM classes WHERE name IN ('Basic 6', 'Primary 6') LIMIT 1;
  RAISE NOTICE 'Basic 6 ID: %', v_basic6_id;
  
  -- Get Basic 7 ID
  SELECT id INTO v_basic7_id FROM classes WHERE name IN ('Basic 7', 'JHS 1') LIMIT 1;
  RAISE NOTICE 'Basic 7 ID: %', v_basic7_id;
  
  -- Check if progression exists
  SELECT EXISTS(SELECT 1 FROM class_progression WHERE current_class_id = v_basic6_id) INTO v_progression_exists;
  RAISE NOTICE 'Progression exists for Basic 6: %', v_progression_exists;
  
  -- Check what the next class is
  SELECT next_class_id INTO v_next_class_id FROM class_progression WHERE current_class_id = v_basic6_id;
  RAISE NOTICE 'Next Class ID in DB: %', v_next_class_id;
  
  IF v_next_class_id IS NULL THEN
    RAISE NOTICE 'WARNING: No next class defined for Basic 6!';
  ELSIF v_next_class_id = v_basic7_id THEN
    RAISE NOTICE 'SUCCESS: Basic 6 correctly points to Basic 7';
  ELSE
    RAISE NOTICE 'ERROR: Basic 6 points to wrong class ID: %', v_next_class_id;
  END IF;
  
END $$;
