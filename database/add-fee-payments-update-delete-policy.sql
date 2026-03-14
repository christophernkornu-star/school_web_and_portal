-- Allow Staff (Teachers, Admins, Head Teachers) to update fee payments
CREATE POLICY "Staff can update payments" ON fee_payments FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin', 'head_teacher')
  )
);

-- Allow Staff (Teachers, Admins, Head Teachers) to delete fee payments
CREATE POLICY "Staff can delete payments" ON fee_payments FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin', 'head_teacher')
  )
);
