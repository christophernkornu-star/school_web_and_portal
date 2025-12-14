-- Create fee_types table
CREATE TABLE IF NOT EXISTS fee_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create fee_structures table (assigns fees to classes/terms)
CREATE TABLE IF NOT EXISTS fee_structures (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  fee_type_id UUID REFERENCES fee_types(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create fee_payments table
CREATE TABLE IF NOT EXISTS fee_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES fee_structures(id) ON DELETE CASCADE,
  amount_paid DECIMAL(10, 2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  recorded_by UUID REFERENCES profiles(id),
  payment_method TEXT,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE fee_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_payments ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view fee types and structures
CREATE POLICY "Everyone can view fee types" ON fee_types FOR SELECT USING (true);
CREATE POLICY "Everyone can view fee structures" ON fee_structures FOR SELECT USING (true);

-- Teachers and Admins can view payments
CREATE POLICY "Staff can view payments" ON fee_payments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin', 'head_teacher')
  )
);

-- Teachers and Admins can insert payments
CREATE POLICY "Staff can insert payments" ON fee_payments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('teacher', 'admin', 'head_teacher')
  )
);

-- Insert some default fee types
INSERT INTO fee_types (name, description) VALUES 
('Exam Fees', 'Fees for end of term examinations'),
('PTA Dues', 'Parent Teacher Association dues'),
('Tuition Fees', 'Termly tuition fees'),
('Sports Fees', 'Fees for sports and extracurricular activities')
ON CONFLICT DO NOTHING;
