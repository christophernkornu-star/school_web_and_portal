-- Add middle_name column to teachers and students tables

-- Add middle_name to teachers table
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);

-- Add middle_name to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('teachers', 'students') 
AND column_name = 'middle_name';
