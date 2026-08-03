-- ============================================================
-- ADD PER-TERM VACATION & REOPENING DATES
-- ------------------------------------------------------------
-- Adds explicit `vacation_date` and `reopening_date` columns to
-- the academic_terms table so that each term carries its own
-- vacation start date and the date it reopens.
--
-- This fixes report cards showing the NEXT term's dates: each
-- report card now reads the dates stored on ITS OWN term record
-- instead of the single global academic_settings row.
--
-- Safe to run repeatedly (idempotent).
-- ============================================================

-- 1. Add the columns if they don't exist
ALTER TABLE academic_terms
  ADD COLUMN IF NOT EXISTS vacation_date DATE,
  ADD COLUMN IF NOT EXISTS reopening_date DATE;

-- 2. Backfill existing terms.
--    Each report card shows the term it belongs to (e.g. TERM: Second Term) with:
--      - VACATION DATE  = when this term closes  -> the term's own end_date
--      - REOPENING DATE = when this term reopens -> the term's own start_date
--    This matches how academic_settings already derives vacation=end and reopening=start.
UPDATE academic_terms
SET vacation_date = COALESCE(vacation_date, end_date);

-- Reopening date = THIS term's own start date (when it reopens).
-- NOTE: early builds incorrectly set this to the NEXT term's start date, which made
-- report cards show the wrong reopening value (e.g. Term 2 showed Term 3's start).
-- Recomputing from start_date corrects those stale values on re-run.
UPDATE academic_terms
SET reopening_date = start_date;
-- 3. For the CURRENT term (matching academic_settings), apply the admin-set
--    vacation/reopening dates so the values the school already uses are kept.
DO $$
DECLARE
  v_year TEXT;
  v_name TEXT;
  v_vacation DATE;
  v_reopening DATE;
BEGIN
  SELECT current_academic_year, current_term, vacation_start_date, school_reopening_date
    INTO v_year, v_name, v_vacation, v_reopening
  FROM academic_settings
  LIMIT 1;

  IF v_year IS NOT NULL AND v_name IS NOT NULL THEN
    UPDATE academic_terms
    SET vacation_date = COALESCE(vacation_date, v_vacation),
        reopening_date = COALESCE(reopening_date, v_reopening)
    WHERE academic_year = v_year AND name = v_name;
  END IF;
END $$;

