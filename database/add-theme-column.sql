-- Add theme preference to profiles table safely
DO $$
BEGIN
    -- Check if the column exists first
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'theme') THEN
        ALTER TABLE profiles ADD COLUMN theme TEXT DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system'));
    END IF;
END $$;

-- Update existing profiles to have a default
UPDATE profiles SET theme = 'light' WHERE theme IS NULL;
