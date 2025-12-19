-- Student Promotion System
-- Handles end-of-year class promotions, repeaters, and performance-based recommendations

-- Table to track student promotion decisions
CREATE TABLE IF NOT EXISTS student_promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL, -- e.g., "2024/2025"
  current_class_id UUID NOT NULL REFERENCES classes(id),
  
  -- Promotion decision
  promotion_status VARCHAR(20) NOT NULL CHECK (promotion_status IN ('pending', 'promoted', 'repeated', 'graduated')),
  next_class_id UUID REFERENCES classes(id), -- NULL if repeated or graduated
  
  -- Performance metrics
  total_subjects INTEGER NOT NULL DEFAULT 0,
  total_score DECIMAL(10,2) DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  minimum_required_average DECIMAL(5,2) DEFAULT 30.0, -- Minimum 30% average across 3 terms
  meets_auto_promotion_criteria BOOLEAN DEFAULT FALSE, -- TRUE if average >= 30
  
  -- Decision tracking (only for students below 30 average)
  requires_teacher_decision BOOLEAN DEFAULT FALSE, -- TRUE if average < 30
  decided_by_teacher_id UUID REFERENCES teachers(id),
  decision_date TIMESTAMP WITH TIME ZONE,
  teacher_remarks TEXT,
  
  -- Academic year transition (triggered by admin setting new year)
  auto_promoted BOOLEAN DEFAULT FALSE, -- TRUE if promoted automatically (average >= 30)
  transition_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_student_year UNIQUE (student_id, academic_year)
);

-- Alter existing table to add new columns if they don't exist
DO $$ 
BEGIN
  -- Add minimum_required_average column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'minimum_required_average'
  ) THEN
    ALTER TABLE student_promotions ADD COLUMN minimum_required_average DECIMAL(5,2) DEFAULT 30.0;
  END IF;

  -- Add meets_auto_promotion_criteria column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'meets_auto_promotion_criteria'
  ) THEN
    ALTER TABLE student_promotions ADD COLUMN meets_auto_promotion_criteria BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add requires_teacher_decision column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'requires_teacher_decision'
  ) THEN
    ALTER TABLE student_promotions ADD COLUMN requires_teacher_decision BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add auto_promoted column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'auto_promoted'
  ) THEN
    ALTER TABLE student_promotions ADD COLUMN auto_promoted BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add transition_executed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'transition_executed_at'
  ) THEN
    ALTER TABLE student_promotions ADD COLUMN transition_executed_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Drop old columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'minimum_required_score'
  ) THEN
    ALTER TABLE student_promotions DROP COLUMN IF EXISTS minimum_required_score;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'meets_promotion_criteria'
  ) THEN
    ALTER TABLE student_promotions DROP COLUMN IF EXISTS meets_promotion_criteria;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'recommended_action'
  ) THEN
    ALTER TABLE student_promotions DROP COLUMN IF EXISTS recommended_action;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'executed_by_admin_id'
  ) THEN
    ALTER TABLE student_promotions DROP COLUMN IF EXISTS executed_by_admin_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'student_promotions' AND column_name = 'execution_date'
  ) THEN
    ALTER TABLE student_promotions DROP COLUMN IF EXISTS execution_date;
  END IF;
END $$;

-- Table to track class progression mapping (which class comes after which)
CREATE TABLE IF NOT EXISTS class_progression (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  current_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  next_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  is_graduation BOOLEAN DEFAULT FALSE, -- TRUE if current_class is final year
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_progression UNIQUE (current_class_id, next_class_id)
);

-- Table to track promotion history
CREATE TABLE IF NOT EXISTS promotion_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year VARCHAR(20) NOT NULL,
  from_class_id UUID NOT NULL REFERENCES classes(id),
  to_class_id UUID REFERENCES classes(id), -- NULL if repeated
  action VARCHAR(20) NOT NULL CHECK (action IN ('promoted', 'repeated', 'graduated')),
  performed_by UUID NOT NULL REFERENCES profiles(id),
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  remarks TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_student_promotions_student ON student_promotions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_promotions_year ON student_promotions(academic_year);
CREATE INDEX IF NOT EXISTS idx_student_promotions_status ON student_promotions(promotion_status);
CREATE INDEX IF NOT EXISTS idx_student_promotions_current_class ON student_promotions(current_class_id);
CREATE INDEX IF NOT EXISTS idx_class_progression_current ON class_progression(current_class_id);
CREATE INDEX IF NOT EXISTS idx_promotion_history_student ON promotion_history(student_id);

-- Enable RLS
ALTER TABLE student_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS class_teachers_view_promotions ON student_promotions;
DROP POLICY IF EXISTS teachers_view_own_class_promotions ON student_promotions;
DROP POLICY IF EXISTS class_teachers_manage_promotions ON student_promotions;
DROP POLICY IF EXISTS admins_view_promotions ON student_promotions;
DROP POLICY IF EXISTS admins_manage_all_promotions ON student_promotions;

-- RLS Policies for student_promotions
-- Only class teachers can view and manage promotions for their classes
CREATE POLICY class_teachers_view_promotions ON student_promotions
  FOR SELECT
  USING (
    current_class_id IN (
      SELECT tca.class_id
      FROM teacher_class_assignments tca
      JOIN teachers t ON t.id = tca.teacher_id
      WHERE t.profile_id = auth.uid() AND tca.is_class_teacher = TRUE
    )
  );

CREATE POLICY class_teachers_manage_promotions ON student_promotions
  FOR ALL
  USING (
    current_class_id IN (
      SELECT tca.class_id
      FROM teacher_class_assignments tca
      JOIN teachers t ON t.id = tca.teacher_id
      WHERE t.profile_id = auth.uid() AND tca.is_class_teacher = TRUE
    )
  );

-- Admins can only view promotion data, not modify individual decisions
CREATE POLICY admins_view_promotions ON student_promotions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Drop existing policies if they exist for class_progression
DROP POLICY IF EXISTS everyone_view_progression ON class_progression;
DROP POLICY IF EXISTS admins_manage_progression ON class_progression;

-- RLS Policies for class_progression
CREATE POLICY everyone_view_progression ON class_progression
  FOR SELECT
  USING (TRUE);

CREATE POLICY admins_manage_progression ON class_progression
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Drop existing policies if they exist for promotion_history
DROP POLICY IF EXISTS students_view_own_history ON promotion_history;
DROP POLICY IF EXISTS teachers_view_history ON promotion_history;
DROP POLICY IF EXISTS admins_manage_history ON promotion_history;

-- RLS Policies for promotion_history
CREATE POLICY students_view_own_history ON promotion_history
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY teachers_view_history ON promotion_history
  FOR SELECT
  USING (TRUE);

CREATE POLICY admins_manage_history ON promotion_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Drop existing functions to ensure clean replacement
DROP FUNCTION IF EXISTS calculate_student_promotion_metrics(UUID, VARCHAR);
DROP FUNCTION IF EXISTS calculate_student_promotion_metrics(UUID, TEXT);
DROP FUNCTION IF EXISTS generate_promotion_recommendations(UUID, VARCHAR, UUID);
DROP FUNCTION IF EXISTS execute_academic_year_transition(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS execute_teacher_promotion_decision(UUID, VARCHAR, UUID, BOOLEAN, TEXT);

-- Function to calculate student performance for promotion (based on 30% average)
CREATE OR REPLACE FUNCTION calculate_student_promotion_metrics(
  p_student_id UUID,
  p_academic_year VARCHAR(20)
)
RETURNS TABLE (
  total_subjects INTEGER,
  total_score DECIMAL,
  average_score DECIMAL,
  minimum_required DECIMAL,
  meets_criteria BOOLEAN,
  recommendation VARCHAR
) AS $$
DECLARE
  v_total_subjects INTEGER;
  v_total_score DECIMAL;
  v_average_score DECIMAL;
  v_min_required DECIMAL := 30.0; -- Fixed at 30%
  v_meets_criteria BOOLEAN;
  v_recommendation VARCHAR;
BEGIN
  -- Calculate average score across all subjects for all scores in database
  -- We'll use all scores for the student regardless of term filtering for now
  WITH student_scores AS (
    SELECT 
      COUNT(DISTINCT subject_id) as subject_count,
      AVG(total) as avg_score -- Average of all scores
    FROM scores
    WHERE student_id = p_student_id
  )
  SELECT 
    COALESCE(subject_count, 0),
    COALESCE(subject_count, 0) * COALESCE(avg_score, 0), -- Total for display
    COALESCE(avg_score, 0),
    v_min_required
  INTO v_total_subjects, v_total_score, v_average_score, v_min_required
  FROM student_scores;
  
  -- Determine if criteria is met (average >= 30)
  v_meets_criteria := v_average_score >= v_min_required AND v_total_subjects > 0;
  
  -- Make recommendation
  IF v_meets_criteria THEN
    v_recommendation := 'auto_promote'; -- Automatic promotion
  ELSE
    v_recommendation := 'teacher_decision'; -- Requires teacher decision
  END IF;
  
  RETURN QUERY SELECT 
    v_total_subjects,
    v_total_score,
    v_average_score,
    v_min_required,
    v_meets_criteria,
    v_recommendation;
END;
$$ LANGUAGE plpgsql;

-- Function to generate promotion recommendations for class teachers
-- Shows only students below 30% average that require teacher decision
CREATE OR REPLACE FUNCTION generate_promotion_recommendations(
  p_class_id UUID,
  p_academic_year VARCHAR(20),
  p_teacher_id UUID
)
RETURNS TABLE (
  student_id UUID,
  student_name TEXT,
  total_subjects INTEGER,
  total_score DECIMAL,
  average_score DECIMAL,
  minimum_required DECIMAL,
  meets_criteria BOOLEAN,
  recommendation VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    (s.first_name || ' ' || s.last_name)::TEXT,
    metrics.total_subjects,
    metrics.total_score,
    metrics.average_score,
    metrics.minimum_required,
    metrics.meets_criteria,
    metrics.recommendation
  FROM students s
  CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_academic_year) AS metrics
  WHERE s.class_id = p_class_id
    AND s.status = 'active'
    AND metrics.recommendation = 'teacher_decision' -- Only show students below 30%
  ORDER BY metrics.average_score DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to execute academic year transition (triggered by admin)
-- Automatically promotes students with 30+ average
-- Creates promotion records for below-30 students requiring teacher decisions
CREATE OR REPLACE FUNCTION execute_academic_year_transition(
  p_old_academic_year VARCHAR(20),
  p_new_academic_year VARCHAR(20)
)
RETURNS TABLE (
  auto_promoted_count INTEGER,
  teacher_decision_required_count INTEGER,
  errors TEXT[]
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auto_promoted INTEGER := 0;
  v_teacher_decision INTEGER := 0;
  v_errors TEXT[] := ARRAY[]::TEXT[];
  v_next_class_id UUID;
  v_is_graduation BOOLEAN;
  rec RECORD;
BEGIN
  -- Process all active students
  FOR rec IN 
    SELECT 
      s.id as student_id,
      s.first_name,
      s.last_name,
      s.class_id,
      cp.next_class_id,
      cp.is_graduation,
      metrics.average_score,
      metrics.total_subjects,
      metrics.total_score,
      metrics.meets_criteria
    FROM students s
    LEFT JOIN class_progression cp ON cp.current_class_id = s.class_id
    CROSS JOIN LATERAL calculate_student_promotion_metrics(s.id, p_old_academic_year::VARCHAR) AS metrics
    WHERE s.status = 'active'
  LOOP
    BEGIN
      -- Check if student meets auto-promotion criteria (average >= 30)
      IF rec.meets_criteria THEN
        -- Create promotion record
        INSERT INTO student_promotions (
          student_id, 
          academic_year, 
          current_class_id, 
          promotion_status,
          next_class_id,
          total_subjects,
          total_score,
          average_score,
          minimum_required_average,
          meets_auto_promotion_criteria,
          requires_teacher_decision,
          auto_promoted,
          transition_executed_at
        ) VALUES (
          rec.student_id,
          p_old_academic_year,
          rec.class_id,
          CASE 
            WHEN rec.is_graduation THEN 'graduated'
            ELSE 'promoted'
          END,
          rec.next_class_id,
          rec.total_subjects,
          rec.total_score,
          rec.average_score,
          30.0,
          TRUE,
          FALSE,
          TRUE,
          NOW()
        );
        
        -- Execute promotion immediately
        IF rec.is_graduation THEN
          UPDATE students SET status = 'graduated' WHERE id = rec.student_id;
          
          INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id, 
            action, performed_by, remarks
          ) VALUES (
            rec.student_id, p_old_academic_year, rec.class_id, NULL,
            'graduated', auth.uid(), 'Auto-graduated: Average >= 30%'
          );
        ELSIF rec.next_class_id IS NOT NULL THEN
          UPDATE students SET class_id = rec.next_class_id WHERE id = rec.student_id;
          
          INSERT INTO promotion_history (
            student_id, academic_year, from_class_id, to_class_id,
            action, performed_by, remarks
          ) VALUES (
            rec.student_id, p_old_academic_year, rec.class_id, rec.next_class_id,
            'promoted', auth.uid(), 'Auto-promoted: Average >= 30%'
          );
        END IF;
        
        v_auto_promoted := v_auto_promoted + 1;
        
      ELSE
        -- Student requires teacher decision (average < 30)
        INSERT INTO student_promotions (
          student_id,
          academic_year,
          current_class_id,
          promotion_status,
          next_class_id,
          total_subjects,
          total_score,
          average_score,
          minimum_required_average,
          meets_auto_promotion_criteria,
          requires_teacher_decision,
          auto_promoted
        ) VALUES (
          rec.student_id,
          p_old_academic_year,
          rec.class_id,
          'pending',
          rec.next_class_id,
          rec.total_subjects,
          rec.total_score,
          rec.average_score,
          30.0,
          FALSE,
          TRUE,
          FALSE
        );
        
        v_teacher_decision := v_teacher_decision + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, 'Error processing ' || rec.first_name || ' ' || rec.last_name || ': ' || SQLERRM);
    END;
  END LOOP;
  
  RETURN QUERY SELECT v_auto_promoted, v_teacher_decision, v_errors;
END;
$$ LANGUAGE plpgsql;

-- Function to execute teacher promotion decision for below-30 students
CREATE OR REPLACE FUNCTION execute_teacher_promotion_decision(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_teacher_id UUID,
  p_promote BOOLEAN,
  p_remarks TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_promotion_record RECORD;
  v_next_class_id UUID;
  v_is_graduation BOOLEAN;
BEGIN
  -- Get the promotion record
  SELECT sp.*, cp.next_class_id, cp.is_graduation
  INTO v_promotion_record
  FROM student_promotions sp
  LEFT JOIN class_progression cp ON cp.current_class_id = sp.current_class_id
  WHERE sp.student_id = p_student_id 
    AND sp.academic_year = p_academic_year
    AND sp.requires_teacher_decision = TRUE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Promotion record not found or does not require teacher decision';
  END IF;
  
  -- Update the promotion record
  UPDATE student_promotions
  SET 
    decided_by_teacher_id = p_teacher_id,
    decision_date = NOW(),
    teacher_remarks = p_remarks,
    promotion_status = CASE 
      WHEN p_promote AND v_promotion_record.is_graduation THEN 'graduated'
      WHEN p_promote THEN 'promoted'
      ELSE 'repeated'
    END,
    transition_executed_at = NOW()
  WHERE student_id = p_student_id AND academic_year = p_academic_year;
  
  -- Execute the decision
  IF p_promote THEN
    IF v_promotion_record.is_graduation THEN
      UPDATE students SET status = 'graduated' WHERE id = p_student_id;
      
      INSERT INTO promotion_history (
        student_id, academic_year, from_class_id, to_class_id,
        action, performed_by, remarks
      ) VALUES (
        p_student_id, p_academic_year, v_promotion_record.current_class_id, NULL,
        'graduated', (SELECT profile_id FROM teachers WHERE id = p_teacher_id), 
        'Teacher decision: ' || p_remarks
      );
    ELSIF v_promotion_record.next_class_id IS NOT NULL THEN
      UPDATE students SET class_id = v_promotion_record.next_class_id WHERE id = p_student_id;
      
      INSERT INTO promotion_history (
        student_id, academic_year, from_class_id, to_class_id,
        action, performed_by, remarks
      ) VALUES (
        p_student_id, p_academic_year, v_promotion_record.current_class_id, v_promotion_record.next_class_id,
        'promoted', (SELECT profile_id FROM teachers WHERE id = p_teacher_id),
        'Teacher decision: ' || p_remarks
      );
    END IF;
  ELSE
    -- Student repeats same class
    INSERT INTO promotion_history (
      student_id, academic_year, from_class_id, to_class_id,
      action, performed_by, remarks
    ) VALUES (
      p_student_id, p_academic_year, v_promotion_record.current_class_id, v_promotion_record.current_class_id,
      'repeated', (SELECT profile_id FROM teachers WHERE id = p_teacher_id),
      'Teacher decision: ' || p_remarks
    );
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_promotions_updated_at ON student_promotions;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promotions_updated_at
  BEFORE UPDATE ON student_promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- Comments
COMMENT ON TABLE student_promotions IS 'Tracks student promotion decisions. Students with 30+ average are auto-promoted; below 30 require class teacher decision';
COMMENT ON TABLE class_progression IS 'Defines which class comes after which (e.g., Basic 3 -> Basic 4)';
COMMENT ON TABLE promotion_history IS 'Audit trail of all promotion actions';
COMMENT ON COLUMN student_promotions.minimum_required_average IS 'Minimum average score for automatic promotion: 30%';
COMMENT ON COLUMN student_promotions.auto_promoted IS 'TRUE if student was automatically promoted (average >= 30%)';
COMMENT ON COLUMN student_promotions.requires_teacher_decision IS 'TRUE if student average < 30% and requires class teacher decision';
COMMENT ON FUNCTION calculate_student_promotion_metrics IS 'Calculates average performance across 3 terms and determines if student meets 30% threshold';
COMMENT ON FUNCTION generate_promotion_recommendations IS 'Returns only students below 30% average that require class teacher decision';
COMMENT ON FUNCTION execute_academic_year_transition IS 'Triggered by admin setting new academic year. Auto-promotes 30+ students, creates pending records for below-30';
COMMENT ON FUNCTION execute_teacher_promotion_decision IS 'Allows class teacher to promote or repeat students below 30% average';
