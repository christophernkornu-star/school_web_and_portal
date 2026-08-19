-- Add a new system setting to control whether teachers can manually enter/override
-- the class score on the teacher portal (Exam Scores spreadsheet view).
--
-- Rationale: Some teachers record class scores that do not reflect students' real
-- capabilities. The class assessment system was introduced so class scores are
-- computed from recorded assessments. When this setting is disabled, teachers can
-- NO LONGER manually enter class scores on the Exam Scores page -- the field is
-- disabled (read-only), and the class score is derived from the assessments
-- (auto-calculated).
--
-- Run this in the Supabase SQL editor.

INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES (
    'allow_teacher_class_score_entry',
    'true',
    'boolean',
    'Allow teachers to manually enter class scores on the Exam Scores page. When disabled, the class score field is disabled and the class score is auto-calculated from assessments.'
)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;
