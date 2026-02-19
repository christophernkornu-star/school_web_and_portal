-- Add tables for PTA and SMC
-- Also ensures teachers and prefects are set up correctly

-- 1. PTA Members Table
CREATE TABLE IF NOT EXISTS pta_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- e.g. Chairman, Secretary
  contact TEXT,
  image_url TEXT,
  rank INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SMC Members Table
CREATE TABLE IF NOT EXISTS smc_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- e.g. Chairman, Community Rep
  contact TEXT,
  image_url TEXT,
  rank INTEGER DEFAULT 100,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE pta_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE smc_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (PTA)
CREATE POLICY "Public read pta" ON pta_members FOR SELECT USING (true);
CREATE POLICY "Admin manage pta" ON pta_members USING (auth.role() = 'authenticated'); -- Simplified

-- RLS Policies (SMC)
CREATE POLICY "Public read smc" ON smc_members FOR SELECT USING (true);
CREATE POLICY "Admin manage smc" ON smc_members USING (auth.role() = 'authenticated'); -- Simplified


-- STORAGE BUCKETS
-- We will use the existing 'leadership' bucket or create specific folders within it.
-- Let's stick to the 'leadership' bucket created in previous steps, just organizing by folder path in frontend.

-- Ensure the bucket exists (idempotent)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('leadership', 'leadership', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure policy exists
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'leadership' );

DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'leadership' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING ( bucket_id = 'leadership' AND auth.role() = 'authenticated' );

DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'leadership' AND auth.role() = 'authenticated' );
