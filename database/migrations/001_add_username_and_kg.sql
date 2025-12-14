-- Migration: Add username field and update classes to include KG
-- Date: 2024
-- Description: This migration adds the username field to profiles table and updates the classes to include KG 1 and KG 2

-- Step 1: Add username column to profiles table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'username'
    ) THEN
        ALTER TABLE profiles ADD COLUMN username VARCHAR(100) UNIQUE;
        
        -- Update existing profiles with default usernames (users should change these)
        UPDATE profiles 
        SET username = 'user_' || SUBSTRING(id::text, 1, 8)
        WHERE username IS NULL;
        
        -- Make username NOT NULL after setting defaults
        ALTER TABLE profiles ALTER COLUMN username SET NOT NULL;
    END IF;
END $$;

-- Step 2: Clear existing classes data
TRUNCATE TABLE classes CASCADE;

-- Step 3: Insert updated classes with KG levels
INSERT INTO classes (name, level, category, description) VALUES
  ('KG 1', 1, 'Kindergarten', 'Kindergarten Year 1'),
  ('KG 2', 2, 'Kindergarten', 'Kindergarten Year 2'),
  ('Primary 1', 3, 'Primary', 'First year of primary school'),
  ('Primary 2', 4, 'Primary', 'Second year of primary school'),
  ('Primary 3', 5, 'Primary', 'Third year of primary school'),
  ('Primary 4', 6, 'Primary', 'Fourth year of primary school'),
  ('Primary 5', 7, 'Primary', 'Fifth year of primary school'),
  ('Primary 6', 8, 'Primary', 'Sixth year of primary school'),
  ('JHS 1', 9, 'Junior High', 'First year of Junior High School'),
  ('JHS 2', 10, 'Junior High', 'Second year of Junior High School'),
  ('JHS 3', 11, 'Junior High', 'Third year of Junior High School');

-- Step 4: Create a function to generate username from student information
CREATE OR REPLACE FUNCTION generate_student_username(
    first_name TEXT,
    last_name TEXT,
    student_id TEXT
) RETURNS TEXT AS $$
DECLARE
    base_username TEXT;
    final_username TEXT;
    counter INTEGER := 0;
BEGIN
    -- Create base username: firstname.lastname
    base_username := LOWER(REGEXP_REPLACE(first_name, '[^a-zA-Z]', '', 'g')) || '.' || 
                     LOWER(REGEXP_REPLACE(last_name, '[^a-zA-Z]', '', 'g'));
    
    -- Try the base username first
    final_username := base_username;
    
    -- If username exists, add numbers until we find a unique one
    WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
        counter := counter + 1;
        final_username := base_username || counter::TEXT;
    END LOOP;
    
    RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create helper function to create student profile with username
CREATE OR REPLACE FUNCTION create_student_profile(
    p_email TEXT,
    p_password TEXT,
    p_first_name TEXT,
    p_last_name TEXT,
    p_student_id TEXT,
    p_class_id UUID,
    p_date_of_birth DATE,
    p_gender TEXT
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_username TEXT;
BEGIN
    -- Generate username
    v_username := generate_student_username(p_first_name, p_last_name, p_student_id);
    
    -- Create auth user (you'll need to do this via Supabase dashboard or API)
    -- For now, we'll just prepare the profile
    
    -- This is a placeholder - actual user creation must be done through Supabase Auth API
    RAISE NOTICE 'Username generated: %, Email: %', v_username, p_email;
    
    RETURN NULL; -- Return user_id when actually creating users
END;
$$ LANGUAGE plpgsql;

-- Step 6: Display instructions for admin
DO $$ 
BEGIN
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'IMPORTANT: To create student accounts, use the following format:';
    RAISE NOTICE 'Username: firstname.lastname (automatically generated)';
    RAISE NOTICE 'Example: kofi.mensah, ama.asante, etc.';
    RAISE NOTICE '';
    RAISE NOTICE 'For teachers, use format: teacher.firstname.lastname';
    RAISE NOTICE 'For admins, use format: admin.firstname.lastname';
    RAISE NOTICE '=================================================================';
END $$;
