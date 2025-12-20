-- Fix RLS policies for fee management tables

-- Drop existing policies if they conflict (optional, but safer to just add new ones for specific operations)
-- We will add policies for INSERT, UPDATE, DELETE for admins and head teachers

-- Fee Types Policies
CREATE POLICY "Admins can insert fee types" ON fee_types
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'head_teacher')
    )
  );

CREATE POLICY "Admins can update fee types" ON fee_types
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'head_teacher')
    )
  );

CREATE POLICY "Admins can delete fee types" ON fee_types
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'head_teacher')
    )
  );

-- Fee Structures Policies
CREATE POLICY "Admins can insert fee structures" ON fee_structures
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'head_teacher')
    )
  );

CREATE POLICY "Admins can update fee structures" ON fee_structures
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'head_teacher')
    )
  );

CREATE POLICY "Admins can delete fee structures" ON fee_structures
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'head_teacher')
    )
  );
