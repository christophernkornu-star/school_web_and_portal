-- Insert default academic settings if table is empty
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM academic_settings) THEN
        INSERT INTO academic_settings (
            current_academic_year, 
            current_term,
            allow_online_admission,
            allow_result_viewing
        )
        VALUES (
            '2024/2025', 
            'First Term',
            true,
            true
        );
    END IF;
END $$;
