# Setting Up Username-Based Authentication

This guide explains how to set up and use the new username-based authentication system.

## Overview

The system has been updated with the following changes:
1. ✅ **Username-only login** - No email required for students
2. ✅ **Automatic role detection** - No need to select Student/Teacher/Admin tabs
3. ✅ **KG Classes added** - Now supports KG 1, KG 2, Primary 1-6, JHS 1-3
4. ✅ **School crest integration** - Logo displayed on login and homepage

## Database Updates Required

### Step 1: Run the Migration

You need to apply the database migration to add the username field and update classes.

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://okfawhokrtkaibhbcjdk.supabase.co
2. Click on "SQL Editor" in the left sidebar
3. Open the file `database/migrations/001_add_username_and_kg.sql`
4. Copy the entire SQL content
5. Paste it into the SQL Editor
6. Click "Run" to execute the migration

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
npx supabase login

# Link your project
npx supabase link --project-ref okfawhokrtkaibhbcjdk

# Run the migration
npx supabase db push
```

### Step 2: Create Test User Accounts

Since the system now uses username-based login, you need to create user accounts with usernames.

#### Creating a Student Account

1. **Go to Supabase Dashboard** → Authentication → Users
2. **Click "Add User"**
3. **Fill in the form:**
   - Email: `kofi.mensah@student.biriwa.edu.gh`
   - Password: `Student123!`
   - Auto Confirm User: ✅ Yes
4. **Click "Create User"**
5. **Copy the User ID** (e.g., `123e4567-e89b-12d3-a456-426614174000`)
6. **Go to SQL Editor** and run:

```sql
-- Create profile with username
INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000', -- Replace with actual user ID
  'kofi.mensah@student.biriwa.edu.gh',
  'kofi.mensah', -- This is the username for login
  'Kofi Mensah',
  'student'
);

-- Create student record
INSERT INTO students (id, profile_id, student_id, first_name, last_name, date_of_birth, gender, class_id, guardian_name, guardian_phone, guardian_email)
SELECT 
  gen_random_uuid(),
  '123e4567-e89b-12d3-a456-426614174000', -- Replace with actual user ID
  'STU2024001',
  'Kofi',
  'Mensah',
  '2014-03-15',
  'Male',
  id,
  'Mr. Emmanuel Mensah',
  '+233244567890',
  'emmanuel.mensah@email.com'
FROM classes WHERE name = 'Primary 4';
```

#### Creating a Teacher Account

1. **Go to Supabase Dashboard** → Authentication → Users
2. **Click "Add User"**
3. **Fill in the form:**
   - Email: `samuel.adjei@teacher.biriwa.edu.gh`
   - Password: `Teacher123!`
   - Auto Confirm User: ✅ Yes
4. **Copy the User ID**
5. **Go to SQL Editor** and run:

```sql
-- Create profile with username
INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  'TEACHER_USER_ID', -- Replace with actual user ID
  'samuel.adjei@teacher.biriwa.edu.gh',
  'teacher.samuel', -- This is the username for login
  'Mr. Samuel Adjei',
  'teacher'
);

-- Create teacher record
INSERT INTO teachers (id, profile_id, teacher_id, first_name, last_name, phone, specialization, qualification)
VALUES (
  gen_random_uuid(),
  'TEACHER_USER_ID', -- Replace with actual user ID
  'TCH2024001',
  'Samuel',
  'Adjei',
  '+233201234567',
  'Mathematics & Science',
  'Bachelor of Education (B.Ed) - Mathematics'
);
```

#### Creating an Admin Account

1. **Go to Supabase Dashboard** → Authentication → Users
2. **Click "Add User"**
3. **Fill in the form:**
   - Email: `admin@biriwa.edu.gh`
   - Password: `Admin123!`
   - Auto Confirm User: ✅ Yes
4. **Copy the User ID**
5. **Go to SQL Editor** and run:

```sql
INSERT INTO profiles (id, email, username, full_name, role)
VALUES (
  'ADMIN_USER_ID', -- Replace with actual user ID
  'admin@biriwa.edu.gh',
  'admin.francis',
  'Mr. Francis Owusu',
  'admin'
);
```

## Username Naming Convention

To maintain consistency across the school system, follow these username formats:

### Students
- **Format:** `firstname.lastname`
- **Examples:** 
  - `kofi.mensah`
  - `ama.asante`
  - `kwame.boateng`
- **If duplicate:** `kofi.mensah1`, `kofi.mensah2`, etc.

### Teachers
- **Format:** `teacher.firstname`
- **Examples:**
  - `teacher.samuel`
  - `teacher.grace`
  - `teacher.joseph`

### Administrators
- **Format:** `admin.firstname`
- **Examples:**
  - `admin.francis`
  - `admin.mary`

## Testing the Login System

### Step 1: Start the Development Server

```bash
npm run dev
```

### Step 2: Access the Login Page

Open your browser and go to: http://localhost:3000/login

### Step 3: Test Login with Different Roles

#### Test Student Login
- **Username:** `kofi.mensah`
- **Password:** `Student123!`
- **Expected:** Redirects to `/student/dashboard`

#### Test Teacher Login
- **Username:** `teacher.samuel`
- **Password:** `Teacher123!`
- **Expected:** Redirects to `/teacher/dashboard`

#### Test Admin Login
- **Username:** `admin.francis`
- **Password:** `Admin123!`
- **Expected:** Redirects to `/admin/dashboard`

## How It Works

### Login Flow

1. **User enters username and password** (no email required)
2. **System looks up the username** in the profiles table
3. **Retrieves the email and role** associated with that username
4. **Authenticates with Supabase** using email and password
5. **Automatically detects role** (student/teacher/admin)
6. **Redirects to the appropriate dashboard** based on role

### Code Implementation

The authentication logic is in `lib/auth.ts`:

```typescript
export async function signInWithUsername(username: string, password: string) {
  // Look up user by username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, role')
    .eq('username', username)
    .single()

  if (profileError || !profile) {
    return { data: null, error: 'Invalid username', role: null }
  }

  // Sign in with email and password
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: password,
  })

  // Return user data and role
  return { data, error, role: profile.role }
}
```

## School Crest / Logo

The school crest has been integrated and appears on:
- **Login page** (header and center of form)
- **Homepage** (header)
- **All portal dashboards** (navigation)

### Replacing the Placeholder Logo

The current logo is a placeholder SVG at `/public/logo.svg`. To replace it with the actual school crest:

1. Save your school crest image as `logo.png` or `logo.svg`
2. Place it in the `public` folder
3. The system will automatically use it

**Recommended image specifications:**
- Format: PNG or SVG
- Size: 500x500 pixels minimum
- Background: Transparent (for PNG)
- Quality: High resolution for printing

## Classes Structure

The system now supports 11 class levels:

| Class | Level | Category |
|-------|-------|----------|
| KG 1 | 1 | Kindergarten |
| KG 2 | 2 | Kindergarten |
| Primary 1 | 3 | Primary |
| Primary 2 | 4 | Primary |
| Primary 3 | 5 | Primary |
| Primary 4 | 6 | Primary |
| Primary 5 | 7 | Primary |
| Primary 6 | 8 | Primary |
| JHS 1 | 9 | Junior High |
| JHS 2 | 10 | Junior High |
| JHS 3 | 11 | Junior High |

## Troubleshooting

### Issue: "Invalid username or password"

**Possible causes:**
1. Username doesn't exist in the profiles table
2. Password is incorrect
3. Profile not linked to auth user

**Solution:**
- Verify the username exists: 
```sql
SELECT username, email, role FROM profiles WHERE username = 'kofi.mensah';
```
- Check if auth user exists in Authentication panel
- Ensure profile.id matches auth.users.id

### Issue: Login successful but no redirect

**Possible causes:**
1. Role not set in profile
2. JavaScript error in browser

**Solution:**
- Check browser console for errors
- Verify role is set:
```sql
SELECT username, role FROM profiles WHERE username = 'kofi.mensah';
```

### Issue: "Cannot find user with this email"

**Possible causes:**
1. Auth user not created in Supabase Authentication
2. Email mismatch between auth and profile

**Solution:**
- Go to Supabase Dashboard → Authentication → Users
- Verify user exists with the correct email
- Ensure profile.email matches auth.users.email

## Bulk User Creation (Optional)

For creating many users at once, you can use the Supabase Management API:

```javascript
// create-users.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://okfawhokrtkaibhbcjdk.supabase.co',
  'YOUR_SERVICE_ROLE_KEY' // Use service role key from .env.local
)

async function createStudent(username, email, password, studentData) {
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  })

  if (authError) {
    console.error('Error creating auth user:', authError)
    return
  }

  // Create profile
  await supabase.from('profiles').insert({
    id: authData.user.id,
    email: email,
    username: username,
    full_name: studentData.fullName,
    role: 'student'
  })

  // Create student record
  await supabase.from('students').insert({
    profile_id: authData.user.id,
    ...studentData
  })

  console.log(`Created student: ${username}`)
}

// Run with: node create-users.js
```

## Next Steps

1. ✅ Run database migration
2. ✅ Create test accounts for each role
3. ✅ Test login with username
4. ✅ Verify automatic role detection
5. ✅ Replace placeholder logo with school crest
6. ✅ Create bulk user accounts for all students
7. ✅ Train teachers and staff on username format
8. ✅ Deploy to production

## Support

If you encounter any issues, check:
- Database migrations completed successfully
- Supabase connection working (.env.local configured)
- User accounts created with correct username format
- Profiles table has username field
- Classes table updated with KG 1 and KG 2

For additional help, review the main `SETUP_GUIDE.md` and `README.md` files.
