-- ==========================================================
-- REMOVE TIMETABLE FEATURE COMPLETELY
-- This script removes all database objects related to the timetable system as requested.
-- ==========================================================

DO $$
BEGIN
    -- 1. Drop Tables (CASCADE removes constraints, indexes, RLS policies)
    DROP TABLE IF EXISTS timetables CASCADE;
    DROP TABLE IF EXISTS class_timetable CASCADE;
    DROP TABLE IF EXISTS class_timetables CASCADE;

    -- 2. Drop Views (if any)
    DROP VIEW IF EXISTS view_timetables CASCADE;
    DROP VIEW IF EXISTS view_schedule CASCADE;

    -- 3. Drop Functions
    DROP FUNCTION IF EXISTS get_teacher_schedule(TEXT);
    DROP FUNCTION IF EXISTS get_class_schedule(UUID);
    DROP FUNCTION IF EXISTS get_student_schedule(UUID);

    -- 4. Clean up any related columns in other tables (if added via alter table)
    -- (None known, but checking is good practice)

    RAISE NOTICE 'Timetable system removed successfully.';
END $$;
