-- Scopes the teacher dashboard "Class Performance Overview" chart to the ACTIVE
-- academic year only.
--
-- Previously this aggregate RPC pulled the 4 most recent terms regardless of
-- academic year, so when a new academic year began the chart would show a mix of
-- the tail of the old year and the start of the new one. This version determines
-- the active academic year (from the term(s) flagged `is_current`, falling back to
-- the most recent year present in `academic_terms`) and only aggregates scores
-- from terms belonging to that single year. When a new academic year starts, the
-- chart resets to begin at that year's Term 1 and end at Term 3.
--
-- Run this in the Supabase SQL editor and then execute the accompanying
-- dashboard change (app/teacher/dashboard/page.tsx) to keep the fallback in sync.

DROP FUNCTION IF EXISTS get_teacher_performance_overview(TEXT);

CREATE OR REPLACE FUNCTION get_teacher_performance_overview(p_teacher_id TEXT)
RETURNS TABLE (
    term_name TEXT,
    average_score NUMERIC,
    max_score NUMERIC,
    term_start_date DATE
) AS $$
BEGIN
    RETURN QUERY
    WITH
    -- 0. Determine the ACTIVE academic year.
    -- Strongest signal is the term(s) flagged as current; otherwise the most
    -- recent year present in academic_terms.
    active_academic_year AS (
        SELECT
            COALESCE(
                (SELECT academic_year::TEXT FROM academic_terms WHERE is_current = true LIMIT 1),
                (SELECT academic_year::TEXT FROM academic_terms ORDER BY academic_year DESC NULLS LAST, start_date DESC NULLS LAST LIMIT 1)
            ) AS year
    ),

    -- 1. Get Teacher's Classes (Union of Class & Subject assignments)
    teacher_classes AS (
        SELECT class_id::UUID FROM teacher_class_assignments WHERE teacher_id::TEXT = p_teacher_id::TEXT
        UNION
        SELECT class_id::UUID FROM teacher_subject_assignments WHERE teacher_id::TEXT = p_teacher_id::TEXT
    ),

    -- 2. Get All Terms belonging to the ACTIVE academic year only.
    active_terms AS (
        SELECT id, name, academic_year, start_date
        FROM academic_terms
        WHERE academic_year::TEXT = (SELECT year FROM active_academic_year)
           OR (academic_year IS NULL AND (SELECT COALESCE(year, '') FROM active_academic_year) = '')
    ),

    -- 3. Get Active Students in those classes
    class_students AS (
        SELECT id AS student_id
        FROM students
        WHERE class_id IN (SELECT class_id FROM teacher_classes)
        AND status = 'active'
    ),

    -- 4. Aggregate Scores per Term for the active year
    term_stats AS (
        SELECT
            t.name || ' (' || t.academic_year || ')' AS term_name,
            t.start_date,
            AVG(s.total) as avg_score,
            MAX(s.total) as mx_score
        FROM active_terms t
        JOIN scores s ON s.term_id = t.id
        JOIN class_students cs ON s.student_id = cs.student_id
        GROUP BY t.id, t.name, t.academic_year, t.start_date
    )

    -- 5. Return Results Chronologically (Term 1 -> Term 2 -> Term 3)
    SELECT
        ts.term_name::TEXT,
        ROUND(ts.avg_score, 1)::NUMERIC as average_score,
        COALESCE(ts.mx_score, 0)::NUMERIC as max_score,
        ts.start_date as term_start_date
    FROM term_stats ts
    ORDER BY ts.start_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER ensures it runs with permissions of the creator (usually postgres/service_role)
-- This bypasses RLS issues on underlying tables for aggregation purposes.

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_teacher_performance_overview(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_teacher_performance_overview(TEXT) TO service_role;
