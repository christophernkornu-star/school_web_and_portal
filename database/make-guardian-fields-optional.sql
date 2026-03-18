-- Allows guardian information to be optional
-- Run this in your Supabase SQL Editor to apply these changes

ALTER TABLE students ALTER COLUMN guardian_name DROP NOT NULL;
ALTER TABLE students ALTER COLUMN guardian_phone DROP NOT NULL;
