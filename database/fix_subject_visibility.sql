
-- Set basic subjects to 'all' or NULL so they appear for everyone
UPDATE subjects SET level = NULL 
WHERE name IN ('Mathematics', 'English Language', 'French', 'Computing', 'Information and Communication Technology', 'ICT', 'Physical Education', 'Religious and Moral Education', 'RME', 'Ghanaian Language');

-- Ensure JHS specific subjects are definitely 'jhs'
UPDATE subjects SET level = 'jhs'
WHERE name ILIKE '%Social Studies%' 
   OR name ILIKE '%Integrated Science%' 
   OR name ILIKE '%Design%' 
   OR name ILIKE '%Career%' 
   OR name ILIKE '%Technical%';
