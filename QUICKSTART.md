# Quick Start Guide

## Prerequisites
- Node.js 18+ installed
- Supabase account and project

## Quick Setup

1. **Install Dependencies**
   ```powershell
   npm install
   ```

2. **Configure Environment**
   - Open `.env.local`
   - Replace `your_anon_key_here` with your Supabase anon key
   - Replace `your_service_role_key_here` with your Supabase service role key
   - Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api

3. **Set Up Database**
   - Go to Supabase SQL Editor
   - Copy all content from `database/schema.sql`
   - Paste and run in SQL Editor

4. **Create Test Users**
   
   In Supabase Dashboard → Authentication → Users, create:
   
   **Admin**: admin@test.com / password123
   ```sql
   INSERT INTO profiles (id, email, full_name, role) 
   VALUES ('USER_ID', 'admin@test.com', 'Admin User', 'admin');
   ```
   
   **Teacher**: teacher@test.com / password123
   ```sql
   INSERT INTO profiles (id, email, full_name, role) 
   VALUES ('USER_ID', 'teacher@test.com', 'Teacher User', 'teacher');
   
   INSERT INTO teachers (user_id, teacher_id, hire_date) 
   VALUES ('USER_ID', 'TCH001', CURRENT_DATE);
   ```
   
   **Student**: student@test.com / password123
   ```sql
   INSERT INTO profiles (id, email, full_name, role) 
   VALUES ('USER_ID', 'student@test.com', 'Student User', 'student');
   
   INSERT INTO students (user_id, student_id, admission_date, current_class_id) 
   VALUES ('USER_ID', 'STD001', CURRENT_DATE, 
           (SELECT id FROM classes WHERE class_name = 'Primary 4'));
   ```

5. **Run Development Server**
   ```powershell
   npm run dev
   ```

6. **Access the System**
   - Homepage: http://localhost:3000
   - Student Portal: http://localhost:3000/login?portal=student
   - Teacher Portal: http://localhost:3000/login?portal=teacher
   - Admin Portal: http://localhost:3000/login?portal=admin

## Default Test Credentials

Once you create the users above, use these to login:

- **Admin**: admin@test.com / password123
- **Teacher**: teacher@test.com / password123
- **Student**: student@test.com / password123

## Key URLs

- **Homepage**: `/`
- **Login**: `/login?portal=student|teacher|admin`
- **Student Dashboard**: `/student/dashboard`
- **Teacher Dashboard**: `/teacher/dashboard`
- **Admin Dashboard**: `/admin/dashboard`
- **Events**: `/events`
- **Gallery**: `/gallery`
- **Admission**: `/admission`
- **About**: `/about`

## Next Steps

1. Customize school information in homepage
2. Add real students and teachers
3. Upload school logo and photos
4. Configure email templates in Supabase
5. Test all features thoroughly
6. Deploy to production

## Need Help?

See `SETUP_GUIDE.md` for detailed documentation.

## Common Issues

**Build errors?** Run: `npm install --legacy-peer-deps`

**Database connection failed?** Check `.env.local` has correct Supabase credentials

**Login not working?** Ensure user exists in both Supabase Auth AND profiles table

---

Built for Biriwa Methodist 'C' Basic School, Ghana 🇬🇭
