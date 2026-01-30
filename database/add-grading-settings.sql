-- Add grading percentage settings to system_settings

INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES 
  ('class_score_percentage', '40', 'number', 'Percentage weight for class score (out of 100)'),
  ('exam_score_percentage', '60', 'number', 'Percentage weight for exam score (out of 100)')
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value;
