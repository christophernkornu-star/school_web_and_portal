-- Force fix Basic 7 to Basic 8 progression
DO $$
DECLARE
  v_basic7_id UUID;
  v_basic8_id UUID;
BEGIN
  -- Get IDs (Trying multiple variations to be safe)
  SELECT id INTO v_basic7_id FROM classes WHERE name IN ('Basic 7', 'JHS 1', 'J.H.S 1') LIMIT 1;
  SELECT id INTO v_basic8_id FROM classes WHERE name IN ('Basic 8', 'JHS 2', 'J.H.S 2') LIMIT 1;
  
  RAISE NOTICE 'Basic 7 ID: %', v_basic7_id;
  RAISE NOTICE 'Basic 8 ID: %', v_basic8_id;

  IF v_basic7_id IS NOT NULL AND v_basic8_id IS NOT NULL THEN
    -- Delete existing incorrect mapping if any
    DELETE FROM class_progression WHERE current_class_id = v_basic7_id;
    
    -- Insert correct mapping
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
    VALUES (v_basic7_id, v_basic8_id, FALSE);
    
    RAISE NOTICE 'Fixed progression: Basic 7 -> Basic 8';
  ELSE
    RAISE NOTICE 'ERROR: Could not find class IDs for Basic 7 or Basic 8. Please check class names in the classes table.';
  END IF;
END $$;
