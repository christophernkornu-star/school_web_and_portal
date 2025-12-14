# Supabase Storage Setup for Photo Uploads

This guide explains how to set up Supabase Storage to enable file uploads for gallery photos and news images.

## Overview

The application now supports two upload methods:
1. **File Upload** - Upload images directly from your device (recommended)
2. **URL Upload** - Provide a direct URL to an image hosted elsewhere

## Setup Instructions

### Step 1: Run the Storage Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `database/setup-storage-buckets.sql`
4. Copy and paste the SQL into the editor
5. Click **Run**

This will create two storage buckets:
- `gallery-photos` - For gallery photo uploads
- `news-images` - For news featured images

### Step 2: Verify Bucket Creation

1. In your Supabase dashboard, go to **Storage**
2. You should see two new buckets:
   - **gallery-photos** (Public)
   - **news-images** (Public)

### Step 3: Configure Storage Policies (Already Included)

The migration automatically sets up the following policies:

**Gallery Photos Bucket:**
- ✓ Authenticated users can upload photos
- ✓ Public can view photos
- ✓ Authenticated users can delete photos

**News Images Bucket:**
- ✓ Authenticated users can upload images
- ✓ Public can view images
- ✓ Authenticated users can delete images

## Using File Uploads

### In Admin Gallery Page

1. Click "Upload Photo"
2. Select "Upload File" method (default)
3. Click "Choose File" and select an image from your device
4. Fill in the title, description, and album name
5. Optionally check "Featured in Homepage Slideshow"
6. Click "Upload Photo"

The file will be uploaded to Supabase Storage and the URL will be automatically saved to the database.

### In Admin News Page

1. Click "Add News"
2. In the "Featured Image" section, select "Upload File"
3. Choose an image file from your device
4. Fill in the news title, content, and other details
5. Click "Create News"

The image will be uploaded and linked to the news article.

## File Upload Specifications

- **Maximum file size:** 5MB
- **Supported formats:** JPG, PNG, GIF, WebP
- **Storage location:** 
  - Gallery photos: `gallery-photos` bucket
  - News images: `news-images` bucket
- **File naming:** Automatically generated unique names using timestamp and random string

## Alternative: Using URL Upload

If you prefer to host images elsewhere (e.g., Imgur, Cloudinary), you can:

1. Select "Image URL" method
2. Paste the direct URL to the image
3. A preview will be shown if the URL is valid
4. Continue with the rest of the form

## Troubleshooting

### "Error uploading file" message

**Possible causes:**
1. File size exceeds 5MB - Compress your image
2. Invalid file type - Ensure it's an image file
3. Storage bucket not created - Run the migration SQL
4. User not authenticated - Log in again

### Images not displaying

**Check:**
1. Buckets are set to **Public** in Supabase Storage settings
2. Storage policies are correctly applied
3. Browser console for CORS or network errors

### Storage quota exceeded

Supabase free tier includes:
- 1GB storage
- 2GB bandwidth per month

Consider:
- Compressing images before upload
- Upgrading to a paid plan
- Using external image hosting for some content

## Benefits of File Upload

✅ **Easier for users** - No need to find image URLs  
✅ **Faster workflow** - Upload directly from device  
✅ **Centralized storage** - All images in one place  
✅ **Better organization** - Automatic file naming  
✅ **Preview before upload** - See the image before saving  
✅ **File validation** - Automatic size and type checking  

## Security Notes

- Only authenticated users can upload files
- Public read access allows images to display on the website
- File names are randomized to prevent conflicts
- Storage policies enforce access control
- Files are served over HTTPS

## Next Steps

After setup:
1. Test uploading a photo in the admin gallery
2. Verify the photo appears on the website
3. Test uploading a news image
4. Check that spotlight photos work correctly
5. Monitor storage usage in Supabase dashboard
