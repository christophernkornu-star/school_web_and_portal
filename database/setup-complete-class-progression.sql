-- Setup Complete Class Progression
-- Defines the full promotion path from KG 1 to Graduation (Basic 9)

-- 1. Clear existing progression rules to avoid duplicates/conflicts
DELETE FROM class_progression;

-- 2. Define Helper Function to safely get class ID
-- This handles the variations in naming (e.g., "Basic 1" vs "Primary 1")
CREATE OR REPLACE FUNCTION get_class_id(p_names TEXT[]) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id FROM classes WHERE name = ANY(p_names) LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Insert Progression Rules
DO $$
DECLARE
  -- Class IDs
  v_kg1 UUID;
  v_kg2 UUID;
  v_basic1 UUID;
  v_basic2 UUID;
  v_basic3 UUID;
  v_basic4 UUID;
  v_basic5 UUID;
  v_basic6 UUID;
  v_basic7 UUID;
  v_basic8 UUID;
  v_basic9 UUID;
BEGIN
  -- Fetch IDs using common name variations
  v_kg1 := get_class_id(ARRAY['KG 1', 'Kindergarten 1']);
  v_kg2 := get_class_id(ARRAY['KG 2', 'Kindergarten 2']);
  v_basic1 := get_class_id(ARRAY['Basic 1', 'Primary 1', 'Class 1']);
  v_basic2 := get_class_id(ARRAY['Basic 2', 'Primary 2', 'Class 2']);
  v_basic3 := get_class_id(ARRAY['Basic 3', 'Primary 3', 'Class 3']);
  v_basic4 := get_class_id(ARRAY['Basic 4', 'Primary 4', 'Class 4']);
  v_basic5 := get_class_id(ARRAY['Basic 5', 'Primary 5', 'Class 5']);
  v_basic6 := get_class_id(ARRAY['Basic 6', 'Primary 6', 'Class 6']);
  v_basic7 := get_class_id(ARRAY['Basic 7', 'JHS 1', 'J.H.S 1']);
  v_basic8 := get_class_id(ARRAY['Basic 8', 'JHS 2', 'J.H.S 2']);
  v_basic9 := get_class_id(ARRAY['Basic 9', 'JHS 3', 'J.H.S 3']);

  -- KG 1 -> KG 2
  IF v_kg1 IS NOT NULL AND v_kg2 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_kg1, v_kg2, FALSE);
  END IF;

  -- KG 2 -> Basic 1
  IF v_kg2 IS NOT NULL AND v_basic1 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_kg2, v_basic1, FALSE);
  END IF;

  -- Basic 1 -> Basic 2
  IF v_basic1 IS NOT NULL AND v_basic2 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic1, v_basic2, FALSE);
  END IF;

  -- Basic 2 -> Basic 3
  IF v_basic2 IS NOT NULL AND v_basic3 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic2, v_basic3, FALSE);
  END IF;

  -- Basic 3 -> Basic 4
  IF v_basic3 IS NOT NULL AND v_basic4 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic3, v_basic4, FALSE);
  END IF;

  -- Basic 4 -> Basic 5
  IF v_basic4 IS NOT NULL AND v_basic5 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic4, v_basic5, FALSE);
  END IF;

  -- Basic 5 -> Basic 6
  IF v_basic5 IS NOT NULL AND v_basic6 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic5, v_basic6, FALSE);
  END IF;

  -- Basic 6 -> Basic 7
  IF v_basic6 IS NOT NULL AND v_basic7 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic6, v_basic7, FALSE);
  END IF;

  -- Basic 7 -> Basic 8
  IF v_basic7 IS NOT NULL AND v_basic8 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic7, v_basic8, FALSE);
  END IF;

  -- Basic 8 -> Basic 9
  IF v_basic8 IS NOT NULL AND v_basic9 IS NOT NULL THEN
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic8, v_basic9, FALSE);
  END IF;

  -- Basic 9 -> Graduation
  IF v_basic9 IS NOT NULL THEN
    -- For graduation, we can either set next_class_id to NULL or keep it as current_class_id with is_graduation=TRUE
    -- The previous logic used current_class_id, so we'll stick to that for consistency
    INSERT INTO class_progression (current_class_id, next_class_id, is_graduation) VALUES (v_basic9, v_basic9, TRUE);
  END IF;

  RAISE NOTICE 'Class progression setup complete.';
END $$;

-- Clean up helper function
DROP FUNCTION IF EXISTS get_class_id(TEXT[]);
