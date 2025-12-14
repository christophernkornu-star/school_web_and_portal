-- First, check the current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'classes'::regclass AND contype = 'c';

-- Drop the old constraint
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

-- Add new constraint that allows the proper level values
ALTER TABLE classes ADD CONSTRAINT classes_level_check 
CHECK (level IN (
  'Basic 1', 'Basic 2', 'Basic 3',
  'Basic 4', 'Basic 5', 'Basic 6', 
  'Basic 7', 'Basic 8', 'Basic 9',
  'JHS 1', 'JHS 2', 'JHS 3',
  'KG 1', 'KG 2',
  'lower_primary', 'upper_primary', 'jhs'
));

-- Now update the levels based on the names
UPDATE classes SET level = name WHERE name IN ('Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6', 'KG 1', 'KG 2');

-- Map Basic 7 and Basic 8 to JHS levels
UPDATE classes SET level = 'JHS 1' WHERE name = 'Basic 7';
UPDATE classes SET level = 'JHS 2' WHERE name = 'Basic 8';

-- Verify the update
SELECT id, name, level FROM classes ORDER BY name;
