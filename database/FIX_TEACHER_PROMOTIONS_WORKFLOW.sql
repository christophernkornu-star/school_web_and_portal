-- ============================================================
-- FIX: Teacher Promotions Workflow
-- 
-- PROBLEM:
-- The teacher promotions page was calling execute_admin_promotion_decision
-- which IMMEDIATELY updates students.class_id. This caused promoted
-- students to disappear from their class.
--
-- SOLUTION:
-- 1. Restore incorrectly moved students back to their original classes
-- 2. Add requires_admin_approval and decided_by columns
-- 3. Create save_teacher_promotion_decisions (saves ONLY, no class_id change)
-- 4. Update execute_admin_promotion_decision (clears flag, moves student)
-- ============================================================

-- ============================================================
-- PART 1: Restore students incorrectly moved out of their classes
-- We look at promotion_history for all 'promoted' actions and
-- move students back to from_class_id if they were moved away
-- ============================================================

DO $$
DECLARE
  v_basic2_id UUID;
  v_basic3_id UUID;
  v_count INTEGER;
BEGIN
  -- Get class IDs
  SELECT id INTO v_basic2_id FROM classes WHERE LOWER(name) = 'basic 2' LIMIT 1;
  SELECT id INTO v_basic3_id FROM classes WHERE LOWER(name) = 'basic 3' LIMIT 1;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Starting student restoration...';
  RAISE NOTICE '==========================================';

  -- METHOD 1: Restore using promotion_history (for students with history records)
  
  -- Restore Basic 2 -> Basic 3 promoted students
  IF v_basic2_id IS NOT NULL THEN
    UPDATE students s
    SET class_id = v_basic2_id, status = 'active'
    FROM promotion_history ph
    WHERE s.id = ph.student_id
      AND ph.from_class_id = v_basic2_id
      AND ph.action = 'promoted'
      AND s.class_id != v_basic2_id
      AND s.status != 'graduated';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ PROMOTION HISTORY: Restored % students back to Basic 2', v_count;
  ELSE
    RAISE NOTICE '⚠️ Basic 2 class not found in database';
  END IF;

  -- Restore Basic 3 -> Basic 4 promoted students
  IF v_basic3_id IS NOT NULL THEN
    UPDATE students s
    SET class_id = v_basic3_id, status = 'active'
    FROM promotion_history ph
    WHERE s.id = ph.student_id
      AND ph.from_class_id = v_basic3_id
      AND ph.action = 'promoted'
      AND s.class_id != v_basic3_id
      AND s.status != 'graduated';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '✅ PROMOTION HISTORY: Restored % students back to Basic 3', v_count;
  ELSE
    RAISE NOTICE '⚠️ Basic 3 class not found in database';
  END IF;

  -- Restore any other students who were moved prematurely (using promotion_history)
  UPDATE students s
  SET class_id = ph.from_class_id, status = 'active'
  FROM promotion_history ph
  WHERE s.id = ph.student_id
    AND ph.action = 'promoted'
    AND s.class_id != ph.from_class_id
    AND s.status != 'graduated'
    AND s.class_id NOT IN (v_basic2_id, v_basic3_id); -- Skip already handled above
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE '✅ PROMOTION HISTORY: Restored % students from other classes', v_count;
  END IF;

  -- METHOD 2: Safety net - use student_promotions table directly
  -- Some students may have a promotion record but no history entry
  -- We find students whose student_promotions.current_class_id is DIFFERENT from students.class_id
  -- This means they were moved but the history record might be missing
  
  RAISE NOTICE '--- Running safety net check using student_promotions ---';
  
  UPDATE students s
  SET class_id = sp.current_class_id, status = 'active'
  FROM student_promotions sp
  WHERE s.id = sp.student_id
    AND sp.academic_year = (SELECT setting_value FROM system_settings WHERE setting_key = 'current_academic_year' LIMIT 1)
    AND sp.promotion_status IN ('promoted', 'repeated')
    AND s.class_id != sp.current_class_id
    AND s.class_id != sp.next_class_id -- Only if student was moved to a DIFFERENT class than where they should be
    AND s.status != 'graduated';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    RAISE NOTICE '✅ SAFETY NET: Restored % students using student_promotions.current_class_id', v_count;
  ELSE
    RAISE NOTICE 'ℹ️ SAFETY NET: No additional students needed restoration';
  END IF;
  
  RAISE NOTICE '==========================================';
  RAISE NOTICE 'Restoration complete!';
  RAISE NOTICE '==========================================';
END $$;

-- ============================================================
-- PART 2: Add new columns to student_promotions table
-- ============================================================

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

-- ============================================================
-- PART 3: Create save_teacher_promotion_decisions function
-- This function ONLY saves the teacher's decision in student_promotions.
-- It does NOT update students.class_id.
-- Admin approval is required (requires_admin_approval = TRUE).
-- ============================================================

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
  v_existing_status VARCHAR;
  v_existing_approved BOOLEAN;
BEGIN
  -- GUARD: Check if a confirmed decision already exists for this student+year
  SELECT promotion_status, requires_admin_approval 
  INTO v_existing_status, v_existing_approved
  FROM student_promotions 
  WHERE student_id = p_student_id AND academic_year = p_academic_year;

  -- If admin already confirmed (requires_admin_approval = FALSE), reject duplicate
  IF v_existing_status IS NOT NULL AND v_existing_approved = FALSE THEN
    RAISE NOTICE 'Student % already has a confirmed decision (%s) for year %. Skipping duplicate.', 
      p_student_id, v_existing_status, p_academic_year;
    RETURN TRUE; -- Silently succeed (idempotent)
  END IF;

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
    requires_admin_approval = TRUE,
    decision_date = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 4: Update execute_admin_promotion_decision function
-- Now clears requires_admin_approval flag and moves the student.
-- This should ONLY be called by admin.
-- ============================================================

CREATE OR REPLACE FUNCTION execute_admin_promotion_decision(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_user_id UUID,
  p_status VARCHAR,      -- 'promoted', 'repeated', 'graduated'
  p_remarks TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_class_id UUID;
  v_current_class_id UUID;
  v_existing_approved BOOLEAN;
  v_existing_status VARCHAR;
BEGIN
  -- GUARD: Check if this student+year was ALREADY processed (admin already confirmed)
  SELECT requires_admin_approval, promotion_status 
  INTO v_existing_approved, v_existing_status
  FROM student_promotions 
  WHERE student_id = p_student_id AND academic_year = p_academic_year;

  -- If already confirmed (requires_admin_approval = FALSE), REJECT duplicate
  IF v_existing_approved = FALSE THEN
    RAISE EXCEPTION 'Student % already has a confirmed promotion (%s) for year %. Cannot process again.',
      p_student_id, v_existing_status, p_academic_year;
  END IF;

  -- Get student's current class from THEIR CURRENT CLASS, not from the promotion record
  -- This ensures we always move FROM where they are NOW
  SELECT class_id INTO v_current_class_id FROM students WHERE id = p_student_id;
  
  -- Get next class from progression rule
  SELECT next_class_id INTO v_next_class_id 
  FROM class_progression WHERE current_class_id = v_current_class_id;

  -- Upsert into student_promotions with requires_admin_approval = FALSE
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
    FALSE,  -- Admin has confirmed, no longer pending
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

  -- NOW update the students table (admin confirmed, so we move them)
  -- This runs ONLY ONCE per student per year thanks to the check above
  IF p_status = 'graduated' THEN
    UPDATE students SET status = 'graduated' WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, NULL, 'graduated', p_user_id, 'Admin confirmed: ' || COALESCE(p_remarks, ''));
    
  ELSIF p_status = 'repeated' THEN
    -- Keep in same class
    UPDATE students SET status = 'active', class_id = v_current_class_id WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, v_current_class_id, 'repeated', p_user_id, 'Admin confirmed: ' || COALESCE(p_remarks, ''));
    
  ELSIF p_status = 'promoted' AND v_next_class_id IS NOT NULL THEN
    UPDATE students SET class_id = v_next_class_id, status = 'active' WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, v_next_class_id, 'promoted', p_user_id, 'Admin confirmed: ' || COALESCE(p_remarks, ''));
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
