-- Add statistics settings to system_settings table
-- These settings control the homepage statistics section

-- Insert default statistics settings if they don't exist
INSERT INTO system_settings (setting_key, setting_value, description, updated_at)
VALUES 
  ('stats_title', 'Our Impact in Numbers', 'Homepage statistics section title', NOW()),
  ('stats_subtitle', 'Building excellence in education for over six decades', 'Homepage statistics section subtitle', NOW()),
  ('founding_year', '1960', 'School founding year for calculating years of operation', NOW()),
  ('teacher_student_ratio', '1:15', 'Teacher to student ratio displayed on homepage', NOW()),
  ('bece_participation', '100%', 'BECE participation rate displayed on homepage', NOW()),
  ('bece_pass_rate', '85', 'BECE pass rate percentage displayed on homepage', NOW()),
  ('grade_levels', '9', 'Number of grade levels (KG to JHS) displayed on homepage', NOW())
ON CONFLICT (setting_key) DO NOTHING;

-- Verify the settings were added
SELECT 
  setting_key,
  setting_value,
  description,
  updated_at
FROM system_settings
WHERE setting_key IN ('stats_title', 'stats_subtitle', 'founding_year', 'teacher_student_ratio', 'bece_participation', 'bece_pass_rate', 'grade_levels')
ORDER BY setting_key;
