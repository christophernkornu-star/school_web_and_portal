-- Fix class levels to match the allowed enum values
-- First, drop the constraint if it exists so we can update freely
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

-- Update KG classes
UPDATE classes 
SET level = 'kindergarten' 
WHERE name LIKE 'KG%' OR level LIKE 'KG%';

-- Update Lower Primary classes
UPDATE classes 
SET level = 'lower_primary' 
WHERE name LIKE 'Basic 1%' OR name LIKE 'Basic 2%' OR name LIKE 'Basic 3%'
   OR name LIKE 'Primary 1%' OR name LIKE 'Primary 2%' OR name LIKE 'Primary 3%'
   OR level LIKE 'Basic 1%' OR level LIKE 'Basic 2%' OR level LIKE 'Basic 3%';

-- Update Upper Primary classes
UPDATE classes 
SET level = 'upper_primary' 
WHERE name LIKE 'Basic 4%' OR name LIKE 'Basic 5%' OR name LIKE 'Basic 6%'
   OR name LIKE 'Primary 4%' OR name LIKE 'Primary 5%' OR name LIKE 'Primary 6%'
   OR level LIKE 'Basic 4%' OR level LIKE 'Basic 5%' OR level LIKE 'Basic 6%';

-- Update JHS classes
UPDATE classes 
SET level = 'jhs' 
WHERE name LIKE 'JHS%' OR name LIKE 'Basic 7%' OR name LIKE 'Basic 8%' OR name LIKE 'Basic 9%'
   OR level LIKE 'JHS%' OR level LIKE 'Basic 7%' OR level LIKE 'Basic 8%' OR level LIKE 'Basic 9%';

-- Now apply the constraint to classes
ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('kindergarten', 'lower_primary', 'upper_primary', 'jhs'));

-- Update subjects table level constraint as well (from previous step, just to be sure)
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_level_check;

ALTER TABLE subjects 
ADD CONSTRAINT subjects_level_check 
CHECK (level IN ('kindergarten', 'lower_primary', 'upper_primary', 'jhs'));
