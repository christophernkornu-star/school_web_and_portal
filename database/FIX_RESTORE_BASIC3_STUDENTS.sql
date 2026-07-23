-- =====================================================
-- FIX: Restore Basic 3 students and implement
-- "Teacher Recommends, Admin Confirms" promotion workflow
-- =====================================================

-- =====================================================
-- PART 1: Restore students who were moved out of Basic 3
-- =====================================================

-- First, let's find Basic 3 class ID
DO $$
DECLARE
  v_basic3_class_id UUID;
  v_restored_count INTEGER := 0;
BEGIN
  -- Get Basic 3 class ID
  SELECT id INTO v_basic3_class_id FROM classes WHERE LOWER(name) = 'basic 3' LIMIT 1;
  
  IF v_basic3_class_id IS NULL THEN
    RAISE NOTICE 'Basic 3 class not found. Skipping restoration.';
    RETURN;
  END IF;

  -- Find students who were promoted OUT of Basic 3 via teacher promotions
  -- and move them back by looking at promotion_history
  UPDATE students s
  SET class_id = v_basic3_class_id,
      status = 'active'
  FROM promotion_history ph
  WHERE s.id = ph.student_id
    AND ph.from_class_id = v_basic3_class_id
    AND ph.action = 'promoted'
    AND s.class_id != v_basic3_class_id
    AND s.status != 'graduated';

  GET DIAGNOSTICS v_restored_count = ROW_COUNT;
  RAISE NOTICE 'Restored % students back to Basic 3', v_restored_count;
END $$;

-- =====================================================
-- PART 2: Add requires_admin_approval column
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'requires_admin_approval'
  ) THEN
    ALTER TABLE student_promotions 
    ADD COLUMN requires_admin_approval BOOLEAN DEFAULT FALSE;
    
    RAISE NOTICE 'Added requires_admin_approval column to student_promotions';
  ELSE
    RAISE NOTICE 'Column requires_admin_approval already exists';
  END IF;

  -- Add decided_by column (UUID for whoever made the decision - teacher or admin)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'decided_by'
  ) THEN
    ALTER TABLE student_promotions 
    ADD COLUMN decided_by UUID REFERENCES profiles(id);
    
    RAISE NOTICE 'Added decided_by column to student_promotions';
  END IF;
END $$;

-- =====================================================
-- PART 3: Create new function for Teacher Recommendations
-- (Only saves decision, does NOT move student)
-- =====================================================

CREATE OR REPLACE FUNCTION save_teacher_promotion_decisions(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_decision VARCHAR, -- 'promote' or 'repeat'
  p_remarks TEXT,
  p_teacher_id UUID
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
  
  -- Get next class from progression
  SELECT next_class_id INTO v_next_class_id 
  FROM class_progression WHERE current_class_id = v_current_class_id;

  -- Map 'promote'/'repeat' to the status format used in the DB
  v_decision_status := CASE 
    WHEN p_decision = 'promote' THEN 'promoted'
    WHEN p_decision = 'repeat' THEN 'repeated'
    ELSE p_decision
  END;

  -- Get the profile_id for the teacher
  SELECT profile_id INTO v_teacher_profile_id FROM teachers WHERE id = p_teacher_id;

  -- UPSERT into student_promotions
  -- IMPORTANT: We do NOT update students.class_id here
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
    TRUE, -- requires admin to confirm
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, academic_year)
  DO UPDATE SET
    promotion_status = v_decision_status,
    teacher_remarks = p_remarks,
    decided_by = v_teacher_profile_id,
    requires_admin_approval = TRUE,
    decision_date = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PART 4: Update execute_admin_promotion_decision to
-- clear the requires_admin_approval flag after admin confirms
-- =====================================================

CREATE OR REPLACE FUNCTION execute_admin_promotion_decision(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_user_id UUID,
  p_status VARCHAR, -- 'promoted', 'repeated', 'graduated'
  p_remarks TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_class_id UUID;
  v_current_class_id UUID;
BEGIN
  -- Get student's current class
  SELECT class_id INTO v_current_class_id FROM students WHERE id = p_student_id;
  
  -- Get next class from progression rule
  SELECT next_class_id INTO v_next_class_id 
  FROM class_progression 
  WHERE current_class_id = v_current_class_id;

  -- Upsert into student_promotions
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
    p_status,
    p_remarks,
    p_user_id,
    FALSE, -- Admin has approved, no longer pending
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, academic_year)
  DO UPDATE SET
    promotion_status = p_status,
    teacher_remarks = CASE WHEN p_remarks != '' THEN p_remarks ELSE student_promotions.teacher_remarks END,
    decided_by = p_user_id,
    requires_admin_approval = FALSE,
    decision_date = NOW(),
    updated_at = NOW();

  -- Update the students table so the change is reflected immediately
  IF p_status = 'graduated' THEN
    UPDATE students SET status = 'graduated' WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, NULL, 'graduated', p_user_id, 'Admin confirmed: ' || p_remarks);
    
  ELSIF p_status = 'repeated' THEN
    -- Keep in same class
    UPDATE students SET status = 'active', class_id = v_current_class_id WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, v_current_class_id, 'repeated', p_user_id, 'Admin confirmed: ' || p_remarks);
    
  ELSIF p_status = 'promoted' AND v_next_class_id IS NOT NULL THEN
    UPDATE students SET class_id = v_next_class_id, status = 'active' WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, v_next_class_id, 'promoted', p_user_id, 'Admin confirmed: ' || p_remarks);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

