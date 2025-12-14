-- Add password_reset_required column to profiles table
-- This column is used to force users to change their password on first login

-- ============================================
-- ADD COLUMN TO PROFILES TABLE
-- ============================================
DO $$ 
BEGIN
  -- Add password_reset_required column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' 
                 AND column_name = 'password_reset_required') THEN
    ALTER TABLE profiles ADD COLUMN password_reset_required BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- UPDATE EXISTING RECORDS
-- ============================================
-- Set to false for all existing users (they've already logged in)
UPDATE profiles 
SET password_reset_required = false 
WHERE password_reset_required IS NULL;

-- ============================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_password_reset 
ON profiles(password_reset_required) 
WHERE password_reset_required = true;
