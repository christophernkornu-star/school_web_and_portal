-- Performance Indexes for Promotion System & Reports

-- 1. Accelerate "Academic Year" lookups
-- Used heavily in: calculate_student_promotion_metrics, report card generation
CREATE INDEX IF NOT EXISTS idx_academic_terms_year ON academic_terms(academic_year);

-- 2. Accelerate Promotion Record lookups
-- Used in: Teacher Portal (checking lists), Student Portal (checking status)
CREATE INDEX IF NOT EXISTS idx_student_promotions_year ON student_promotions(academic_year);
CREATE INDEX IF NOT EXISTS idx_student_promotions_class ON student_promotions(current_class_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_status ON student_promotions(promotion_status);

-- 3. Accelerate Class Progression Lookups
-- Used in every promotion calculation join
CREATE INDEX IF NOT EXISTS idx_class_progression_current ON class_progression(current_class_id);

-- 4. Accelerate Score Aggregates
-- Ensure we can quickly find all scores for a student in a specific year
-- (Scores table already has idx_scores_term, but this helps combined lookups if term_id is not enough)
CREATE INDEX IF NOT EXISTS idx_scores_student_term_combined ON scores(student_id, term_id) INCLUDE (total);
