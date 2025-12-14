# Username-Based Authentication Setup Guide

## Overview
The system now uses **username-based authentication** where email addresses are just placeholders for Supabase's requirements. Users login with their username and password, not email.

## How It Works

### Authentication Flow
1. User enters **username** and password on login page
2. System looks up the username in `profiles` table to get placeholder email
3. System authenticates using the placeholder email + password with Supabase Auth
4. User is logged in successfully

### Email Structure
- **Auth Email (Supabase)**: `{username}@school.local` (placeholder, required by Supabase)
- **Contact Email (Optional)**: Stored in `teachers.email` or `students.email` (actual contact email)

### Examples
- **Teacher**: Username: `teacher.precious` → Auth Email: `teacher.precious@school.local`
- **Student**: Username: `john.doe` → Auth Email: `john.doe@school.local`
- **Admin**: Username: `admin` → Auth Email: `admin@school.local`

## Setup Instructions

### 1. Run Database Migrations

Run these SQL files in your Supabase SQL Editor in order:

```sql
-- Add email column to teachers table
-- File: add-teacher-email-column.sql
```

### 2. View Current Teacher Accounts

```sql
-- File: bulk-update-teacher-emails.sql
-- Run Step 1 to see all teachers and their current/target emails
```

### 3. Update Existing Teacher Auth Emails

**Manual Update via Supabase Dashboard:**

For each existing teacher:

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find the user by their current email
3. Click **three dots (⋮)** → **"Update user"**
4. Update fields:
   - **Email**: Change to `{username}@school.local` (e.g., `teacher.precious@school.local`)
   - **Password**: Reset to `Teacher123!` (or your preferred default)
5. Click **Update user**
6. The `profiles.email` will automatically sync

**Example Updates:**

| Username | Old Email | New Auth Email | Password |
|----------|-----------|----------------|----------|
| teacher.precious | christophernkornu@gmail.com | teacher.precious@school.local | Teacher123! |
| teacher.john | john.smith@gmail.com | teacher.john@school.local | Teacher123! |

### 4. Verify Updates

Run Step 3 from `bulk-update-teacher-emails.sql`:

```sql
SELECT 
  p.username,
  p.email as auth_email,
  CASE 
    WHEN p.email = p.username || '@school.local' THEN '✅ Updated'
    ELSE '❌ Needs Update'
  END as status
FROM profiles p
WHERE p.role = 'teacher';
```

All teachers should show **✅ Updated**.

## Creating New Users

### New Teachers (via CSV or Manual)

New teachers automatically get:
- **Username**: `teacher.{firstname}` (e.g., `teacher.mary`)
- **Auth Email**: `teacher.mary@school.local`
- **Password**: `Teacher123!` (default)
- **Contact Email**: Stored in `teachers.email` if provided

### New Students (via CSV or Manual)

New students automatically get:
- **Username**: `{firstname}.{lastname}` (e.g., `john.doe`)
- **Auth Email**: `john.doe@school.local`
- **Password**: `Student123!` (default)
- **Contact Email**: Can be stored in `students.email` if needed

## Login Instructions for Users

### Teachers
- **Username**: `teacher.{firstname}` (e.g., `teacher.precious`)
- **Password**: `Teacher123!` (or changed password)
- **Do NOT use email to login** - always use username

### Students
- **Username**: `{firstname}.{lastname}` (e.g., `john.doe`)
- **Password**: `Student123!` (or changed password)

### Admins
- **Username**: As configured (e.g., `admin`)
- **Password**: As configured

## Important Notes

### For Administrators
1. **Email is NOT used for login** - users always login with username
2. **Auth emails are placeholders** - format: `{username}@school.local`
3. **Real contact emails** - stored separately in `teachers.email` or `students.email`
4. **CSV uploads** - automatically generate correct username and placeholder email
5. **Password reset** - users need to remember their username, not email

### For Teachers/Students
1. Always login with your **username**, not email
2. If you forget your username, contact admin
3. Default password is `Teacher123!` or `Student123!`
4. Change your password after first login (recommended)

### Technical Details
- Placeholder emails follow pattern: `{username}@school.local`
- Domain `@school.local` is not a real domain - it's just for Supabase
- Actual contact emails stored in respective tables (`teachers.email`, `students.email`)
- Username is unique and case-insensitive
- Usernames cannot contain special characters except dots and underscores

## Troubleshooting

### "Invalid login credentials" Error
**Cause**: Auth email doesn't match username format or password is wrong

**Solution**:
1. Verify username in database: `SELECT username, email FROM profiles WHERE username = 'teacher.precious'`
2. Check if email is `{username}@school.local`
3. If not, update email in Supabase Dashboard → Authentication → Users
4. Reset password to `Teacher123!`

### User can't login after creation
**Cause**: Auth email wasn't set correctly during creation

**Solution**:
1. Check user's email: Should be `{username}@school.local`
2. Update in Supabase Dashboard if needed
3. Reset password

### Want to use real emails for login
**Not recommended** but if needed:
1. Update `lib/user-creation.ts` to use actual email instead of placeholder
2. Update `lib/auth.ts` to handle both username and email login
3. Ensure all users have valid, unique emails

## Database Schema Changes

### New Columns
- `teachers.email` - TEXT (nullable) - Stores actual contact email
- `students.email` - TEXT (nullable) - Stores actual contact email (if needed)

### Email Columns Overview
| Table | Column | Purpose | Example |
|-------|--------|---------|---------|
| profiles | email | Auth email (placeholder) | teacher.precious@school.local |
| teachers | email | Contact email (optional) | precious@gmail.com |
| students | email | Contact email (optional) | john.parent@gmail.com |

## Files Changed

- ✅ `lib/user-creation.ts` - Updated to use placeholder emails
- ✅ `database/add-teacher-email-column.sql` - Adds email to teachers
- ✅ `database/bulk-update-teacher-emails.sql` - Helper for migration
- ✅ `database/fix-teacher-auth-emails.sql` - Migration notes
- ✅ `USERNAME_AUTH_GUIDE.md` - This guide

## Next Steps

1. ✅ Run `add-teacher-email-column.sql` migration
2. ⏳ Update existing teacher emails via Supabase Dashboard
3. ⏳ Test login with updated teachers
4. ⏳ Inform users to login with usernames, not emails
5. ⏳ Update any documentation/training materials
