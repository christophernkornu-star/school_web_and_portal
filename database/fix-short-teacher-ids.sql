-- Check current teacher IDs and their lengths
SELECT 
  teacher_id,
  LENGTH(teacher_id) as id_length,
  first_name || ' ' || last_name as name
FROM teachers
ORDER BY LENGTH(teacher_id), teacher_id;

-- Pad all teacher IDs to minimum 8 characters with leading zeros
-- This ensures all IDs meet Supabase Auth's minimum password requirement
-- Examples: 
--   12345 (5 chars) becomes 00012345
--   1417073 (7 chars) becomes 01417073
--   12345678 (8 chars) stays 12345678
UPDATE teachers 
SET teacher_id = LPAD(teacher_id, 8, '0')
WHERE LENGTH(teacher_id) < 8;

-- Verify the changes
SELECT 
  teacher_id,
  LENGTH(teacher_id) as id_length,
  first_name || ' ' || last_name as name
FROM teachers
ORDER BY teacher_id;
