-- Add 'transferred' to teacher status check constraint
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_status_check;
ALTER TABLE teachers ADD CONSTRAINT teachers_status_check CHECK (status IN ('active', 'inactive', 'on_leave', 'transferred'));

-- Drop the unique index on class teachers to allow temporary assignment
DROP INDEX IF EXISTS idx_unique_class_teacher_per_class;

-- Create a new partial unique index that only enforces uniqueness for ACTIVE teachers
-- This allows an 'on_leave' teacher to hold the position while an 'active' teacher also holds it temporarily
-- We need to join with teachers table, but indexes can't join.
-- So we can't enforce this purely with a simple index if status is on another table.
-- However, we can just remove the unique constraint entirely and handle it in application logic.
-- Or we can add a 'is_temporary' flag to assignments? No, user didn't ask for that.

-- Let's just drop the strict unique constraint. The application logic will handle the "one active teacher" rule.
