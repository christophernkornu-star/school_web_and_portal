-- Reset password for a specific teacher
-- This will mark them to reset password on next login

-- Find the teacher's profile
SELECT id, email, username, role, password_reset_required
FROM profiles
WHERE email = 'christophernkornu@gmail.com';

-- Mark for password reset
UPDATE profiles
SET password_reset_required = true
WHERE email = 'christophernkornu@gmail.com';

-- Verify the update
SELECT id, email, username, role, password_reset_required
FROM profiles
WHERE email = 'christophernkornu@gmail.com';
