-- School Settings Tables
-- Run this migration to add settings functionality

-- School Information Settings
CREATE TABLE IF NOT EXISTS school_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_name TEXT NOT NULL DEFAULT 'Biriwa Methodist ''C'' Basic School',
  school_motto TEXT DEFAULT 'Knowledge, Discipline, Service',
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  principal_name TEXT,
  principal_email TEXT,
  principal_phone TEXT,
  founded_year INTEGER,
  logo_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- System Notification Settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  email_host TEXT,
  email_port INTEGER,
  email_username TEXT,
  email_password TEXT,
  sms_api_key TEXT,
  sms_sender_id TEXT,
  notify_attendance BOOLEAN DEFAULT true,
  notify_results BOOLEAN DEFAULT true,
  notify_fees BOOLEAN DEFAULT true,
  notify_announcements BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Academic Year and Term Settings
CREATE TABLE IF NOT EXISTS academic_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  current_academic_year TEXT NOT NULL DEFAULT '2024/2025',
  current_term TEXT NOT NULL DEFAULT 'First Term',
  term_start_date DATE,
  term_end_date DATE,
  next_term_starts DATE,
  school_reopening_date DATE,
  vacation_start_date DATE,
  allow_online_admission BOOLEAN DEFAULT true,
  allow_result_viewing BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Security Settings
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

-- Insert default values
INSERT INTO school_settings (school_name, school_motto, address, phone, email)
VALUES (
  'Biriwa Methodist ''C'' Basic School',
  'Knowledge, Discipline, Service',
  'P.O. Box 123, Biriwa, Central Region, Ghana',
  '+233 XX XXX XXXX',
  'info@biriwa.edu.gh'
) ON CONFLICT DO NOTHING;

INSERT INTO notification_settings (email_enabled, sms_enabled)
VALUES (true, false)
ON CONFLICT DO NOTHING;

INSERT INTO academic_settings (current_academic_year, current_term)
VALUES ('2024/2025', 'First Term')
ON CONFLICT DO NOTHING;

INSERT INTO security_settings (session_timeout_minutes, password_min_length)
VALUES (60, 8)
ON CONFLICT DO NOTHING;

-- Enable Row Level Security
ALTER TABLE school_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Admin only)
CREATE POLICY "Admins can view school settings" ON school_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update school settings" ON school_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view notification settings" ON notification_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update notification settings" ON notification_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view academic settings" ON academic_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update academic settings" ON academic_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can view security settings" ON security_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update security settings" ON security_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
