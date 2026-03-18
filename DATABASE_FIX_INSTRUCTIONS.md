# Database Schema Fix for Report Cards

The report card system is failing because of missing database tables and columns. Specifically:
1. The `student_remarks` table is missing (causing 404 errors).
2. The `attendance` table is missing the `academic_term_id` column (causing 400 errors).

Since I cannot directly execute SQL commands on your database without a helper function, you need to run the following SQL script manually.

## Instructions

1.  Open your Supabase Project Dashboard.
2.  Go to the **SQL Editor** section.
3.  Click **New Query**.
4.  Copy and paste the entire content of the file `database/add_student_remarks_and_attendance_column.sql`.
5.  Click **Run**.

### SQL Content to Run:

```sql
-- Create student_remarks table
CREATE TABLE IF NOT EXISTS public.student_remarks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    term_id UUID NOT NULL REFERENCES public.academic_terms(id) ON DELETE CASCADE,
    attitude TEXT,
    interest TEXT,
    conduct TEXT,
    class_teacher_remark TEXT,
    head_teacher_remark TEXT,
    UNIQUE(student_id, term_id)
);

-- Enable RLS
ALTER TABLE public.student_remarks ENABLE ROW LEVEL SECURITY;

-- Policies for student_remarks
CREATE POLICY "Enable read access for authenticated users" ON public.student_remarks
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Enable insert access for teachers and admins" ON public.student_remarks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'admin', 'super_admin')
        )
    );

CREATE POLICY "Enable update access for teachers and admins" ON public.student_remarks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('teacher', 'admin', 'super_admin')
        )
    );

-- Add academic_term_id to attendance if missing
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS academic_term_id UUID REFERENCES public.academic_terms(id);

-- Backfill academic_term_id based on dates
UPDATE attendance a
SET academic_term_id = t.id
FROM academic_terms t
WHERE a.attendance_date BETWEEN t.start_date AND t.end_date
AND a.academic_term_id IS NULL;
```

## Verification

After running the SQL, the report card generation should work without errors.
You can check specifically:
- `student_remarks` table should exist.
- `attendance` table should have `academic_term_id` column.
