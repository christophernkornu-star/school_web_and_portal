-- ============================================================================
-- SCHOOL SECTIONS (Houses) – Database Schema
-- Biriwa Methodist 'C' Basic School Management System
-- ============================================================================
-- Adds colour-coded student sections/houses with automatic balanced assignment.
-- Every student across every class is assigned to one section, ensuring equal
-- or near-equal distribution per class, per gender.
-- ============================================================================

-- ============================================================================
-- 1. SECTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT UNIQUE NOT NULL,                    -- e.g. "Red House"
  colour      TEXT NOT NULL,                           -- hex colour e.g. '#EF4444'
  emblem_url  TEXT,                                    -- optional emblem/image URL
  description TEXT,
  is_active   BOOLEAN DEFAULT true,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. STUDENT SECTION ASSIGNMENTS (one per student)
-- ============================================================================
CREATE TABLE IF NOT EXISTS student_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id  UUID UNIQUE NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TEACHER SECTION ASSIGNMENTS (patrons / assistants)
-- ============================================================================
CREATE TABLE IF NOT EXISTS teacher_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id  UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  section_id  UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  role        TEXT DEFAULT 'patron' CHECK (role IN ('patron', 'assistant', 'member')),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_student_sections_section ON student_sections(section_id);
CREATE INDEX IF NOT EXISTS idx_student_sections_student ON student_sections(student_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sections_section ON teacher_sections(section_id);
CREATE INDEX IF NOT EXISTS idx_sections_active ON sections(is_active);

-- ============================================================================
-- BALANCED ASSIGNMENT FUNCTION
-- ============================================================================
-- Assigns a student to the section with the fewest same-gender students
-- in their class. Ties broken by total same-gender across all classes,
-- then by total students overall.
-- ============================================================================
CREATE OR REPLACE FUNCTION assign_student_to_section(
  p_student_id UUID,
  p_class_id   UUID DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_section_id    UUID;
  v_gender        TEXT;
  v_active_sections UUID[];
BEGIN
  -- Get the student's gender
  SELECT gender INTO v_gender FROM students WHERE id = p_student_id;

  -- Get all active section IDs ordered
  v_active_sections := ARRAY(
    SELECT id FROM sections WHERE is_active = true ORDER BY sort_order, name
  );

  IF array_length(v_active_sections, 1) IS NULL THEN
    RAISE EXCEPTION 'No active sections found';
  END IF;

  -- Find the section with the fewest students of the same gender in the same class
  WITH section_load AS (
    SELECT
      sec_id AS sid,
      COUNT(DISTINCT s.id) FILTER (
        WHERE s.gender = v_gender AND s.class_id = COALESCE(p_class_id, s.class_id)
      ) AS same_class_same_gender,
      COUNT(DISTINCT s.id) FILTER (WHERE s.gender = v_gender) AS total_same_gender,
      COUNT(DISTINCT s.id) AS total_students
    FROM unnest(v_active_sections) sec_id
    LEFT JOIN student_sections ss ON ss.section_id = sec_id
    LEFT JOIN students s ON s.id = ss.student_id
    GROUP BY sec_id
  )
  SELECT sid INTO v_section_id
  FROM section_load
  ORDER BY
    same_class_same_gender ASC,
    total_same_gender ASC,
    total_students ASC
  LIMIT 1;

  -- Assign the student (upsert)
  INSERT INTO student_sections (student_id, section_id)
  VALUES (p_student_id, v_section_id)
  ON CONFLICT (student_id)
  DO UPDATE SET
    section_id = v_section_id,
    assigned_at = NOW(),
    assigned_by = NULL; -- Reset on reassignment

  RETURN v_section_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- RE-BALANCE ALL STUDENTS IN A CLASS
-- ============================================================================
-- Useful when a new section is added or an admin wants to re-allocate fairly
-- ============================================================================
CREATE OR REPLACE FUNCTION rebalance_class_sections(p_class_id UUID)
RETURNS TABLE(student_name TEXT, section_name TEXT) AS $$
DECLARE
  rec RECORD;
BEGIN
  -- Clear existing assignments for this class
  DELETE FROM student_sections
  WHERE student_id IN (SELECT id FROM students WHERE class_id = p_class_id);

  -- Reassign each student (ordering by gender for better distribution)
  FOR rec IN (
    SELECT id, class_id FROM students
    WHERE class_id = p_class_id AND status = 'active'
    ORDER BY gender, first_name
  ) LOOP
    PERFORM assign_student_to_section(rec.id, rec.class_id);
  END LOOP;

  -- Return results
  RETURN QUERY
  SELECT
    s.first_name || ' ' || s.last_name AS student_name,
    sec.name AS section_name
  FROM students s
  JOIN student_sections ss ON ss.student_id = s.id
  JOIN sections sec ON sec.id = ss.section_id
  WHERE s.class_id = p_class_id
  ORDER BY sec.name, s.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUTO-ASSIGN TRIGGER
-- ============================================================================
-- When a new student is inserted, automatically assign them to a section
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_assign_section()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM assign_student_to_section(NEW.id, NEW.class_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_assign_section ON students;
CREATE TRIGGER trg_auto_assign_section
AFTER INSERT ON students
FOR EACH ROW
EXECUTE FUNCTION auto_assign_section();

-- ============================================================================
-- VIEW: Students with section info (for easy querying)
-- ============================================================================
CREATE OR REPLACE VIEW student_with_section AS
SELECT
  s.*,
  sec.id   AS section_id,
  sec.name AS section_name,
  sec.colour AS section_colour,
  sec.emblem_url AS section_emblem
FROM students s
LEFT JOIN student_sections ss ON ss.student_id = s.id
LEFT JOIN sections sec ON sec.id = ss.section_id;

-- ============================================================================
-- SEED DATA: 4 default sections
-- ============================================================================
INSERT INTO sections (name, colour, description, sort_order) VALUES
  ('Red House',   '#EF4444', 'Courage and Leadership',   1),
  ('Blue House',  '#3B82F6', 'Wisdom and Integrity',     2),
  ('Green House', '#22C55E', 'Growth and Excellence',    3),
  ('Gold House',  '#EAB308', 'Honour and Achievement',   4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_sections ENABLE ROW LEVEL SECURITY;

-- Sections: all authenticated can view
DROP POLICY IF EXISTS "view_sections" ON sections;
CREATE POLICY "view_sections" ON sections
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin_insert_sections" ON sections;
CREATE POLICY "admin_insert_sections" ON sections
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_update_sections" ON sections;
CREATE POLICY "admin_update_sections" ON sections
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "admin_delete_sections" ON sections;
CREATE POLICY "admin_delete_sections" ON sections
  FOR DELETE USING (is_admin());

-- Student sections: staff can view
DROP POLICY IF EXISTS "view_student_sections" ON student_sections;
CREATE POLICY "view_student_sections" ON student_sections
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "admin_manage_student_sections" ON student_sections;
CREATE POLICY "admin_manage_student_sections" ON student_sections
  FOR ALL USING (is_admin());

-- Teacher sections: staff can view
DROP POLICY IF EXISTS "view_teacher_sections" ON teacher_sections;
CREATE POLICY "view_teacher_sections" ON teacher_sections
  FOR SELECT USING (is_staff());

DROP POLICY IF EXISTS "admin_manage_teacher_sections" ON teacher_sections;
CREATE POLICY "admin_manage_teacher_sections" ON teacher_sections
  FOR ALL USING (is_admin());

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to check the distribution balance:
-- SELECT
--   sec.name AS section,
--   sec.colour,
--   COUNT(DISTINCT ss.student_id) AS total_students,
--   COUNT(DISTINCT s.id) FILTER (WHERE s.gender = 'Male') AS male,
--   COUNT(DISTINCT s.id) FILTER (WHERE s.gender = 'Female') AS female
-- FROM sections sec
-- LEFT JOIN student_sections ss ON ss.section_id = sec.id
-- LEFT JOIN students s ON s.id = ss.student_id AND s.status = 'active'
-- GROUP BY sec.id, sec.name, sec.colour
-- ORDER BY sec.sort_order;
