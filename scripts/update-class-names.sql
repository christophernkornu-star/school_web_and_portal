-- Update class names from Primary/JHS to Basic 1-9

-- Primary 1 -> Basic 1
UPDATE classes SET name = 'Basic 1' WHERE name = 'Primary 1';

-- Primary 2 -> Basic 2
UPDATE classes SET name = 'Basic 2' WHERE name = 'Primary 2';

-- Primary 3 -> Basic 3
UPDATE classes SET name = 'Basic 3' WHERE name = 'Primary 3';

-- Primary 4 -> Basic 4
UPDATE classes SET name = 'Basic 4' WHERE name = 'Primary 4';

-- Primary 5 -> Basic 5
UPDATE classes SET name = 'Basic 5' WHERE name = 'Primary 5';

-- Primary 6 -> Basic 6
UPDATE classes SET name = 'Basic 6' WHERE name = 'Primary 6';

-- JHS 1 -> Basic 7
UPDATE classes SET name = 'Basic 7' WHERE name = 'JHS 1';

-- JHS 2 -> Basic 8
UPDATE classes SET name = 'Basic 8' WHERE name = 'JHS 2';

-- JHS 3 -> Basic 9
UPDATE classes SET name = 'Basic 9' WHERE name = 'JHS 3';
