-- Create a function to get class student count (bypasses RLS)
CREATE OR REPLACE FUNCTION get_class_student_count(p_class_id UUID, p_term_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- This makes it run with the privileges of the function owner
AS $$
DECLARE
  student_count INTEGER;
BEGIN
  -- Count unique students who have scores in this class and term
  SELECT COUNT(DISTINCT s.student_id)
  INTO student_count
  FROM scores s
  INNER JOIN students st ON s.student_id = st.id
  WHERE st.class_id = p_class_id
    AND s.term_id = p_term_id;
  
  RETURN COALESCE(student_count, 0);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_class_student_count(UUID, UUID) TO authenticated;
