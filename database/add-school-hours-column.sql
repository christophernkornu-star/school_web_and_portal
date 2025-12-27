-- Add school_hours column to school_settings table
ALTER TABLE school_settings 
ADD COLUMN IF NOT EXISTS school_hours TEXT DEFAULT 'Monday - Friday: 7:30 AM - 3:00 PM';
