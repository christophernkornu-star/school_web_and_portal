-- Fix RLS for fee_payments to ensure students can view their own payments
-- Run this in Supabase SQL Editor

-- First, ensure RLS is enabled
ALTER TABLE IF EXISTS fee_payments ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Students can view own payments" ON fee_payments;
DROP POLICY IF EXISTS "Staff can view all payments" ON fee_payments;
DROP POLICY IF EXISTS "Staff can view payments" ON fee_payments;
DROP POLICY IF EXISTS "Staff can insert payments" ON fee_payments;
DROP POLICY IF EXISTS "Staff can update payments" ON fee_payments;
DROP POLICY IF EXISTS "Staff can delete payments" ON fee_payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON fee_payments;
DROP POLICY IF EXISTS "Admins can update payments" ON fee_payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON fee_payments;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON fee_payments;
DROP POLICY IF EXISTS "Enable all for admins" ON fee_payments;
DROP POLICY IF EXISTS "Students can view own fee payments" ON fee_payments;
DROP POLICY IF EXISTS "Students can view own" ON fee_payments;

-- Recreate clean policies

-- Students can view their own payments
CREATE POLICY "Students can view own payments" ON fee_payments
  FOR SELECT USING (
    student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
  );

-- Staff (teachers, admins) can view all payments
CREATE POLICY "Staff can view all payments" ON fee_payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'teacher', 'head_teacher')
    )
  );

-- Staff can insert payments
CREATE POLICY "Staff can insert payments" ON fee_payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'teacher', 'head_teacher')
    )
  );

-- Admins can update payments
CREATE POLICY "Admins can update payments" ON fee_payments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'head_teacher')
    )
  );

-- Admins can delete payments
CREATE POLICY "Admins can delete payments" ON fee_payments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'head_teacher')
    )
  );

