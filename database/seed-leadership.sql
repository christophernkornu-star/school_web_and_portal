-- SEED DATA FOR LEADERSHIP PAGE
-- Run this in Supabase SQL Editor to populate the database with the requested staff and prefects.

BEGIN;

--------------------------------------------------------------------------------
-- 1. PREFECTS (Direct Insert - No Foreign Keys required)
--------------------------------------------------------------------------------

-- Clear existing prefects to avoid duplication/bloat during development
DELETE FROM prefects WHERE active = true;

INSERT INTO prefects (name, position, rank, active, image_url, gender) VALUES
('Kwame Mensah', 'School Prefect (Boys)', 1, true, null, 'Male'),
('Ama Serwaa', 'School Prefect (Girls)', 2, true, null, 'Female'),
('John Doe', 'Compound Overseer', 3, true, null, 'Male'),
('Grace Osei', 'Health Prefect', 4, true, null, 'Female');

-- Update image_url if you have them hosted, otherwise they use the placeholders I built in the frontend.


--------------------------------------------------------------------------------
-- 2. TEACHERS (Requires ensuring AUTH and PROFILES exist first)
--------------------------------------------------------------------------------

-- We use a DO block to insert teachers conditionally to avoid duplicate key errors
-- and to handle the complex relationship between auth.users -> profiles -> teachers.

DO $$
DECLARE
    -- Teacher 1: Samuel Adjei (Headteacher) - Existing in test data usually
    t1_email text := 'samuel.adjei@teacher.biriwa.edu.gh';
    t1_id uuid := 'd77abc0e-c525-46ef-9ba1-23b9f9289bae'; -- Using known ID from test seed if available
    
    -- Teacher 2: Mary Ofori (Assistant Head)
    t2_email text := 'mary.ofori@teacher.biriwa.edu.gh';
    t2_id uuid := 'a1b2c3d4-e5f6-4789-8012-34567890abcd'; -- Generated UUID
    
    -- Teacher 3: John Mensah (Mathematics)
    t3_email text := 'john.mensah@teacher.biriwa.edu.gh';
    t3_id uuid := 'b2c3d4e5-f6a7-4890-9123-45678901bcde';
    
    -- Teacher 4: Sarah Osei (English)
    t4_email text := 'sarah.osei@teacher.biriwa.edu.gh';
    t4_id uuid := 'c3d4e5f6-a7b8-4901-0234-56789012cdef';
    
    -- Teacher 5: David Cohen (Science)
    t5_email text := 'david.cohen@teacher.biriwa.edu.gh';
    t5_id uuid := 'd4e5f6a7-b8c9-4012-1345-67890123def0';
    
    -- Teacher 6: Tina Appiah (Fante)
    t6_email text := 'tina.appiah@teacher.biriwa.edu.gh';
    t6_id uuid := 'e5f6a7b8-c9d0-4123-2456-78901234ef01';

BEGIN

    -- Helper Logic:
    -- If user doesn't exist in auth.users, we can't easily insert via SQL in all environments 
    -- without knowing the hashing algorithm or having privileges.
    -- HOWEVER, if you are running this in the Supabase SQL Editor (Dashboard), you have privileges.
    -- We will try to insert into profiles/teachers directly if possible, assuming user creation is handled 
    -- or we mock it for development.
    
    -- NOTE: In a real production environment, you invite users or create them via Admin API.
    -- For this seed script, we will insert into PROFILES and TEACHERS.
    -- If foreign key to auth.users fails, you must create these users in Authentication tab first.
    
    -- BUT, to recognize them by email if they exist:
    
    ----------------------------------------------------------------------------
    -- 1. Mr. Samuel Adjei (Headteacher)
    ----------------------------------------------------------------------------
    -- Upsert Profile
    INSERT INTO profiles (id, email, username, full_name, role)
    VALUES (t1_id, t1_email, 'teacher.samuel', 'Mr. Samuel Adjei', 'teacher')
    ON CONFLICT (email) DO UPDATE SET full_name = 'Mr. Samuel Adjei';

    -- Upsert Teacher
    INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, position, display_rank, specialization, hire_date, status)
    VALUES (
        (SELECT id FROM profiles WHERE email = t1_email), 
        'TCH001', 'Samuel', 'Adjei', 'Headteacher', 1, 'Mathematics', '2015-01-01', 'active'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        position = 'Headteacher',
        display_rank = 1,
        specialization = 'Mathematics';


    ----------------------------------------------------------------------------
    -- 2. Mrs. Mary Ofori (Assistant Head)
    ----------------------------------------------------------------------------
    -- Upsert Profile (Using dummy ID if not existing, might fail if Auth generic)
    -- We try to find existing profile by email first
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE email = t2_email) THEN
        -- Insert placeholder profile (Requires matching Auth ID usually, skipping if strict mode)
        -- In local dev, we might just update if exists.
        NULL; 
    END IF;
    
    -- If profile exists (handled via App or previous seeds), Update teacher details
    -- Logic: Find profile by email, then update/insert teacher
    
    -- Handling Mary Ofori
    INSERT INTO profiles (id, email, username, full_name, role)
    VALUES (t2_id, t2_email, 'teacher.mary', 'Mrs. Mary Ofori', 'teacher')
    ON CONFLICT (email) DO NOTHING; -- Skip if exists

    INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, position, display_rank, specialization, hire_date, status, title, gender)
    VALUES (
        (SELECT id FROM profiles WHERE email = t2_email), 
        'TCH002', 'Mary', 'Ofori', 'Assistant Head', 2, 'Administration', '2016-01-01', 'active', 'Mrs.', 'Female'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        position = 'Assistant Head',
        display_rank = 2,
        title = 'Mrs.',
        gender = 'Female';

    ----------------------------------------------------------------------------
    -- 3. Mr. John Mensah (Mathematics)
    ----------------------------------------------------------------------------
    INSERT INTO profiles (id, email, username, full_name, role)
    VALUES (t3_id, t3_email, 'teacher.john', 'Mr. John Mensah', 'teacher')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, position, display_rank, specialization, hire_date, status, title, gender)
    VALUES (
        (SELECT id FROM profiles WHERE email = t3_email), 
        'TCH003', 'John', 'Mensah', 'Senior Teacher', 3, 'Mathematics', '2018-01-01', 'active', 'Mr.', 'Male'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        specialization = 'Mathematics',
        display_rank = 3,
        title = 'Mr.',
        gender = 'Male';

    ----------------------------------------------------------------------------
    -- 4. Ms. Sarah Osei (English)
    ----------------------------------------------------------------------------
    INSERT INTO profiles (id, email, username, full_name, role)
    VALUES (t4_id, t4_email, 'teacher.sarah', 'Ms. Sarah Osei', 'teacher')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, position, display_rank, specialization, hire_date, status, title, gender)
    VALUES (
        (SELECT id FROM profiles WHERE email = t4_email), 
        'TCH004', 'Sarah', 'Osei', 'Subject Teacher', 4, 'English', '2019-01-01', 'active', 'Ms.', 'Female'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        specialization = 'English',
        display_rank = 4,
        title = 'Ms.',
        gender = 'Female';

    ----------------------------------------------------------------------------
    -- 5. Mr. David Cohen (Science)
    ----------------------------------------------------------------------------
    INSERT INTO profiles (id, email, username, full_name, role)
    VALUES (t5_id, t5_email, 'teacher.david', 'Mr. David Cohen', 'teacher')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, position, display_rank, specialization, hire_date, status, title, gender)
    VALUES (
        (SELECT id FROM profiles WHERE email = t5_email), 
        'TCH005', 'David', 'Cohen', 'Subject Teacher', 5, 'Science', '2019-05-01', 'active', 'Mr.', 'Male'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        specialization = 'Science',
        display_rank = 5,
        title = 'Mr.',
        gender = 'Male';

    ----------------------------------------------------------------------------
    -- 6. Ms. Tina Appiah (Fante)
    ----------------------------------------------------------------------------
    INSERT INTO profiles (id, email, username, full_name, role)
    VALUES (t6_id, t6_email, 'teacher.tina', 'Ms. Tina Appiah', 'teacher')
    ON CONFLICT (email) DO NOTHING;

    INSERT INTO teachers (profile_id, teacher_id, first_name, last_name, position, display_rank, specialization, hire_date, status, title, gender)
    VALUES (
        (SELECT id FROM profiles WHERE email = t6_email), 
        'TCH006', 'Tina', 'Appiah', 'Subject Teacher', 6, 'Fante', '2020-02-01', 'active', 'Ms.', 'Female'
    )
    ON CONFLICT (profile_id) DO UPDATE SET
        specialization = 'Fante',
        display_rank = 6,
        title = 'Ms.',
        gender = 'Female';

END $$;

COMMIT;

-- Verify
SELECT name, position, rank FROM prefects ORDER BY rank;
SELECT first_name, last_name, position, specialization FROM teachers ORDER BY display_rank;
