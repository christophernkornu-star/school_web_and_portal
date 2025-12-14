-- EASY ADMIN ACCOUNT CREATION
-- This script creates a complete admin account in one step
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Create the auth user (this will generate a UUID automatically)
-- Note: You may need to do this part in the Authentication UI instead
-- Go to Authentication > Users > Add User
-- Email: admin@biriwa.edu.gh
-- Password: Admin123!
-- Auto Confirm: YES

-- Step 2: After creating the user above, find the UUID and replace it below
-- Then run this part:

-- REPLACE 'PASTE_UUID_HERE' with the actual UUID from the user you created
DO $$
DECLARE
    admin_user_id UUID := 'PASTE_UUID_HERE';  -- ⚠️ CHANGE THIS!
BEGIN
    -- Insert admin profile
    INSERT INTO profiles (id, email, username, full_name, role, phone)
    VALUES (
        admin_user_id,
        'admin@biriwa.edu.gh',
        'admin.francis',
        'Mr. Francis Owusu',
        'admin',
        '+233501234567'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        phone = EXCLUDED.phone;
    
    RAISE NOTICE 'Admin account created successfully!';
    RAISE NOTICE 'Username: admin.francis';
    RAISE NOTICE 'Password: Admin123!';
END $$;
