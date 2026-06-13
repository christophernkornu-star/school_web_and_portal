// Run this script to fix the execute_admin_promotion_decision function
// Removes the decided_by_teacher_id reference that causes 409 foreign key errors

require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function fix() {
  console.log('Dropping old function...');
  const { error: dropError } = await supabase.rpc('execute_admin_promotion_decision', {
    p_student_id: '00000000-0000-0000-0000-000000000000',
    p_academic_year: '2024',
    p_user_id: '00000000-0000-0000-0000-000000000000',
    p_status: 'repeated',
    p_remarks: ''
  }).maybeSingle();
  
  // Now create the fixed function via the REST API SQL endpoint
  const sql = `
DROP FUNCTION IF EXISTS execute_admin_promotion_decision(UUID, VARCHAR, UUID, VARCHAR, TEXT);

CREATE OR REPLACE FUNCTION execute_admin_promotion_decision(
  p_student_id UUID,
  p_academic_year VARCHAR(20),
  p_user_id UUID,
  p_status VARCHAR, 
  p_remarks TEXT
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_class_id UUID;
  v_current_class_id UUID;
BEGIN
  -- Get student's current class
  SELECT class_id INTO v_current_class_id FROM students WHERE id = p_student_id;
  
  -- Get next class from progression rule
  SELECT next_class_id INTO v_next_class_id 
  FROM class_progression 
  WHERE current_class_id = v_current_class_id;

  -- Upsert into student_promotions (NO decided_by_teacher_id - admins are not teachers)
  INSERT INTO student_promotions (
    student_id,
    academic_year,
    current_class_id,
    next_class_id,
    promotion_status,
    teacher_remarks,
    decision_date,
    updated_at
  ) VALUES (
    p_student_id,
    p_academic_year,
    v_current_class_id,
    v_next_class_id,
    p_status,
    p_remarks,
    NOW(),
    NOW()
  )
  ON CONFLICT (student_id, academic_year)
  DO UPDATE SET
    promotion_status = p_status,
    teacher_remarks = p_remarks,
    decision_date = NOW(),
    updated_at = NOW();

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
  `.trim();

  console.log('Executing SQL...');
  const response = await fetch(url + '/rest/v1/rpc/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({})
  });

  // Try to use the pg_dump alternative - execute via sql endpoint
  const sqlResponse = await fetch(url + '/sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': 'Bearer ' + key
    },
    body: JSON.stringify({ query: sql })
  });

  if (sqlResponse.ok) {
    const result = await sqlResponse.text();
    console.log('✅ Function updated successfully!', result);
  } else {
    const err = await sqlResponse.text();
    console.error('❌ Failed to update function:', err);
    console.log('\nPlease run the following SQL manually in your Supabase SQL Editor:\n');
    console.log(sql);
  }
}

fix().catch(console.error);
