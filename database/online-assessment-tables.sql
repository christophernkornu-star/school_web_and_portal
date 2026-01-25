-- Create Online Quizzes Table
CREATE TABLE IF NOT EXISTS online_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
    term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
    category TEXT CHECK (category IN ('Exam', 'Assignment', 'Test', 'Other')) DEFAULT 'Assignment',
    status TEXT CHECK (status IN ('draft', 'published', 'closed')) DEFAULT 'draft',
    total_points INTEGER DEFAULT 0,
    duration_minutes INTEGER, -- NULL means no time limit
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Quiz Questions Table
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES online_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')) DEFAULT 'multiple_choice',
    points INTEGER DEFAULT 1,
    position INTEGER DEFAULT 0, -- To order questions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Quiz Options Table (for MC and TF)
CREATE TABLE IF NOT EXISTS quiz_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Student Quiz Attempts Table
CREATE TABLE IF NOT EXISTS student_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID REFERENCES online_quizzes(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    score NUMERIC DEFAULT 0,
    status TEXT CHECK (status IN ('in_progress', 'submitted', 'graded')) DEFAULT 'in_progress',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Student Quiz Answers Table (Detailed responses)
CREATE TABLE IF NOT EXISTS student_quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES student_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_option_id UUID REFERENCES quiz_options(id) ON DELETE SET NULL, -- For MC/TF
    text_answer TEXT, -- For short answer
    is_correct BOOLEAN DEFAULT false,
    points_awarded NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE online_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_quiz_answers ENABLE ROW LEVEL SECURITY;

-- Policies for online_quizzes

-- Teachers can view/insert/update/delete their own quizzes
DROP POLICY IF EXISTS "Teachers can manage their own quizzes" ON online_quizzes;
CREATE POLICY "Teachers can manage their own quizzes" ON online_quizzes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM teachers 
            WHERE teachers.id = online_quizzes.teacher_id 
            AND teachers.profile_id = auth.uid()
        )
    );

-- Students can view published quizzes for their class
DROP POLICY IF EXISTS "Students can view published quizzes for their class" ON online_quizzes;
CREATE POLICY "Students can view published quizzes for their class" ON online_quizzes
    FOR SELECT
    USING (
        status IN ('published', 'closed') AND
        class_id IN (
            SELECT class_id FROM students 
            WHERE students.profile_id = auth.uid()
        )
    );

-- Policies for quiz_questions and options (Viewable if quiz is viewable)

DROP POLICY IF EXISTS "Teachers can manage questions for their quizzes" ON quiz_questions;
CREATE POLICY "Teachers can manage questions for their quizzes" ON quiz_questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM online_quizzes
            WHERE online_quizzes.id = quiz_questions.quiz_id
            AND online_quizzes.teacher_id IN (
                SELECT id FROM teachers WHERE profile_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Students can view questions for active attempts" ON quiz_questions;
CREATE POLICY "Students can view questions for active attempts" ON quiz_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM online_quizzes q
            WHERE q.id = quiz_questions.quiz_id
            AND q.status = 'published'
            AND q.class_id IN (
                SELECT class_id FROM students 
                WHERE students.profile_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Teachers can manage options" ON quiz_options;
CREATE POLICY "Teachers can manage options" ON quiz_options
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM quiz_questions q
            JOIN online_quizzes oz ON q.quiz_id = oz.id
            WHERE q.id = quiz_options.question_id
            AND oz.teacher_id IN (
                SELECT id FROM teachers WHERE profile_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Students can view options" ON quiz_options;
CREATE POLICY "Students can view options" ON quiz_options
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM quiz_questions q
            JOIN online_quizzes oz ON q.quiz_id = oz.id
            WHERE q.id = quiz_options.question_id
            AND oz.status = 'published'
            AND oz.class_id IN (
                SELECT class_id FROM students 
                WHERE students.profile_id = auth.uid()
            )
        )
    );


-- Policies for attempts

-- Students can insert/view their own attempts
DROP POLICY IF EXISTS "Students can manage their own attempts" ON student_quiz_attempts;
CREATE POLICY "Students can manage their own attempts" ON student_quiz_attempts
    FOR ALL
    USING (
        student_id IN (
            SELECT id FROM students WHERE profile_id = auth.uid()
        )
    );

-- Teachers can view attempts for their quizzes
DROP POLICY IF EXISTS "Teachers can view attempts on their quizzes" ON student_quiz_attempts;
CREATE POLICY "Teachers can view attempts on their quizzes" ON student_quiz_attempts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM online_quizzes
            WHERE online_quizzes.id = student_quiz_attempts.quiz_id
            AND online_quizzes.teacher_id IN (
                SELECT id FROM teachers WHERE profile_id = auth.uid()
            )
        )
    );

-- Policies for answers

-- Students can insert/view their own answers
DROP POLICY IF EXISTS "Students can manage their own answers" ON student_quiz_answers;
CREATE POLICY "Students can manage their own answers" ON student_quiz_answers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM student_quiz_attempts
            WHERE student_quiz_attempts.id = student_quiz_answers.attempt_id
            AND student_quiz_attempts.student_id IN (
                SELECT id FROM students WHERE profile_id = auth.uid()
            )
        )
    );

-- Teachers can view answers for attempts on their quizzes
DROP POLICY IF EXISTS "Teachers can view answers on their quizzes" ON student_quiz_answers;
CREATE POLICY "Teachers can view answers on their quizzes" ON student_quiz_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM student_quiz_attempts qa
            JOIN online_quizzes q ON qa.quiz_id = q.id
            WHERE qa.id = student_quiz_answers.attempt_id
            AND q.teacher_id IN (
                SELECT id FROM teachers WHERE profile_id = auth.uid()
            )
        )
    );
