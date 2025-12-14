# Attendance System - Issues Fixed

## Problems Found and Fixed

### 1. ❌ Query Column Mismatch
**Problem**: The attendance page was querying `teachers` table with `user_id` column, but the table uses `profile_id`.

**Fixed**: 
- Updated `app/teacher/attendance/page.tsx` line 64
- Changed: `.eq('user_id', userId)` → `.eq('profile_id', userId)`

### 2. ❌ RLS Policies Using Wrong Column
**Problem**: The RLS policies in `student_attendance` table were checking `user_id` in subqueries, but all tables use `profile_id`.

**Fixed**: 
- Updated `database/update-attendance-system.sql`
- Changed all policies from `WHERE user_id = auth.uid()` to `WHERE profile_id = auth.uid()`

**ACTION REQUIRED**: Run this SQL in Supabase Dashboard → SQL Editor:
```sql
-- File: database/fix-attendance-rls-policies.sql

DROP POLICY IF EXISTS "Students can view own attendance" ON student_attendance;
CREATE POLICY "Students can view own attendance" 
ON student_attendance FOR SELECT
USING (student_id IN (SELECT id FROM students WHERE profile_id = auth.uid()));

DROP POLICY IF EXISTS "Teachers can view class attendance" ON student_attendance;
CREATE POLICY "Teachers can view class attendance" 
ON student_attendance FOR SELECT
USING (class_id IN (SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())));

DROP POLICY IF EXISTS "Teachers can manage class attendance" ON student_attendance;
CREATE POLICY "Teachers can manage class attendance" 
ON student_attendance FOR ALL
USING (class_id IN (SELECT class_id FROM teacher_class_assignments WHERE teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid()) AND is_class_teacher = true));
```

### 3. ✅ Teacher Assignment Updated
- Teacher is now assigned to **Basic 3** (has 15 students: 8 boys, 7 girls)
- Removed old KG 1 assignment
- Set as Class Teacher: Yes

### 4. ✅ Total Days Set
- Current term (Term 1 2025/2026) now has `total_days = 63`

### 5. ❌ RLS Policy Missing for academic_terms
**Problem**: The `academic_terms` table has RLS enabled but no policies, blocking all updates.

**ACTION REQUIRED**: Run this SQL in Supabase Dashboard → SQL Editor:
```sql
-- File: database/add-academic-terms-rls.sql

ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Everyone can view academic terms" ON academic_terms;
DROP POLICY IF EXISTS "Admins can manage academic terms" ON academic_terms;

CREATE POLICY "Everyone can view academic terms"
ON academic_terms FOR SELECT USING (true);

CREATE POLICY "Admins can manage academic terms"
ON academic_terms FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

### 6. ✅ Student Dashboard Fixed
**Problem**: Dashboard was querying `grades` table for `total` column (doesn't exist).

**Fixed**: Changed to query `scores` table which has the correct schema.

## System Status

### ✅ Ready to Use
- **Teacher**: Test Teacher (ID: TCH1009)
- **Login**: teacher.test / Teacher123!
- **Class**: Basic 3
- **Students**: 15 (8 boys, 7 girls)
- **Current Term**: Term 1 (2025/2026)
- **Total Days**: 63

### Next Steps
1. **Run the SQL above** in Supabase Dashboard to fix RLS policies
2. **Login** as teacher.test
3. **Navigate** to Teacher → Mark Attendance
4. **Select** Basic 3 from dropdown
5. **Enter** days present for each student (0-63)
6. **View** real-time statistics:
   - Total students
   - Overall attendance rate
   - Boys attendance rate
   - Girls attendance rate
7. **Click** Save Attendance

## Files Modified
- ✅ `app/teacher/attendance/page.tsx` - Fixed query column
- ✅ `database/update-attendance-system.sql` - Fixed RLS policies (template)
- ✅ `scripts/reassign-teacher-basic3.js` - Reassigned teacher to Basic 3
- 📄 `database/fix-attendance-rls-policies.sql` - SQL to run manually

## Testing Checklist
- [x] Teacher record exists
- [x] Teacher assigned to Basic 3 as class teacher
- [x] Students exist in Basic 3 (15 students)
- [x] Total days set (63)
- [x] Frontend query fixed (profile_id)
- [x] Student dashboard fixed (grades → scores table)
- [ ] **Student_attendance RLS updated** (needs SQL: database/fix-attendance-rls-policies.sql)
- [ ] **Academic_terms RLS added** (needs SQL: database/add-academic-terms-rls.sql)
- [ ] Test admin attendance settings save
- [ ] Test marking attendance
- [ ] Verify statistics calculation
- [ ] Test save functionality
