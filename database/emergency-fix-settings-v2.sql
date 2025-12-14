-- Emergency fix for Settings RLS (Comprehensive)
-- Run this in Supabase SQL Editor to fix "violates row-level security policy" errors

-- ==========================================
-- 1. Fix system_settings
-- ==========================================
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to clear conflicts
DROP POLICY IF EXISTS "Admins can manage system settings" ON system_settings;
DROP POLICY IF EXISTS "Everyone can view system settings" ON system_settings;
DROP POLICY IF EXISTS "Allow all for admins" ON system_settings;
DROP POLICY IF EXISTS "Allow select for all" ON system_settings;
DROP POLICY IF EXISTS "Authenticated users can manage settings" ON system_settings;
DROP POLICY IF EXISTS "Public can view settings" ON system_settings;

-- Create permissive policy for authenticated users
CREATE POLICY "Authenticated users can manage settings"
ON system_settings FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- Allow public read access
CREATE POLICY "Public can view settings"
ON system_settings FOR SELECT TO anon
USING (true);

GRANT ALL ON system_settings TO authenticated;
GRANT SELECT ON system_settings TO anon;


-- ==========================================
-- 2. Fix academic_settings
-- ==========================================
ALTER TABLE academic_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage academic settings" ON academic_settings;
DROP POLICY IF EXISTS "Everyone can view academic settings" ON academic_settings;
DROP POLICY IF EXISTS "Allow all for admins" ON academic_settings;
DROP POLICY IF EXISTS "Allow select for all" ON academic_settings;
DROP POLICY IF EXISTS "Authenticated users can manage academic settings" ON academic_settings;
DROP POLICY IF EXISTS "Public can view academic settings" ON academic_settings;

CREATE POLICY "Authenticated users can manage academic settings"
ON academic_settings FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Public can view academic settings"
ON academic_settings FOR SELECT TO anon
USING (true);

GRANT ALL ON academic_settings TO authenticated;
GRANT SELECT ON academic_settings TO anon;


-- ==========================================
-- 3. Fix academic_terms
-- ==========================================
-- Check if table exists first to avoid errors if it doesn't
DO $$ 
BEGIN 
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'academic_terms') THEN
    ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can manage academic terms" ON academic_terms;
    DROP POLICY IF EXISTS "Everyone can view academic terms" ON academic_terms;
    DROP POLICY IF EXISTS "Authenticated users can manage academic terms" ON academic_terms;
    DROP POLICY IF EXISTS "Public can view academic terms" ON academic_terms;

    CREATE POLICY "Authenticated users can manage academic terms"
    ON academic_terms FOR ALL TO authenticated
    USING (true) WITH CHECK (true);

    CREATE POLICY "Public can view academic terms"
    ON academic_terms FOR SELECT TO anon
    USING (true);

    GRANT ALL ON academic_terms TO authenticated;
    GRANT SELECT ON academic_terms TO anon;
  END IF;
END $$;
