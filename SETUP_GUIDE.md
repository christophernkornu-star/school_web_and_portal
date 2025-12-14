# Biriwa Methodist 'C' Basic School Management System
## Complete Setup Guide

## 📋 Overview
This is a comprehensive School Management System built specifically for Biriwa Methodist 'C' Basic School in Ghana. The system includes:

- **Student Portal**: View results, attendance, and academic records
- **Teacher Portal**: Enter scores, manage classes, track student performance
- **Administrative Portal**: Manage school resources, teachers, students, and system-wide operations
- **Public Website**: School information, events, photo gallery, and admissions

## 🛠 Technology Stack

- **Frontend**: Next.js 14 with TypeScript and React
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Styling**: Tailwind CSS with Ghana-themed colors
- **Icons**: Lucide React

## 📦 Installation Steps

### 1. Install Dependencies

```powershell
cd C:\Users\FORTUNE\Desktop\school_site_and_portal
npm install
```

### 2. Configure Supabase

#### A. Access Your Supabase Project
1. Go to https://supabase.com
2. Sign in to your account
3. Open your project: https://okfawhokrtkaibhbcjdk.supabase.co

#### B. Get Your API Keys
1. In Supabase dashboard, go to Settings → API
2. Copy your `anon` (public) key
3. Copy your `service_role` key (keep this secret!)

#### C. Update Environment Variables
Edit the `.env.local` file with your actual keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://okfawhokrtkaibhbcjdk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### 3. Set Up Database

#### A. Run the SQL Schema
1. In Supabase dashboard, go to SQL Editor
2. Open the file `database/schema.sql`
3. Copy all the SQL code
4. Paste it into the SQL Editor
5. Click "Run" to execute

This will create:
- All necessary tables (students, teachers, classes, subjects, assessments, etc.)
- Row Level Security (RLS) policies
- Indexes for performance
- Sample data (subjects, classes, academic year, terms)

#### B. Enable Row Level Security
The schema already includes RLS policies. Verify they're enabled:
1. Go to Authentication → Policies
2. Ensure policies are active for all tables

### 4. Create Test Users

#### A. Create Admin User
1. In Supabase dashboard, go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Email: `admin@biriwamethodist.edu.gh`
4. Password: Create a secure password
5. After creating, note the User ID

Then run this SQL in SQL Editor:
```sql
-- Insert admin profile
INSERT INTO profiles (id, email, full_name, role) 
VALUES ('USER_ID_HERE', 'admin@biriwamethodist.edu.gh', 'School Administrator', 'admin');
```

#### B. Create Teacher User
1. Create user: `teacher@biriwamethodist.edu.gh`
2. Run SQL:
```sql
-- Insert teacher profile
INSERT INTO profiles (id, email, full_name, role, phone_number) 
VALUES ('USER_ID_HERE', 'teacher@biriwamethodist.edu.gh', 'John Mensah', 'teacher', '+233241234567');

-- Insert teacher record
INSERT INTO teachers (user_id, teacher_id, qualification, hire_date) 
VALUES ('USER_ID_HERE', 'TCH001', 'B.Ed. Mathematics', '2020-09-01');

-- Assign teacher to a class
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year_id, term_id)
SELECT 
    t.id,
    (SELECT id FROM subjects WHERE subject_code = 'MATH'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM academic_years WHERE is_current = TRUE),
    (SELECT id FROM terms WHERE is_current = TRUE)
FROM teachers t WHERE t.teacher_id = 'TCH001';
```

#### C. Create Student User
1. Create user: `student@biriwamethodist.edu.gh`
2. Run SQL:
```sql
-- Insert student profile
INSERT INTO profiles (id, email, full_name, role, date_of_birth, gender) 
VALUES ('USER_ID_HERE', 'student@biriwamethodist.edu.gh', 'Kwame Asante', 'student', '2010-05-15', 'Male');

-- Insert student record
INSERT INTO students (user_id, student_id, admission_date, current_class_id, parent_name, parent_phone, hometown, region)
VALUES (
    'USER_ID_HERE', 
    'STD001', 
    '2018-09-01',
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    'Mr. Kofi Asante',
    '+233244567890',
    'Biriwa',
    'Central Region'
);

-- Enroll student
INSERT INTO student_enrollments (student_id, class_id, academic_year_id, enrollment_date)
VALUES (
    (SELECT id FROM students WHERE student_id = 'STD001'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM academic_years WHERE is_current = TRUE),
    CURRENT_DATE
);
```

### 5. Run the Development Server

```powershell
npm run dev
```

The application will start at http://localhost:3000

## 🎨 Ghana-Specific Features

The system includes Ghana-themed styling:
- **Ghana flag colors**: Red, Gold, Green borders and accents
- **Methodist colors**: Blue and Gold for school identity
- **Ghana's grading system**: A-F grades based on Ghana Education Service standards
- **Three-term system**: Aligned with Ghana's academic calendar
- **Ghana Basic School structure**: Primary 1-6 and JHS 1-3
- **Local subjects**: Ghanaian Languages, RME, etc.

## 🔐 User Roles & Access

### Student Portal
- View personal results and report cards
- Check attendance records
- View academic performance trends

- View school announcements

### Teacher Portal
- Enter student scores (class work, exams)
- View only assigned classes and subjects
- Mark attendance
- Generate performance reports
- Create assessments
- Monitor student progress over time

### Admin Portal
- Manage all students and teachers
- Assign teachers to classes
- Manage academic terms and years
- Oversee school resources
- Process admission applications
- Post announcements and events
- Generate system-wide reports

### Public Website
- School information and history
- Events calendar
- Photo gallery
- Admission application form
- Contact information

## 📊 Adding Sample Data

### Add More Students
```sql
INSERT INTO profiles (id, email, full_name, role, date_of_birth, gender)
VALUES 
    (uuid_generate_v4(), 'ama.boateng@student.com', 'Ama Boateng', 'student', '2011-03-20', 'Female'),
    (uuid_generate_v4(), 'yaw.owusu@student.com', 'Yaw Owusu', 'student', '2010-11-08', 'Male');

-- Then create corresponding student records with the generated UUIDs
```

### Add Sample Results
```sql
-- First create an assessment
INSERT INTO assessments (subject_id, class_id, teacher_id, term_id, assessment_type_id, assessment_name, max_score, assessment_date)
VALUES (
    (SELECT id FROM subjects WHERE subject_code = 'MATH'),
    (SELECT id FROM classes WHERE class_name = 'Primary 4'),
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001'),
    (SELECT id FROM terms WHERE is_current = TRUE),
    (SELECT id FROM assessment_types WHERE type_name = 'End of Term Exam'),
    'End of First Term Exam',
    100,
    CURRENT_DATE
);

-- Then add scores
INSERT INTO student_scores (assessment_id, student_id, score, entered_by)
VALUES (
    (SELECT id FROM assessments WHERE assessment_name = 'End of First Term Exam' LIMIT 1),
    (SELECT id FROM students WHERE student_id = 'STD001'),
    85.5,
    (SELECT id FROM teachers WHERE teacher_id = 'TCH001')
);
```

## 🚀 Production Deployment

### 1. Build for Production
```powershell
npm run build
```

### 2. Deploy Options

#### Option A: Vercel (Recommended for Next.js)
1. Push code to GitHub
2. Go to https://vercel.com
3. Import your GitHub repository
4. Add environment variables
5. Deploy

#### Option B: Other Platforms
- **Netlify**: Similar to Vercel
- **Railway**: Good for Node.js apps
- **AWS/Azure**: For enterprise hosting

### 3. Update Supabase Settings
1. In Supabase dashboard → Settings → API
2. Add your production domain to "Site URL"
3. Add domain to "Redirect URLs"

## 📱 Key Features by Portal

### Student Portal Features
✅ Dashboard with quick stats
✅ View term results by subject
✅ Download report cards
✅ Check attendance records
✅ Track performance trends

✅ Read announcements

### Teacher Portal Features
✅ View assigned classes and subjects
✅ Enter student scores with validation
✅ Mark student attendance
✅ Create assessments
✅ Generate class reports
✅ Track student progress
✅ View only authorized classes (RLS enforced)

### Admin Portal Features
✅ Dashboard with school statistics
✅ Manage students (add, edit, view)
✅ Manage teachers and assignments
✅ Manage classes and subjects
✅ Control academic years and terms
✅ Process admission applications
✅ Post announcements
✅ Manage school events
✅ Track resources

### Public Website Features
✅ School homepage with Ghana theme
✅ About us page
✅ Events calendar
✅ Photo gallery
✅ Online admission application
✅ Contact information

## 🔒 Security Features

1. **Row Level Security (RLS)**: Database-level access control
2. **Role-based Access**: Students, Teachers, Admins have different permissions
3. **Teacher Restrictions**: Teachers can only access their assigned classes
4. **Student Privacy**: Students can only see their own data
5. **Secure Authentication**: Supabase Auth with email/password

## 🎯 Next Steps

1. **Customize School Details**: Update school name, contact info, logo
2. **Add Real Data**: Input actual students, teachers, and classes
3. **Configure Storage**: Set up Supabase Storage for photos/documents
4. **Email Notifications**: Configure Supabase email templates
5. **Mobile App**: Consider React Native for mobile version
6. **Backup Strategy**: Set up automated database backups
7. **Training**: Train staff on using the system

## 📞 Support & Maintenance

### Common Issues

**"Cannot connect to database"**
- Check `.env.local` file has correct Supabase URL and keys
- Verify Supabase project is active

**"Authentication failed"**
- Ensure user exists in Supabase Auth
- Check that profile record exists in profiles table

**"Permission denied"**
- Verify RLS policies are correctly set
- Check user role matches the portal they're accessing

### Database Maintenance
- Regular backups via Supabase dashboard
- Monitor performance in Supabase dashboard
- Review and optimize queries as needed

## 🇬🇭 Ghana Education Context

This system is designed specifically for Ghana's Basic School system:
- **Primary 1-6**: Lower primary (1-3) and Upper primary (4-6)
- **JHS 1-3**: Junior High School
- **Three-term system**: September-December, January-April, April-July
- **Grading**: A (80-100), B (70-79), C (60-69), D (50-59), E (40-49), F (0-39)
- **Assessment**: 30% continuous assessment + 70% exam = 100% total

## 📄 License

Proprietary - Biriwa Methodist 'C' Basic School

---

**Built with ❤️ for Biriwa Methodist 'C' Basic School, Ghana**

For technical support, contact your system administrator.
