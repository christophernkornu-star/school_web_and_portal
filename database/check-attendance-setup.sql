-- Check attendance data and setup
-- Run in Supabase SQL Editor

-- 1. Check what attendance table structure exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%attendance%';

-- 2. Check if student_attendance table exists and has data
SELECT COUNT(*) as record_count FROM student_attendance;

-- 3. Check current term setting
SELECT setting_key, setting_value 
FROM system_settings 
WHERE setting_key = 'current_term';

-- 4. Check academic_terms table
SELECT id, name, academic_year, total_days, start_date, end_date
FROM academic_terms
ORDER BY start_date DESC;

-- 5. Check attendance table (daily attendance)
SELECT COUNT(*) as daily_attendance_count FROM attendance;

-- 6. Sample attendance records
SELECT * FROM attendance LIMIT 5;
