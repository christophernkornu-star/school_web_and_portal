-- Function to execute admin promotion decision
-- This function updates the promotion status AND immediately updates the student record
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
    decision_date,
    updated_at
  ) VALUES (
    p_student_id,
    p_academic_year,
    v_current_class_id,
    v_next_class_id,
    p_status,
    p_remarks,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, academic_year)
  DO UPDATE SET
    promotion_status = p_status,
    teacher_remarks = p_remarks,
    decision_date = NOW(),
    updated_at = NOW();

  -- Update the students table so the change is reflected immediately
  IF p_status = 'graduated' THEN
    UPDATE students SET status = 'graduated' WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, NULL, 'graduated', p_user_id, 'Admin decision: ' || p_remarks);
    
  ELSIF p_status = 'repeated' THEN
    UPDATE students SET status = 'active', class_id = v_current_class_id WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, v_current_class_id, 'repeated', p_user_id, 'Admin decision: ' || p_remarks);
    
  ELSIF p_status = 'promoted' AND v_next_class_id IS NOT NULL THEN
    UPDATE students SET class_id = v_next_class_id, status = 'active' WHERE id = p_student_id;
    
    INSERT INTO promotion_history (student_id, academic_year, from_class_id, to_class_id, action, performed_by, remarks)
    VALUES (p_student_id, p_academic_year, v_current_class_id, v_next_class_id, 'promoted', p_user_id, 'Admin decision: ' || p_remarks);
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
