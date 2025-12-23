# Complete Permissions Fix

I have implemented the logic to enforce Admin permissions in the Teacher and Student portals.

## Changes Made

1.  **Teacher Portal (`app/teacher/scores/view/page.tsx`)**:
    *   Updated to read `allow_teacher_delete_scores` from the `security_settings` table.
    *   The "Delete" button (Trash icon) will now only appear if this setting is enabled in the Admin Portal.

2.  **Student Portal (`app/student/profile/page.tsx`)**:
    *   Updated to read `allow_student_profile_edit` from the `security_settings` table.
    *   The "Edit Details" button will now only appear if this setting is enabled in the Admin Portal.

3.  **Database Migration (`database/allow-settings-view.sql`)**:
    *   Created a new SQL migration file to allow Teachers and Students to **view** the `security_settings` table.
    *   This is required because by default, only Admins can view this table.

## Action Required

You must run the following SQL in your Supabase SQL Editor to apply the necessary permissions:

```sql
-- Allow Teachers and Students to view security settings
-- This is needed so they can check permissions like 'allow_teacher_delete_scores' and 'allow_student_profile_edit'

-- Policy for Teachers
CREATE POLICY "Teachers can view security settings" ON security_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );

-- Policy for Students
CREATE POLICY "Students can view security settings" ON security_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'student'
    )
  );
```

## Verification

1.  **Admin Portal**: Go to Settings -> Security. Toggle "Allow Teachers to Delete Scores" and "Allow Students to Edit Profile". Save.
2.  **Teacher Portal**: Go to View Scores. The Delete button should appear/disappear based on the setting.
3.  **Student Portal**: Go to Profile. The Edit button should appear/disappear based on the setting.
