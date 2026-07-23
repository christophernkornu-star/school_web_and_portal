-- ============================================================
-- CREATE save_teacher_promotion_decisions FUNCTION
-- This function ONLY saves the teacher's decision in student_promotions.
-- It does NOT update students.class_id.
-- Admin must confirm decisions from the admin promotions page.
-- ============================================================

-- First add the requires_admin_approval and decided_by columns if they don't exist
DO $$
BEGIN
  -- Column: requires_admin_approval (TRUE = teacher decision pending admin confirmation)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'requires_admin_approval'
  ) THEN
    ALTER TABLE student_promotions 
    ADD COLUMN requires_admin_approval BOOLEAN DEFAULT FALSE;
    RAISE NOTICE '✅ Added requires_admin_approval column to student_promotions';
  ELSE
    RAISE NOTICE 'ℹ️ requires_admin_approval column already exists';
  END IF;

  -- Column: decided_by (profile_id of whoever made the final decision)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'decided_by'
  ) THEN
    ALTER TABLE student_promotions 
    ADD COLUMN decided_by UUID REFERENCES profiles(id);
    RAISE NOTICE '✅ Added decided_by column to student_promotions';
  ELSE
    RAISE NOTICE 'ℹ️ decided_by column already exists';
  END IF;
END $$;

-- Now create the function
CREATE OR REPLACE FUNCTION save_teacher_promotion_decisions(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_decision VARCHAR,    -- 'promote' or 'repeat'
  p_remarks TEXT,
  p_teacher_id UUID      -- teachers.id (internal teachers table ID)
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_class_id UUID;
  v_next_class_id UUID;
  v_teacher_profile_id UUID;
  v_decision_status VARCHAR;
BEGIN
  -- Get the student's current class
  SELECT class_id INTO v_current_class_id FROM students WHERE id = p_student_id;
  
  -- Get next class from progression rule
  SELECT next_class_id INTO v_next_class_id 
  FROM class_progression WHERE current_class_id = v_current_class_id;

  -- Map 'promote'/'repeat' to DB format ('promoted'/'repeated')
  v_decision_status := CASE 
    WHEN p_decision = 'promote' THEN 'promoted'
    WHEN p_decision = 'repeat' THEN 'repeated'
    ELSE p_decision
  END;

  -- Get the teacher's profile_id (auth.users id) for the decided_by column
  SELECT profile_id INTO v_teacher_profile_id FROM teachers WHERE id = p_teacher_id;

  -- UPSERT into student_promotions
  -- KEY: We do NOT update students.class_id here. Admin must confirm.
  INSERT INTO student_promotions (
    student_id,
    academic_year,
    current_class_id,
    next_class_id,
    promotion_status,
    teacher_remarks,
    decided_by,
    requires_admin_approval,
    decision_date,
    updated_at
  ) VALUES (
    p_student_id,
    p_academic_year,
    v_current_class_id,
    v_next_class_id,
    v_decision_status,
    p_remarks,
    v_teacher_profile_id,
    TRUE,  -- requires admin approval
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, academic_year)
  DO UPDATE SET
    promotion_status = v_decision_status,
    teacher_remarks = p_remarks,
    decided_by = v_teacher_profile_id,
    requires_admin_approval = TRUE, -- Reset to require admin approval
    decision_date = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
