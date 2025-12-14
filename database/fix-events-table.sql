-- Events Table Migration
-- Ensures proper schema and RLS policies for events management

-- ============================================
-- ADD MISSING COLUMNS (if upgrading existing table)
-- ============================================
DO $$ 
BEGIN
  -- Add published column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'events' 
                 AND column_name = 'published') THEN
    ALTER TABLE events ADD COLUMN published BOOLEAN DEFAULT true;
  END IF;
  
  -- Add event_time column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'events' 
                 AND column_name = 'event_time') THEN
    ALTER TABLE events ADD COLUMN event_time TEXT;
  END IF;
  
  -- Ensure event_type column exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'events' 
                 AND column_name = 'event_type') THEN
    ALTER TABLE events ADD COLUMN event_type TEXT DEFAULT 'academic';
  END IF;
END $$;

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Everyone can view published events (for public website)
DROP POLICY IF EXISTS "Anyone can view published events" ON events;
CREATE POLICY "Anyone can view published events" ON events
  FOR SELECT 
  USING (published = true);

-- Admins can view all events
DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events" ON events
  FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can manage all events
DROP POLICY IF EXISTS "Admins can manage events" ON events;
CREATE POLICY "Admins can manage events" ON events
  FOR ALL 
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_published ON events(published);
CREATE INDEX IF NOT EXISTS idx_events_event_date ON events(event_date);
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
