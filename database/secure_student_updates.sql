-- SECURE STUDENT UPDATES
-- Prevents Mass Assignment Vulnerability by restricting what students can update.

-- 1. Drop the overly permissive policy if it exists (for clean slate)
DROP POLICY IF EXISTS "Students can update own record" ON students;

-- 2. Create the base update policy
-- This allows the *attempt* to update, but the Trigger below will filter the columns.
CREATE POLICY "Students can update own record" ON students
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- 3. Create a Trigger Function to enforce column whitelisting
CREATE OR REPLACE FUNCTION check_student_update_permissions()
RETURNS TRIGGER AS $$
DECLARE
  current_role text;
  jwt_claims jsonb;
BEGIN
  -- Get the current user's role from the JWT context
  -- We access the request headers or current setting if auth.jwt() is not directly available in this context
  -- primarily relying on auth.uid() check below as it is most robust.
  
  -- However, for the specific error, let's simplify.
  -- We don't strictly need current_role variable if we just check profile ownership.
  
  -- Safer approach: Check if the user is modifying their own record via the standard API
  IF auth.uid() = OLD.profile_id THEN

    -- Check if sensitive columns are being modified
    -- IF NEW.class_id IS DISTINCT FROM OLD.class_id THEN RAISE EXCEPTION 'You cannot change your class.'; END IF;
    -- IF NEW.status IS DISTINCT FROM OLD.status THEN RAISE EXCEPTION 'You cannot change your status.'; END IF;
    -- IF NEW.admission_date IS DISTINCT FROM OLD.admission_date THEN RAISE EXCEPTION 'You cannot change admission date.'; END IF;
    
    -- Whitelist Approach (Better): Ensure ONLY allowed columns changed.
    -- Allowed: guardian_phone, guardian_email, address (if exists), maybe profile photo
    
    IF (
       NEW.id IS DISTINCT FROM OLD.id OR
       NEW.first_name IS DISTINCT FROM OLD.first_name OR
       NEW.last_name IS DISTINCT FROM OLD.last_name OR
       NEW.middle_name IS DISTINCT FROM OLD.middle_name OR
       NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth OR
       NEW.gender IS DISTINCT FROM OLD.gender OR
       NEW.class_id IS DISTINCT FROM OLD.class_id OR
       NEW.admission_date IS DISTINCT FROM OLD.admission_date OR
       NEW.status IS DISTINCT FROM OLD.status OR
       NEW.profile_id IS DISTINCT FROM OLD.profile_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized update: You can only update contact information.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach the Trigger to the students table
DROP TRIGGER IF EXISTS trg_secure_student_updates ON students;

CREATE TRIGGER trg_secure_student_updates
  BEFORE UPDATE ON students
  FOR EACH ROW
  EXECUTE FUNCTION check_student_update_permissions();

-- 5. Grant permissions (Double check)
GRANT UPDATE(guardian_phone, guardian_email, guardian_name) ON students TO authenticated;
