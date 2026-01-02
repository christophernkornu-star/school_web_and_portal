-- Fix Student Profile Edit Permissions
-- This script ensures that the security settings exist, are set to allow editing, and that students have permission to read them.

-- 1. Ensure security_settings table exists
CREATE TABLE IF NOT EXISTS security_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_timeout_minutes INTEGER DEFAULT 60,
  password_min_length INTEGER DEFAULT 8,
  require_password_change_days INTEGER DEFAULT 90,
  max_login_attempts INTEGER DEFAULT 5,
  enable_two_factor BOOLEAN DEFAULT false,
  allow_teacher_delete_scores BOOLEAN DEFAULT false,
  allow_student_profile_edit BOOLEAN DEFAULT true,
  ip_whitelist TEXT[],
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- 2. Ensure there is at least one row
INSERT INTO security_settings (allow_student_profile_edit)
SELECT true
WHERE NOT EXISTS (SELECT 1 FROM security_settings);

-- 3. Update the setting to TRUE to ensure it's enabled
UPDATE security_settings SET allow_student_profile_edit = true;

-- 4. Fix RLS Policies
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can view security settings" ON security_settings;
DROP POLICY IF EXISTS "Teachers can view security settings" ON security_settings;

-- Create policy for ALL Authenticated Users (Students, Teachers, Admins)
-- This avoids issues with role checking and ensures everyone can read the settings
CREATE POLICY "Authenticated users can view security settings" ON security_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure Admins can UPDATE
DROP POLICY IF EXISTS "Admins can update security settings" ON security_settings;

CREATE POLICY "Admins can update security settings" ON security_settings
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
