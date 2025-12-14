-- Gallery Photos - Add Spotlight Column
-- Allows marking photos for homepage slideshow

-- ============================================
-- ADD SPOTLIGHT COLUMN
-- ============================================
DO $$ 
BEGIN
  -- Add is_spotlight column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'gallery_photos' 
                 AND column_name = 'is_spotlight') THEN
    ALTER TABLE gallery_photos ADD COLUMN is_spotlight BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- CREATE INDEX FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_gallery_photos_spotlight ON gallery_photos(is_spotlight) WHERE is_spotlight = true;

-- ============================================
-- UPDATE EXISTING PHOTOS (Optional)
-- ============================================
-- Uncomment to mark the 5 most recent photos as spotlight
-- UPDATE gallery_photos 
-- SET is_spotlight = true 
-- WHERE id IN (
--   SELECT id FROM gallery_photos 
--   ORDER BY created_at DESC 
--   LIMIT 5
-- );
