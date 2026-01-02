-- Fix RLS policies for student_promotions to allow admins to manage records

-- Drop existing admin view policy if it exists (we'll replace it with a manage policy)
DROP POLICY IF EXISTS admins_view_promotions ON student_promotions;
DROP POLICY IF EXISTS admins_manage_all_promotions ON student_promotions;

-- Create a comprehensive policy for admins to manage all promotion records
CREATE POLICY admins_manage_all_promotions ON student_promotions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Ensure the table has RLS enabled
ALTER TABLE student_promotions ENABLE ROW LEVEL SECURITY;
