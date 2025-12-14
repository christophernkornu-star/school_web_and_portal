# Profile RLS Error Fix

## Problem
When creating teacher or student accounts, you get:
```
Failed to create profile: new row violates row-level security policy for table "profiles"
```

## Root Cause
The `profiles` table has RLS enabled but is **missing an INSERT policy**. This prevents:
- Admins from creating teacher/student accounts
- New user profiles from being created during signup

## ✅ Solution

Run the SQL fix to add the missing INSERT policies.

### Step 1: Open Supabase SQL Editor
1. Go to https://okfawhokrtkaibhbcjdk.supabase.co
2. Navigate to **SQL Editor**

### Step 2: Run the Fix
Copy and paste this SQL:

```sql
-- Fix RLS Policy for Profile Creation
-- This allows profile insertion during user signup and admin-created accounts

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Allow profile creation during signup" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Solution 1: Allow users to insert their own profile during signup
-- This works when the user signs up themselves
CREATE POLICY "Allow profile creation during signup" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Solution 2: Allow admins to insert profiles for teacher/student accounts
-- This is needed when admins create accounts via the portal
CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT 
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Step 3: Click "Run"

### Step 4: Verify
The command should complete successfully. You should see:
```
Success. No rows returned
```

## What This Does

### Policy 1: "Allow profile creation during signup"
- Allows a user to insert their own profile
- `auth.uid()` matches the profile `id` being inserted
- Works for self-registration scenarios

### Policy 2: "Admins can insert profiles"
- Allows admins to create profiles for others
- Checks if the current user (`auth.uid()`) is an admin
- Required for teacher/student creation in the admin portal

## Test It

After running the fix:

1. **Login as admin** (admin.francis/Admin123!)
2. Go to **Teachers** → **Add New Teacher**
3. Fill in the form and submit
4. Should work without errors! ✅

Same for students.

## Alternative: Quick SQL File

You can also run the file `database/fix-profile-rls.sql` in the SQL Editor.

## Why This Happened

The original schema had:
- ✅ SELECT policy (for login)
- ✅ UPDATE policy (for profile edits)
- ❌ **Missing INSERT policy** (for account creation)

RLS blocks all operations by default unless explicitly allowed by a policy.

## Verify Current Policies

To see all policies on the profiles table:
```sql
SELECT 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'profiles';
```

You should see:
1. "Anyone can view profiles for login" (SELECT)
2. "Users can update own profile" (UPDATE)
3. "Allow profile creation during signup" (INSERT) ← NEW
4. "Admins can insert profiles" (INSERT) ← NEW

---

**Status**: ✅ Fixed after running the SQL migration
