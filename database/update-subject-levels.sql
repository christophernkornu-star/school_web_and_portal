-- Check current subjects and their levels
SELECT id, name, code, level FROM subjects ORDER BY name;

-- Update subjects to have proper levels
-- Example: Set common subjects for lower primary (Basic 1-3)
UPDATE subjects 
SET level = 'lower_primary' 
WHERE name IN (
  'English Language',
  'Mathematics',
  'Science',
  'Ghanaian Language',
  'Creative Arts',
  'Our World Our People',
  'Religious and Moral Education',
  'Physical Education',
  'Computing'
);

-- Set subjects for upper primary (Basic 4-6)
UPDATE subjects 
SET level = 'upper_primary' 
WHERE name IN (
  'English Language',
  'Mathematics',
  'Science',
  'Ghanaian Language',
  'Creative Arts',
  'History',
  'Religious and Moral Education',
  'Physical Education',
  'Computing',
  'French'
);

-- Set subjects for JHS (Basic 7-9)
UPDATE subjects 
SET level = 'jhs' 
WHERE name IN (
  'English Language',
  'Mathematics',
  'Integrated Science',
  'Social Studies',
  'Ghanaian Language',
  'French',
  'Religious and Moral Education',
  'Computing',
  'Pre-Technical Skills',
  'Career Technology',
  'Creative Arts',
  'Physical Education'
);

-- For subjects that apply to all levels, you can set multiple entries or use a different approach
-- Verify the updates
SELECT id, name, code, level FROM subjects ORDER BY level, name;
