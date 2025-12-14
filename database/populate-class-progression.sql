-- Populate class_progression table
-- This defines which class each student moves to when promoted

-- Clear existing progression data
DELETE FROM class_progression;

-- Insert class progression mappings
-- The system uses this to know where to move students when promoted

-- KG Progression
INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name = 'KG 1' LIMIT 1),
  (SELECT id FROM classes WHERE name = 'KG 2' LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name = 'KG 1')
  AND EXISTS (SELECT 1 FROM classes WHERE name = 'KG 2');

INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name = 'KG 2' LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 1', 'Primary 1') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name = 'KG 2')
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 1', 'Primary 1'));

-- Primary/Basic School Progression (Basic 1 to Basic 6)
INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 1', 'Primary 1') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 2', 'Primary 2') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 1', 'Primary 1'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 2', 'Primary 2'));

INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 2', 'Primary 2') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 3', 'Primary 3') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 2', 'Primary 2'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 3', 'Primary 3'));

INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 3', 'Primary 3') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 4', 'Primary 4') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 3', 'Primary 3'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 4', 'Primary 4'));

INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 4', 'Primary 4') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 5', 'Primary 5') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 4', 'Primary 4'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 5', 'Primary 5'));

INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 5', 'Primary 5') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 6', 'Primary 6') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 5', 'Primary 5'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 6', 'Primary 6'));

-- Basic 6 to JHS (Basic 7)
INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 6', 'Primary 6') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 7', 'JHS 1') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 6', 'Primary 6'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 7', 'JHS 1'));

-- JHS Progression (Basic 7 to Basic 9)
INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 7', 'JHS 1') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 8', 'JHS 2') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 7', 'JHS 1'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 8', 'JHS 2'));

INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 8', 'JHS 2') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 9', 'JHS 3') LIMIT 1),
  FALSE
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 8', 'JHS 2'))
  AND EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 9', 'JHS 3'));

-- Basic 9 / JHS 3 is graduation (final year)
-- For graduation, we set next_class_id to current_class_id (they stay but status becomes 'graduated')
INSERT INTO class_progression (current_class_id, next_class_id, is_graduation)
SELECT 
  (SELECT id FROM classes WHERE name IN ('Basic 9', 'JHS 3') LIMIT 1),
  (SELECT id FROM classes WHERE name IN ('Basic 9', 'JHS 3') LIMIT 1),
  TRUE -- Mark as graduation year
WHERE EXISTS (SELECT 1 FROM classes WHERE name IN ('Basic 9', 'JHS 3'));

-- Verify the progression was created
SELECT 
  c1.name as current_class,
  c2.name as next_class,
  cp.is_graduation
FROM class_progression cp
JOIN classes c1 ON c1.id = cp.current_class_id
JOIN classes c2 ON c2.id = cp.next_class_id
ORDER BY c1.level, c1.name;
