-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    entity_name TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,          -- 'INSERT', 'UPDATE', 'DELETE'
    old_data JSONB,                -- Previous state
    new_data JSONB,                -- New state
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- User who made the change
    changed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL -- Resolved profile ID for faster UI joins
);

-- 2. Create the index for faster querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Read policy: Only admins can read audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Insert policy: Handled automatically by database triggers (BYPASS RLS if SECURITY DEFINER)

-- 5. Create a generic trigger function to record changes
CREATE OR REPLACE FUNCTION public.process_audit_log()
RETURNS TRIGGER AS $$
DECLARE
    v_user_jwt JSONB;
    v_user_id UUID;
BEGIN
    -- Attempt to get the authenticated user from the current PostgREST context
    BEGIN
        v_user_jwt := current_setting('request.jwt.claims', true)::jsonb;
        v_user_id := (v_user_jwt->>'sub')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL; -- Might be a superuser/service-role background job
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.audit_logs (entity_name, entity_id, action, new_data, changed_by, changed_by_profile_id)
        VALUES (TG_TABLE_NAME, NEW.id::text, TG_OP, row_to_json(NEW)::jsonb, v_user_id, v_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.audit_logs (entity_name, entity_id, action, old_data, new_data, changed_by, changed_by_profile_id)
        VALUES (TG_TABLE_NAME, NEW.id::text, TG_OP, row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, v_user_id, v_user_id);
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.audit_logs (entity_name, entity_id, action, old_data, changed_by, changed_by_profile_id)
        VALUES (TG_TABLE_NAME, OLD.id::text, TG_OP, row_to_json(OLD)::jsonb, v_user_id, v_user_id);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Attach the trigger to critical tables
-- Scores Table
DROP TRIGGER IF EXISTS audit_scores_changes ON public.scores;
CREATE TRIGGER audit_scores_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.scores
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Student Attendance Table
DROP TRIGGER IF EXISTS audit_attendance_changes ON public.student_attendance;
CREATE TRIGGER audit_attendance_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.student_attendance
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();

-- Student Remarks Table
DROP TRIGGER IF EXISTS audit_remarks_changes ON public.student_remarks;
CREATE TRIGGER audit_remarks_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.student_remarks
    FOR EACH ROW EXECUTE FUNCTION public.process_audit_log();
