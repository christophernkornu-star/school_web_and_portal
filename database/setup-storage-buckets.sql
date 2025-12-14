-- Setup Supabase Storage Buckets for Photo Uploads
-- This creates storage buckets for gallery photos and news images

-- ============================================
-- CREATE STORAGE BUCKETS
-- ============================================

-- Create gallery-photos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery-photos', 'gallery-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create news-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('news-images', 'news-images', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Gallery Photos Bucket Policies
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload gallery photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery-photos');

-- Allow public to view gallery photos
CREATE POLICY "Public can view gallery photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'gallery-photos');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete gallery photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery-photos');

-- News Images Bucket Policies
-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload news images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'news-images');

-- Allow public to view news images
CREATE POLICY "Public can view news images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'news-images');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete news images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'news-images');
