-- Add gender column to teachers table if it doesn't exist
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male', 'Female', 'Other'));

-- Add updated_at column to teachers table if it doesn't exist
ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
