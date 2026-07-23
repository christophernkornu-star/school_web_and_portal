-- ============================================================
-- FIX: Add unique constraint for save_teacher_promotion_decisions
-- The ON CONFLICT (student_id, academic_year) clause in the
-- function requires a unique constraint on these two columns.
-- ============================================================

-- Check if constraint exists; if not, add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'student_promotions'::regclass
    AND conname = 'student_promotions_student_id_academic_year_key'
  ) THEN
    -- Remove any duplicate records first (keep the latest one)
    DELETE FROM student_promotions sp1
    USING (
      SELECT student_id, academic_year, MAX(updated_at) as max_updated
      FROM student_promotions
      GROUP BY student_id, academic_year
      HAVING COUNT(*) > 1
    ) sp2
    WHERE sp1.student_id = sp2.student_id
      AND sp1.academic_year = sp2.academic_year
      AND sp1.updated_at < sp2.max_updated;
    
    -- Now add the unique constraint
    ALTER TABLE student_promotions
    ADD CONSTRAINT student_promotions_student_id_academic_year_key
    UNIQUE (student_id, academic_year);
    
    RAISE NOTICE '✅ Added unique constraint on (student_id, academic_year) to student_promotions';
  ELSE
    RAISE NOTICE 'ℹ️ Unique constraint already exists';
  END IF;
END $$;
