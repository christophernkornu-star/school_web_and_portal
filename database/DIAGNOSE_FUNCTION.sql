-- Check if save_teacher_promotion_decisions function exists
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'save_teacher_promotion_decisions';

-- Check what columns exist in student_promotions
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'student_promotions'
ORDER BY ordinal_position;

-- Check if there's a unique constraint on (student_id, academic_year)
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'student_promotions'::regclass;
