-- Add email column to teachers table
-- This stores the actual contact email, separate from the auth placeholder email

ALTER TABLE teachers
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'teachers'
AND column_name = 'email';
