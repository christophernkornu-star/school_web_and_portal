-- Add columns to support withholding results
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS results_withheld BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS withheld_reason TEXT;

-- Update RLS to allow admins to update these columns
-- (Existing policies might cover this if they allow full update on students table for admins)
