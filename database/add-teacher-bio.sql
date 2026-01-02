-- Add bio column to teachers table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'bio') THEN
        ALTER TABLE teachers ADD COLUMN bio TEXT;
    END IF;
END $$;
