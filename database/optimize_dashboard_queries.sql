-- Function to get teacher performance overview in a single query
-- Optimizes the dashboard loading time by aggregating on the server

-- 0. Add Missing Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_teacher_class_assignments_teacher ON teacher_class_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_start_date ON academic_terms(start_date DESC);
CREATE INDEX IF NOT EXISTS idx_scores_term_student_total ON scores(term_id, student_id) INCLUDE (total); 

-- DROP FIRST to ensure clean slate (fixes potential signature mismatches)
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
    -- 1. Get Teacher's Classes (Union of Class & Subject assignments)
    teacher_classes AS (
        SELECT class_id::UUID FROM teacher_class_assignments WHERE teacher_id::TEXT = p_teacher_id::TEXT
        UNION
        SELECT class_id::UUID FROM teacher_subject_assignments WHERE teacher_id::TEXT = p_teacher_id::TEXT
    ),
    
    -- 2. Get 4 Most Recent Academic Terms
    recent_terms AS (
        SELECT id, name, start_date 
        FROM academic_terms 
        ORDER BY start_date DESC 
        LIMIT 4
    ),

    -- 3. Get Active Students in those classes
    class_students AS (
        SELECT id AS student_id 
        FROM students 
        WHERE class_id IN (SELECT class_id FROM teacher_classes)
        AND status = 'active'
    ),

    -- 4. Aggregate Scores per Term
    term_stats AS (
        SELECT 
            t.name AS term_name,
            t.start_date,
            AVG(s.total) as avg_score,
            MAX(s.total) as mx_score
        FROM recent_terms t
        JOIN scores s ON s.term_id = t.id
        JOIN class_students cs ON s.student_id = cs.student_id
        GROUP BY t.id, t.name, t.start_date
    )

    -- 5. Return Results Chronologically
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
