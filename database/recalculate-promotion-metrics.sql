-- Update student_promotions with recalculated metrics based on ALL terms
-- This script iterates through all existing promotion records and recalculates the metrics
-- using the updated calculate_student_promotion_metrics function which now considers all terms.

DO $$
DECLARE
  r RECORD;
  metrics RECORD;
  counter INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting recalculation of promotion metrics...';

  -- Iterate over all records in student_promotions
  FOR r IN SELECT * FROM student_promotions LOOP
    
    -- Calculate metrics using the updated function
    -- The function signature is calculate_student_promotion_metrics(student_id, academic_year)
    SELECT * INTO metrics FROM calculate_student_promotion_metrics(r.student_id, r.academic_year);
    
    -- Update the record
    UPDATE student_promotions
    SET
      total_subjects = metrics.total_subjects,
      total_score = metrics.total_score,
      average_score = metrics.average_score,
      minimum_required_average = metrics.minimum_required,
      meets_auto_promotion_criteria = metrics.meets_criteria,
      requires_teacher_decision = (metrics.recommendation = 'teacher_decision'),
      updated_at = NOW()
    WHERE id = r.id;
    
    counter := counter + 1;
  END LOOP;
  
  RAISE NOTICE 'Recalculated metrics for % records.', counter;
END $$;
