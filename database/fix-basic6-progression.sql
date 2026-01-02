-- Force fix Basic 6 to Basic 7 progression
DO $$
DECLARE
  v_basic6_id UUID;
  v_basic7_id UUID;
BEGIN
  -- Get IDs
  SELECT id INTO v_basic6_id FROM classes WHERE name IN ('Basic 6', 'Primary 6') LIMIT 1;
  SELECT id INTO v_basic7_id FROM classes WHERE name IN ('Basic 7', 'JHS 1') LIMIT 1;
  
  IF v_basic6_id IS NOT NULL AND v_basic7_id IS NOT NULL THEN
    -- Delete existing incorrect mapping if any
    DELETE FROM class_progression WHERE current_class_id = v_basic6_id;
    
    -- Insert correct mapping
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
    VALUES (v_basic6_id, v_basic7_id, FALSE);
    
    RAISE NOTICE 'Fixed progression: Basic 6 -> Basic 7';
  ELSE
    RAISE NOTICE 'Could not find class IDs for Basic 6 or Basic 7';
  END IF;
END $$;
