-- Function to execute admin promotion decision
-- This function updates the promotion status AND moves the student to the next class (or keeps them in current class)
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
  v_promotion_record RECORD;
  v_next_class_id UUID;
  v_is_graduation BOOLEAN;
  v_current_student_class_id UUID;
  v_current_class_id UUID;
BEGIN
  -- Get current student status
  SELECT class_id INTO v_current_student_class_id FROM students WHERE id = p_student_id;

  -- Try to get existing promotion record
  SELECT sp.*, cp.next_class_id AS cp_next_class_id, cp.is_graduation AS cp_is_graduation
  INTO v_promotion_record
  FROM student_promotions sp
  LEFT JOIN class_progression cp ON cp.current_class_id = sp.current_class_id
  WHERE sp.student_id = p_student_id 
    AND sp.academic_year = p_academic_year;
  
  IF NOT FOUND THEN
    -- Record doesn't exist, create it
    -- We need to know the class the student was in for this academic year.
    -- Assuming the student's current class_id is the one relevant for this promotion cycle if no record exists.
    v_current_class_id := v_current_student_class_id;
    
    -- Get progression info
    SELECT next_class_id, is_graduation 
    INTO v_next_class_id, v_is_graduation 
    FROM class_progression 
    WHERE current_class_id = v_current_class_id;
    
    INSERT INTO student_promotions (
        student_id, 
        academic_year, 
        current_class_id, 
        promotion_status, 
        next_class_id, 
        requires_teacher_decision,
        teacher_remarks,
        updated_at
    ) VALUES (
        p_student_id, 
        p_academic_year, 
        v_current_class_id, 
        p_status,
        v_next_class_id, 
        FALSE,
        p_remarks,
        NOW()
    );
    
  ELSE
    -- Record exists, update it
    -- We prefer the value from class_progression (cp_next_class_id) if available, 
    -- as it represents the current rule for where they should go.
    v_next_class_id := COALESCE(v_promotion_record.cp_next_class_id, v_promotion_record.next_class_id);
    v_is_graduation := COALESCE(v_promotion_record.cp_is_graduation, false);
    v_current_class_id := v_promotion_record.current_class_id;

    -- Fallback: If next_class_id is still NULL, try to look it up directly
    IF v_next_class_id IS NULL THEN
        SELECT next_class_id, is_graduation 
        INTO v_next_class_id, v_is_graduation
        FROM class_progression 
        WHERE current_class_id = v_current_class_id;
    END IF;

    -- Also update the next_class_id in the record if it was missing or different
    UPDATE student_promotions
    SET 
      teacher_remarks = p_remarks,
      promotion_status = p_status,
      next_class_id = v_next_class_id, -- Ensure this is set
      transition_executed_at = NOW(),
      updated_at = NOW()
    WHERE student_id = p_student_id AND academic_year = p_academic_year;
  END IF;
  
  -- Execute the decision (Move the student)
  IF p_status = 'promoted' OR p_status = 'graduated' THEN
    
    -- Check for missing progression rule
    IF p_status = 'promoted' AND v_next_class_id IS NULL AND NOT v_is_graduation THEN
        RAISE EXCEPTION 'Cannot promote student: No next class defined for current class (ID: %). Please check Class Progression settings.', v_current_class_id;
    END IF;
    
    IF p_status = 'graduated' OR (p_status = 'promoted' AND v_is_graduation) THEN
       -- Handle Graduation
       UPDATE students SET status = 'graduated' WHERE id = p_student_id;
       
       INSERT INTO promotion_history (
        student_id, academic_year, from_class_id, to_class_id,
        action, performed_by, remarks
      ) VALUES (
        p_student_id, p_academic_year, v_current_class_id, NULL,
        'graduated', p_user_id, 'Admin decision: ' || p_remarks
      );
      
    ELSIF v_next_class_id IS NOT NULL THEN
       -- Handle Promotion
       -- Only move if they aren't already in the next class
       IF v_current_student_class_id != v_next_class_id THEN
           UPDATE students SET class_id = v_next_class_id WHERE id = p_student_id;
           
           INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id,
            action, performed_by, remarks
          ) VALUES (
            p_student_id, p_academic_year, v_current_class_id, v_next_class_id,
            'promoted', p_user_id, 'Admin decision: ' || p_remarks
          );
       END IF;
    END IF;
    
  ELSIF p_status = 'repeated' THEN
    -- Handle Repeat
    -- If they were previously moved to next class, move them back to current_class_id
    IF v_current_student_class_id != v_current_class_id THEN
        UPDATE students SET class_id = v_current_class_id WHERE id = p_student_id;
        
         INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id,
            action, performed_by, remarks
          ) VALUES (
            p_student_id, p_academic_year, v_current_class_id, v_current_class_id,
            'repeated', p_user_id, 'Admin decision: ' || p_remarks
          );
    END IF;
      
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
