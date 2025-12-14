-- Add current_term setting to system_settings table
-- This allows admin to set which term is currently active

INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
VALUES ('current_term', 'c46e91df-2cae-434e-b5b3-b3cf057d0b31', 'uuid', 'Currently active academic term')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = EXCLUDED.setting_value,
    updated_at = NOW();
