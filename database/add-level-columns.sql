-- Add level column to subjects table
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('lower_primary', 'upper_primary', 'jhs'));

-- Handle classes table level column (it already exists as INTEGER)
-- First rename the old INTEGER level column
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'classes' 
    AND column_name = 'level' 
    AND data_type = 'integer'
  ) THEN
    ALTER TABLE classes RENAME COLUMN level TO level_old;
  END IF;
END $$;

-- Now add the new TEXT level column
ALTER TABLE classes
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('lower_primary', 'upper_primary', 'jhs'));

-- Verify the columns were added
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('subjects', 'classes')
AND column_name = 'level';
