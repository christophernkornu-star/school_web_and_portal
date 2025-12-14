-- Fix current term setting
-- This script will create default terms if none exist and set the current term

-- Step 1: Check if any terms exist
DO $$
DECLARE
  term_count INTEGER;
  new_term_id UUID;
BEGIN
  SELECT COUNT(*) INTO term_count FROM academic_terms;
  
  -- If no terms exist, create default terms for 2024/2025 academic year
  IF term_count = 0 THEN
    RAISE NOTICE 'No terms found. Creating default terms...';
    
    -- Create Term 1
    INSERT INTO academic_terms (name, academic_year, start_date, end_date, is_current)
    VALUES ('Term 1', '2024/2025', '2024-09-01', '2024-12-15', true)
    RETURNING id INTO new_term_id;
    
    RAISE NOTICE 'Created Term 1 with ID: %', new_term_id;
    
    -- Create Term 2
    INSERT INTO academic_terms (name, academic_year, start_date, end_date, is_current)
    VALUES ('Term 2', '2024/2025', '2025-01-06', '2025-04-10', false);
    
    -- Create Term 3
    INSERT INTO academic_terms (name, academic_year, start_date, end_date, is_current)
    VALUES ('Term 3', '2024/2025', '2025-04-21', '2025-07-20', false);
    
    RAISE NOTICE 'Created 3 default terms for 2024/2025 academic year';
    
    -- Update system_settings with the current term
    UPDATE system_settings 
    SET setting_value = new_term_id::text
    WHERE setting_key = 'current_term';
    
    RAISE NOTICE 'Updated system_settings with Term 1 ID';
  ELSE
    RAISE NOTICE 'Found % existing term(s)', term_count;
  END IF;
END $$;

-- Step 2: If terms exist but none is marked as current, mark the most recent one
UPDATE academic_terms 
SET is_current = true 
WHERE id = (
  SELECT id 
  FROM academic_terms 
  WHERE is_current = false
  ORDER BY start_date DESC 
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM academic_terms WHERE is_current = true);

-- Step 3: Update system_settings with the current term
UPDATE system_settings 
SET setting_value = (
  SELECT id::text 
  FROM academic_terms 
  WHERE is_current = true 
  LIMIT 1
)
WHERE setting_key = 'current_term'
AND (setting_value IS NULL OR setting_value = 'YOUR_TERM_UUID_HERE');

-- Step 4: Verify the setup
SELECT 
  'Terms in database:' as info,
  COUNT(*) as count
FROM academic_terms;

SELECT 
  id,
  name,
  academic_year,
  is_current,
  start_date,
  end_date
FROM academic_terms 
ORDER BY start_date DESC;

SELECT 
  'Current term setting:' as info,
  ss.setting_value as term_id,
  at.name as term_name,
  at.academic_year,
  at.is_current
FROM system_settings ss
LEFT JOIN academic_terms at ON ss.setting_value = at.id::text
WHERE ss.setting_key = 'current_term';
