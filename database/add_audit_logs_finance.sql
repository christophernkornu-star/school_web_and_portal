-- ============================================================================
-- Add Audit Log Triggers for Finance Tables
-- ============================================================================
-- This script attaches the existing process_audit_log() trigger function
-- to the finance-related tables (fee_types, fee_structures, fee_payments)
-- so that all changes made on both admin and teacher portals are recorded
-- in the audit_logs table.
-- 
-- The process_audit_log() function is SECURITY DEFINER and handles
-- INSERT, UPDATE, and DELETE operations automatically.
-- ============================================================================

-- 1. Fee Types Table
DROP TRIGGER IF EXISTS audit_fee_types_changes ON public.fee_types;
CREATE TRIGGER audit_fee_types_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.fee_types
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 2. Fee Structures Table
DROP TRIGGER IF EXISTS audit_fee_structures_changes ON public.fee_structures;
CREATE TRIGGER audit_fee_structures_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.fee_structures
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- 3. Fee Payments Table
DROP TRIGGER IF EXISTS audit_fee_payments_changes ON public.fee_payments;
CREATE TRIGGER audit_fee_payments_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.fee_payments
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
