-- Create enum for complaint types
CREATE TYPE complaint_type AS ENUM ('complaint', 'suggestion');
CREATE TYPE complaint_status AS ENUM ('pending', 'reviewed', 'resolved');

-- Create table for complaints and suggestions
CREATE TABLE IF NOT EXISTS complaints (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type complaint_type NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status complaint_status DEFAULT 'pending',
    contact_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    admin_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Policy for inserting (anyone can insert)
CREATE POLICY "Anyone can submit complaints" ON complaints
    FOR INSERT
    WITH CHECK (true);

-- Policy for viewing (only admins can view all, maybe users can view their own if we had auth for them, but this is public)
-- For now, let's assume public submission doesn't require auth, but viewing is restricted to admins.
-- We need to check how admins are identified. Usually via a role in profiles or metadata.
-- Assuming standard RLS setup where admins have a role.

CREATE POLICY "Admins can view all complaints" ON complaints
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update complaints" ON complaints
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
