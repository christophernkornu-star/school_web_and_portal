-- Update subjects table level constraint to include 'kindergarten'
ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_level_check;

ALTER TABLE subjects 
ADD CONSTRAINT subjects_level_check 
CHECK (level IN ('kindergarten', 'lower_primary', 'upper_primary', 'jhs'));

-- Also update classes table level constraint if it exists, just to be consistent
ALTER TABLE classes DROP CONSTRAINT IF EXISTS classes_level_check;

ALTER TABLE classes 
ADD CONSTRAINT classes_level_check 
CHECK (level IN ('kindergarten', 'lower_primary', 'upper_primary', 'jhs'));
