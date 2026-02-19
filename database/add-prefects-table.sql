-- Create table for storing school prefects
CREATE TABLE IF NOT EXISTS prefects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL, -- e.g. Senior Prefect (Boys), Compound Overseer
  image_url TEXT,
  rank INTEGER DEFAULT 100, -- For ordering: 1 = Head Boy, 2 = Head Girl, etc.
  academic_year TEXT, -- e.g. "2023/2024"
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE prefects ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to prefects"
  ON prefects FOR SELECT
  USING (true);

-- Allow admins to manage prefects (assuming admin role or similar checks exist)
-- For simplicity, we'll allow authenticated users with 'admin' role or just restrict write in another way
-- This matches other policies in the system
CREATE POLICY "Allow admins to insert prefects"
  ON prefects FOR INSERT
  WITH CHECK (auth.role() = 'authenticated'); -- Simplified, usually check specific claim

CREATE POLICY "Allow admins to update prefects"
  ON prefects FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Allow admins to delete prefects"
  ON prefects FOR DELETE
  USING (auth.role() = 'authenticated');

-- Ensure teachers table has necessary columns for display
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS position TEXT; -- e.g. Headmaster, Senior Housemaster
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS display_rank INTEGER DEFAULT 100;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS bio TEXT;

-- Create storage bucket for leadership photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('leadership', 'leadership', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to leadership bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'leadership' );

CREATE POLICY "Authenticated Upload" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'leadership' AND auth.role() = 'authenticated' );
