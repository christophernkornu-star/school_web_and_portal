-- First, check what policies currently exist on scores table
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'scores'
ORDER BY policyname;
