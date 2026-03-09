
-- 1. Check all subjects and their levels
SELECT id, name, level FROM subjects ORDER BY name;

-- 2. Inspect JHS specific names
SELECT id, name, level FROM subjects WHERE name ILIKE '%Arts%' OR name ILIKE '%Science%' OR name ILIKE '%Math%';
