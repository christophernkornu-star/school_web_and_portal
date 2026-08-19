-- =====================================================================================
-- HISTORICAL REPORTS & RETENTION
-- =====================================================================================
-- Purpose:
--   1. Track when each student graduated (graduated_at).
--   2. Associate each score with the class it was recorded under (scores.class_id),
--      so historical reports reconstruct the correct subject set per class/term.
--   3. Configurable retention window (default 5 years) that applies ONLY to
--      graduated students. After the window, graduated students' historical data is purged.
--   4. Active students' historical data remains accessible (by admin & teacher)
--      indefinitely until the student graduates.
--   5. Deleting a student must NOT cascade-delete their historical scores.
--
-- Run this in Supabase SQL Editor.
-- =====================================================================================

BEGIN;

-- -----------------------------------------------------------------------------------
-- 1. Add graduated_at to students (when they graduated)
-- -----------------------------------------------------------------------------------
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ;

-- Backfill graduated_at for already-graduated students from the most recent
-- student_promotions record where promotion_status = 'graduated'.
UPDATE students s
SET graduated_at = COALESCE(sp.transition_executed_at, sp.decision_date, sp.created_at)
FROM (
  SELECT DISTINCT ON (student_id)
    student_id,
    transition_executed_at,
    decision_date,
    created_at
  FROM student_promotions
  WHERE promotion_status = 'graduated'
  ORDER BY student_id, academic_year DESC
) sp
WHERE s.id = sp.student_id
  AND s.status = 'graduated'
  AND s.graduated_at IS NULL;

-- If a student is marked graduated but has no promotion record, use end-of-year heuristic:
-- set to the start of the next academic year after their last recorded academic year.
UPDATE students s
SET graduated_at = (
  SELECT (MAX(to_date(at.academic_year, 'YYYY/YY')) + INTERVAL '1 year')::timestamptz
  FROM scores sc
  JOIN academic_terms at ON at.id = sc.term_id
  WHERE sc.student_id = s.id
)
WHERE s.status = 'graduated'
  AND s.graduated_at IS NULL
  AND EXISTS (
    SELECT 1 FROM scores sc JOIN academic_terms at ON at.id = sc.term_id WHERE sc.student_id = s.id
  );

-- -----------------------------------------------------------------------------------
-- 2. Add scores.class_id (nullable) to associate each score with its class/level
-- -----------------------------------------------------------------------------------
ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Backfill class_id for existing scores from student_promotions history:
-- For each score's term academic year, find the class the student belonged to that year.
-- (Correlated subqueries may reference the target table sc; FROM-clause entries may not.)
UPDATE scores sc
SET class_id = (
  SELECT sp.current_class_id
  FROM student_promotions sp
  JOIN academic_terms at ON at.id = sc.term_id
  WHERE sp.academic_year = at.academic_year
    AND sp.student_id = sc.student_id
  LIMIT 1
)
WHERE sc.class_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM student_promotions sp
    JOIN academic_terms at ON at.id = sc.term_id
    WHERE sp.academic_year = at.academic_year
      AND sp.student_id = sc.student_id
  );

-- Fallback: assign the student's current class class_id to remaining NULL scores.
UPDATE scores sc
SET class_id = st.class_id
FROM students st
WHERE sc.student_id = st.id
  AND sc.class_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_scores_class_id ON scores(class_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_class ON scores(student_id, class_id);

-- -----------------------------------------------------------------------------------
-- 3. Historical reports settings table (configurable retention, default 5)
-- -----------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS historical_reports_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retention_years INTEGER NOT NULL DEFAULT 5
    CHECK (retention_years >= 1 AND retention_years <= 50),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  -- When TRUE, students can view report cards for past academic years in their
  -- portal. When FALSE (default), students only see the active academic year's terms.
  student_portal_show_history BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

INSERT INTO historical_reports_settings (retention_years, enabled, student_portal_show_history)
VALUES (5, TRUE, FALSE)
ON CONFLICT DO NOTHING;

ALTER TABLE historical_reports_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admins_view_historical_settings ON historical_reports_settings;
DROP POLICY IF EXISTS admins_manage_historical_settings ON historical_reports_settings;

CREATE POLICY admins_view_historical_settings ON historical_reports_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY admins_manage_historical_settings ON historical_reports_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- -----------------------------------------------------------------------------------
-- 4. RLS: Teachers may view historical scores for classes they are assigned to.
--    (Admin reads are handled separately/allowed by existing permissive policies.)
-- -----------------------------------------------------------------------------------
-- Scores already have a broad "Public read access for scores" policy. We keep it so
-- the class-scoped querying works. Access control on the UI layer will enforce
-- teacher -> own classes and admin -> all classes.

-- -----------------------------------------------------------------------------------
-- 5. Protect historical scores from student deletion (cascade prevention).
--    scores.student_id has ON DELETE CASCADE. We add a BEFORE DELETE trigger that
--    blocks hard-deletion of a student record if that student has historical scores,
--    forcing the app to use a soft-delete (status) instead. This keeps history intact.
-- -----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_student_deletion_with_history()
RETURNS TRIGGER AS $$
DECLARE
  v_score_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_score_count
  FROM scores WHERE student_id = OLD.id;
  IF v_score_count > 0 THEN
    RAISE EXCEPTION 'Cannot hard-delete student: historical scores exist (%). Soft-delete (set status) is required to preserve history.', v_score_count;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_student_delete_with_history ON students;
CREATE TRIGGER trg_prevent_student_delete_with_history
  BEFORE DELETE ON students
  FOR EACH ROW
  EXECUTE FUNCTION prevent_student_deletion_with_history();

-- -----------------------------------------------------------------------------------
-- 6. Purge RPC: delete historical data for graduated students whose retention window
--    has elapsed. Returns number of students whose history was purged.
--    NOTE: This is intentionally a SECURITY DEFINER admin-invoked function that performs
--    the actual destructive delete. Only run deliberately.
-- -----------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_graduated_history()
RETURNS TABLE (students_purged INTEGER, scores_purged BIGINT, remarks_purged BIGINT, promotions_purged BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window INTEGER;
  v_cutoff TIMESTAMPTZ;
  v_students INTEGER := 0;
  v_scores BIGINT := 0;
  v_remarks BIGINT := 0;
  v_promos BIGINT := 0;
  rec RECORD;
BEGIN
  -- Read current retention setting (configurable)
  SELECT retention_years INTO v_window
  FROM historical_reports_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_window IS NULL THEN v_window := 5; END IF;

  v_cutoff := NOW() - (v_window || ' years')::INTERVAL;

  -- For each graduated student past their window, delete their historical records.
  FOR rec IN
    SELECT id
    FROM students
    WHERE status = 'graduated'
      AND graduated_at IS NOT NULL
      AND graduated_at < v_cutoff
  LOOP
    DELETE FROM scores WHERE student_id = rec.id;
    v_scores := v_scores + ROW_COUNT;
    DELETE FROM student_remarks WHERE student_id = rec.id;
    v_remarks := v_remarks + ROW_COUNT;
    DELETE FROM student_promotions WHERE student_id = rec.id;
    v_promos := v_promos + ROW_COUNT;
    DELETE FROM students WHERE id = rec.id;
    v_students := v_students + ROW_COUNT;
  END LOOP;

  RETURN QUERY SELECT v_students, v_scores, v_remarks, v_promos;
END;
$$;

COMMIT;
