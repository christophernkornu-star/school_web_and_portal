# Teaching Model Setup Instructions

## Step 1: Execute SQL in Supabase Dashboard

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Open the file `database/implement-teaching-models.sql`
4. Copy and paste the entire contents into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)
6. Wait for confirmation: "Success. No rows returned"

## Step 2: Verify the Setup

Run these queries in the SQL Editor to verify everything is set up correctly:

### Check system settings:
```sql
SELECT * FROM system_settings 
WHERE setting_key LIKE '%teaching_model%'
ORDER BY setting_key;
```

**Expected Result**: 3 rows
- `lower_primary_teaching_model` → `class_teacher`
- `upper_primary_teaching_model` → `class_teacher`
- `jhs_teaching_model` → `subject_teacher`

### Check table columns:
```sql
-- Check if is_class_teacher column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_class_assignments' 
  AND column_name IN ('is_class_teacher', 'teacher_id', 'class_id', 'is_primary');

-- Check if can_edit column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_subject_assignments' 
  AND column_name IN ('can_edit', 'teacher_id', 'subject_id', 'class_id');
```

**Expected Result**: 
- `teacher_class_assignments` should have `is_class_teacher` (boolean)
- `teacher_subject_assignments` should have `can_edit` (boolean)

### Check functions:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_teaching_model_for_class',
  'can_teacher_edit_subject',
  'assign_all_subjects_to_class_teacher'
);
```

**Expected Result**: 3 functions listed

### Test the get_teaching_model_for_class function:
```sql
-- Should return 'class_teacher' for Lower Primary
SELECT get_teaching_model_for_class('Basic 2');

-- Should return configured model for Upper Primary (default 'class_teacher')
SELECT get_teaching_model_for_class('Basic 5');

-- Should return 'subject_teacher' for JHS
SELECT get_teaching_model_for_class('JHS 1');
```

### Check the view:
```sql
SELECT * FROM teacher_assignments_view LIMIT 5;
```

**Expected Result**: View should show teachers with their classes, school_section, and assigned subjects

## Step 3: Test the Teaching Model Configuration Page

1. Start your development server (if not running): `npm run dev`
2. Go to **Admin Portal** → **Teacher Management** section
3. Click **"Teaching Model Settings"** (yellow highlighted box)
4. You should see:
   - Lower Primary (Basic 1-3): Fixed as "Class Teacher Model"
   - Upper Primary (Basic 4-6): Configurable (radio buttons)
   - JHS (JHS 1-3): Fixed as "Subject Teacher Model"
5. Try changing the Upper Primary setting and click **Save**
6. Verify the change:
   ```sql
   SELECT setting_value 
   FROM system_settings 
   WHERE setting_key = 'upper_primary_teaching_model';
   ```

## Step 4: Assign Teachers with Teaching Model Logic

1. Go to **Admin Portal** → **Teacher Management** → **Class Assignments**
2. Click **"Edit Assignments"** for a teacher
3. The page will now be teaching model-aware:
   - **Lower Primary (Basic 1-3)**:
     * Simply check the class
     * All subjects automatically assigned (no subject selection shown)
   - **Upper Primary (Basic 4-6)**:
     * If **Class Teacher Model** configured: Same as Lower Primary
     * If **Subject Teacher Model** configured: Select specific subjects
   - **JHS (JHS 1-3)**:
     * Select specific subjects (subject specialization)
     * Check "Class Teacher" box if this teacher should manage the class

## What Each Teaching Model Means

### Class Teacher Model (Lower Primary, configurable for Upper Primary)
- **One teacher** per class
- Teaches **ALL subjects**
- Marks **attendance**
- Enters **student names**
- Full **class management** responsibilities

### Subject Teacher Model (JHS, configurable for Upper Primary)
- **Multiple teachers** per class
- Each teaches **specific subjects**
- **One designated** as "Class Teacher" per class
- **Class teacher** marks attendance and manages students
- **Class teacher** can **view all subjects** but only edit assigned ones
- **Subject teachers** only see/edit their subjects

## Common Issues

### Issue: SQL execution fails with "relation already exists"
**Solution**: Some parts may already be set up. Comment out the parts that fail and re-run.

### Issue: Functions don't exist after running SQL
**Solution**: Make sure you ran the entire SQL file. Try running just the function creation parts separately.

### Issue: 406 error when loading teaching model page
**Solution**: Check RLS policies on `system_settings`:
```sql
-- Allow public to read system settings
CREATE POLICY "Public can view school settings" 
ON system_settings FOR SELECT 
USING (true);
```

### Issue: Can't save teaching model configuration
**Solution**: Check RLS policies allow admins to update:
```sql
-- Allow admins to manage settings
CREATE POLICY "Admins can manage school settings" 
ON system_settings FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);
```

## Next Steps After Setup

1. **Configure teaching model** for Upper Primary at `/admin/teaching-model`
2. **Assign teachers** to classes with proper roles
3. **Test teacher portal** - verify teachers only see their authorized classes/subjects
4. **Test score entry** - verify permission enforcement
5. **Test attendance** - verify only class teachers can mark attendance

## Database Schema Reference

### teacher_class_assignments
```
teacher_id (UUID) → teachers.id
class_id (UUID) → classes.id
is_primary (BOOLEAN) → Primary assignment indicator
is_class_teacher (BOOLEAN) → Class teacher designation [NEW]
```

### teacher_subject_assignments
```
teacher_id (UUID) → teachers.id
class_id (UUID) → classes.id
subject_id (UUID) → subjects.id
can_edit (BOOLEAN) → Edit permission flag [NEW]
```

### system_settings
```
setting_key (TEXT) → Unique identifier
setting_value (TEXT) → Configuration value
description (TEXT) → Human-readable description
```

## Support

If you encounter issues:
1. Check Supabase logs for error messages
2. Verify RLS policies are correctly set
3. Ensure functions exist and are accessible
4. Check browser console for frontend errors
5. Review this setup guide for troubleshooting steps
