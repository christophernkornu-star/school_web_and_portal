-- ============================================================================
-- FIX: Allow Teachers to Delete Fee Payments
-- ============================================================================
-- Problem: The current RLS policy only allows admins and head teachers
-- to delete fee_payments. When a teacher tries to delete a payment,
-- Supabase silently ignores the delete (returns no error but deletes nothing),
-- making it appear successful while the record remains.
-- ============================================================================
-- Run this in Supabase SQL Editor
-- ============================================================================

-- First, drop the existing restrictive delete policy
DROP POLICY IF EXISTS "Admins can delete payments" ON fee_payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON fee_payments;

-- Recreate with teacher access included
CREATE POLICY "Staff can delete payments" ON fee_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin', 'head_teacher')
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to confirm the policy was created:
-- SELECT * FROM pg_policies WHERE tablename = 'fee_payments' AND cmd = 'DELETE';
