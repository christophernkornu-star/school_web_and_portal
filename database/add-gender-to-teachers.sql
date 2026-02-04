-- Add gender column to teachers table
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS gender text;

-- Add check constraint to ensure valid values
ALTER TABLE teachers ADD CONSTRAINT teachers_gender_check CHECK (gender IN ('Male', 'Female'));

-- Comment on column
COMMENT ON COLUMN teachers.gender IS 'Gender of the teacher (Male/Female)';
