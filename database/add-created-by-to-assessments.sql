-- Add created_by column to assessments table
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES teachers(id);

-- Update existing assessments to set created_by if possible 
-- (This is tricky without history, but we can try to infer from class_subjects if teacher_id is there, 
-- or leave it null and only apply restriction for new ones)
-- For now, let's leave it nullable.

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON assessments(created_by);
