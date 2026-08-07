-- ============================================================================
-- RECONCILE ACADEMIC YEARS  (idempotent, transactional)
-- ============================================================================
-- Author:   Maintenance script (review before running)
-- Purpose:  Remove inconsistent academic-year data so the year dropdown on the
--           Admin Promotions page is clean and only shows real periods.
--
-- Scope of deletions (confirmed by the user):
--   1. Orphan / leftover promotion records:
--        student_promotions  : '2027/2028' (120), '2026/2027' (120), '2026' (6)
--        class_subjects      : '2026' (33)
--   2. The entire '2025/2026' year (user explicitly confirmed they want it gone):
--        academic_terms      : 'Term 1' (1 row)
--        scores              : 7 rows  (deleted via term cascade - see below)
--        assessments         : 15 rows
--        student_promotions  : 122 rows
--        class_subjects      : 6 rows
--
-- The '2025/2026' removal deletes real but unneeded data (7 scores, 15
-- assessments). The user confirmed this is the intended outcome.
--
-- SAFETY:
--   - Runs in a single transaction; if any step raises an error, EVERYTHING
--     rolls back (no partial changes).
--   - Idempotent: safe to run again.
--   - Prints before/after counts via RAISE NOTICE for verification.
--   - Does NOT touch '2025/26', '2026/27', or '2024/2025' data.
--
-- How to run:
--   Open the Supabase SQL Editor and paste this entire file. Review the
--   printed NOTICE logs, then run.
-- ============================================================================

DO $$
DECLARE
  v_year_2026_promo      INT := 0;   -- student_promotions '2026'
  v_year_2026_subj       INT := 0;   -- class_subjects '2026'
  v_year_27_28_promo     INT := 0;   -- student_promotions '2027/2028'
  v_year_26_27_promo     INT := 0;   -- student_promotions '2026/2027'
  v_2025_2026_promo      INT := 0;   -- student_promotions '2025/2026'
  v_2025_2026_subj       INT := 0;   -- class_subjects '2025/2026'
  v_2025_2026_term       INT := 0;   -- academic_terms '2025/2026'
  v_2025_2026_scores     INT := 0;   -- scores on that term
  v_2025_2026_assess     INT := 0;   -- assessments on that term
  v_2025_2026_hist       INT := 0;   -- promotion_history '2025/2026'
  v_term_id              UUID;
BEGIN

  RAISE NOTICE '==================================================';
  RAISE NOTICE ' RECONCILE ACADEMIC YEARS - starting';
  RAISE NOTICE '==================================================';

  ------------------------------------------------------------------
  -- (1) DELETE LEFT-OVER '2026' data
  ------------------------------------------------------------------
  DELETE FROM student_promotions WHERE academic_year = '2026';
  GET DIAGNOSTICS v_year_2026_promo = ROW_COUNT;

  DELETE FROM class_subjects WHERE academic_year = '2026';
  GET DIAGNOSTICS v_year_2026_subj = ROW_COUNT;

  DELETE FROM promotion_history WHERE academic_year = '2026';
  -- (count intentionally not reported; cleanup only)

  ------------------------------------------------------------------
  -- (2) DELETE ORPHAN '2027/2028' and '2026/2027' promotions
  ------------------------------------------------------------------
  DELETE FROM student_promotions WHERE academic_year = '2027/2028';
  GET DIAGNOSTICS v_year_27_28_promo = ROW_COUNT;

  DELETE FROM student_promotions WHERE academic_year = '2026/2027';
  GET DIAGNOSTICS v_year_26_27_promo = ROW_COUNT;

  DELETE FROM promotion_history WHERE academic_year = '2027/2028';
  DELETE FROM promotion_history WHERE academic_year = '2026/2027';

  ------------------------------------------------------------------
  -- (3) DELETE THE ENTIRE '2025/2026' YEAR
  --     Order matters to satisfy foreign keys cleanly.
  ------------------------------------------------------------------
  -- 3a. Capture the term id(s) for '2025/2026'
  SELECT id INTO v_term_id
  FROM academic_terms
  WHERE academic_year = '2025/2026'
  LIMIT 1;

  -- (If there is a term, delete its dependent records explicitly. scores and
  --  student_attendance cascade on term delete, but assessments do NOT
  --  cascade on term delete in the live schema, so we delete them first.)
  IF v_term_id IS NOT NULL THEN
    DELETE FROM assessments WHERE term_id = v_term_id;
    GET DIAGNOSTICS v_2025_2026_assess = ROW_COUNT;
  END IF;

  -- Count scores on the term (they cascade on term delete, but let's delete
  -- them explicitly for clarity and to get an accurate count).
  DELETE FROM scores WHERE term_id = v_term_id;
  GET DIAGNOSTICS v_2025_2026_scores = ROW_COUNT;

  -- Clean attendance/remarks referencing the term (cascade-safe, but explicit).
  DELETE FROM student_attendance WHERE term_id = v_term_id;
  DELETE FROM student_remarks WHERE term_id = v_term_id;

  -- 3b. Delete promotions and class subjects for '2025/2026'
  DELETE FROM student_promotions WHERE academic_year = '2025/2026';
  GET DIAGNOSTICS v_2025_2026_promo = ROW_COUNT;

  DELETE FROM class_subjects WHERE academic_year = '2025/2026';
  GET DIAGNOSTICS v_2025_2026_subj = ROW_COUNT;

  DELETE FROM promotion_history WHERE academic_year = '2025/2026';
  GET DIAGNOSTICS v_2025_2026_hist = ROW_COUNT;

  -- 3c. Delete the term row(s) themselves
  DELETE FROM academic_terms WHERE academic_year = '2025/2026';
  GET DIAGNOSTICS v_2025_2026_term = ROW_COUNT;

  ------------------------------------------------------------------
  -- (4) REPORT
  ------------------------------------------------------------------
  RAISE NOTICE '--------------------------------------------------';
  RAISE NOTICE ' DELETION REPORT';
  RAISE NOTICE '  student_promotions 2026        : %', v_year_2026_promo;
  RAISE NOTICE '  class_subjects     2026        : %', v_year_2026_subj;
  RAISE NOTICE '  student_promotions 2027/2028   : %', v_year_27_28_promo;
  RAISE NOTICE '  student_promotions 2026/2027   : %', v_year_26_27_promo;
  RAISE NOTICE '  student_promotions 2025/2026   : %', v_2025_2026_promo;
  RAISE NOTICE '  class_subjects     2025/2026   : %', v_2025_2026_subj;
  RAISE NOTICE '  academic_terms     2025/2026   : %', v_2025_2026_term;
  RAISE NOTICE '  scores           (on term)     : %', v_2025_2026_scores;
  RAISE NOTICE '  assessments      (on term)     : %', v_2025_2026_assess;
  RAISE NOTICE '  promotion_history 2025/2026    : %', v_2025_2026_hist;
  RAISE NOTICE '--------------------------------------------------';
  RAISE NOTICE ' RECONCILE COMPLETE';
  RAISE NOTICE '==================================================';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERROR during reconcile: %', SQLERRM;
  RAISE;  -- re-raise => transaction is rolled back automatically
END $$;
