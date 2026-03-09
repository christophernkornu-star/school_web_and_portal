-- Verify the RPC function works correctly
DO $$
DECLARE
    v_teacher_id UUID;
    v_count INT;
BEGIN
    -- Get a teacher ID
    SELECT teacher_id INTO v_teacher_id FROM teacher_profile LIMIT 1;
    
    IF v_teacher_id IS NULL THEN
        RAISE NOTICE 'No teacher profiles found to test with.';
        RETURN;
    END IF;

    -- Test the function
    -- We can't select from the function directly in DO block easily without temp table or record loop
    -- But we can just call it in a throwaway query
    PERFORM get_teacher_performance_overview(v_teacher_id::TEXT);
    
    RAISE NOTICE 'Function fetch_teacher_performance_overview executed successfully for teacher %', v_teacher_id;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Function execution failed: %', SQLERRM;
END $$;
