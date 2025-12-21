-- Fix missing created_at column in admission_applications table

DO $$ 
BEGIN
  -- Check if created_at column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'admission_applications' 
    AND column_name = 'created_at'
  ) THEN
    -- Add the column if it doesn't exist
    ALTER TABLE admission_applications 
    ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;
