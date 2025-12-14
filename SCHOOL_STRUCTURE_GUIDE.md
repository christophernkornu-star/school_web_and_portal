# School Teaching Structure Implementation

## Overview
The system now supports three different teaching models:

### 1. **Lower Primary (P1-P3)**: One Teacher, All Subjects
- One teacher assigned to the class
- Same teacher teaches all 8 subjects
- That teacher is also the class teacher (handles attendance)

### 2. **Upper Primary (P4-P6)**: Flexible
- Can follow Lower Primary model (1 teacher, all subjects)
- OR can follow JHS model (multiple teachers)
- Depends on teacher availability

### 3. **JHS (JHS 1-3)**: Multiple Teachers, One Class Teacher
- Different teachers for different subjects (9 subjects)
- One teacher designated as "Class Teacher"
- Class Teacher handles attendance for the entire class

## Database Setup

### Step 1: Add Level Columns
Run: `add-level-columns.sql`

### Step 2: Setup School Structure
Run: `setup-school-structure.sql`

This will:
- Add level columns to classes and subjects tables
- Create all subjects for each level
- Set up the class type structure

## How to Assign Teachers

### For Lower Primary (e.g., Primary 1)

```sql
-- 1. Mark teacher as class teacher
INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher, academic_year)
VALUES ('TCH0001', (SELECT id FROM classes WHERE class_name = 'Primary 1'), true, '2024/2025');

-- 2. Assign to ALL subjects in that class
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
SELECT 
  'TCH0001',
  s.id,
  (SELECT id FROM classes WHERE class_name = 'Primary 1'),
  '2024/2025'
FROM subjects s
WHERE s.level = 'lower_primary';
```

### For JHS (e.g., JHS 1)

```sql
-- 1. Assign English teacher as class teacher (handles attendance)
INSERT INTO teacher_class_assignments (teacher_id, class_id, is_class_teacher, academic_year)
VALUES ('TCH0002', (SELECT id FROM classes WHERE class_name = 'JHS 1'), true, '2024/2025');

INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
VALUES ('TCH0002', (SELECT id FROM subjects WHERE subject_code = 'ENG_JHS'), 
        (SELECT id FROM classes WHERE class_name = 'JHS 1'), '2024/2025');

-- 2. Assign Math teacher (NOT class teacher, just teaches math)
INSERT INTO teacher_subject_assignments (teacher_id, subject_id, class_id, academic_year)
VALUES ('TCH0003', (SELECT id FROM subjects WHERE subject_code = 'MATH_JHS'),
        (SELECT id FROM classes WHERE class_name = 'JHS 1'), '2024/2025');

-- 3. Continue for other subjects...
```

### For Upper Primary (Flexible)

Choose one approach:

**Option A: One Teacher (Like Lower Primary)**
```sql
-- Same as Lower Primary example, but use 'upper_primary' subjects
```

**Option B: Multiple Teachers (Like JHS)**
```sql
-- Same as JHS example, assign different teachers to different subjects
```

## Subjects by Level

### Lower Primary & Upper Primary (8 subjects):
1. Mathematics
2. English Language
3. History
4. RME
5. Ghanaian Language
6. Creative Arts
7. Computing
8. Science

### JHS (9 subjects):
1. English Language
2. Mathematics
3. Social Studies
4. Ghanaian Language
5. Computing
6. Career Technology
7. RME
8. Integrated Science
9. Creative Arts

## Attendance Rules

- **Lower Primary**: The single teacher marks attendance
- **Upper Primary**: Depends on model chosen
  - If one teacher: That teacher marks attendance
  - If multiple: Designated class teacher marks attendance
- **JHS**: The designated class teacher marks attendance (not subject teachers)

## Teacher Portal Implications

### Dashboard Shows:
- **For Class Teachers**: 
  - "Class Teacher: [Class Name]" badge
  - Attendance button enabled
  - Full class roster access

- **For Subject Teachers Only**:
  - "Subject Teacher: [Subject]" for each class
  - No attendance marking (unless they're also class teacher for that class)
  - Access to students in classes they teach

### Attendance Page:
- Only accessible if teacher is marked as `is_class_teacher = true` for at least one class
- Shows dropdown to select which class (if class teacher for multiple)
- Student list shows all students in that class (regardless of subjects taught)

## Quick Reference Queries

### Check who is class teacher for each class:
```sql
SELECT 
  c.class_name,
  t.first_name || ' ' || t.last_name as class_teacher
FROM classes c
JOIN teacher_class_assignments tca ON tca.class_id = c.id AND tca.is_class_teacher = true
JOIN teachers t ON t.teacher_id = tca.teacher_id
ORDER BY c.class_name;
```

### Check all teachers for a specific class:
```sql
SELECT DISTINCT
  c.class_name,
  s.subject_name,
  t.first_name || ' ' || t.last_name as teacher,
  CASE WHEN tca.is_class_teacher THEN '✅ Class Teacher' ELSE 'Subject Teacher' END as role
FROM teacher_subject_assignments tsa
JOIN subjects s ON s.id = tsa.subject_id
JOIN teachers t ON t.teacher_id = tsa.teacher_id
JOIN classes c ON c.id = tsa.class_id
LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = t.teacher_id AND tca.class_id = c.id
WHERE c.class_name = 'JHS 1'
ORDER BY s.subject_name;
```

### Check teacher's full assignment:
```sql
SELECT 
  t.teacher_id,
  t.first_name || ' ' || t.last_name as teacher_name,
  c.class_name,
  STRING_AGG(s.subject_name, ', ') as subjects_taught,
  CASE WHEN tca.is_class_teacher THEN 'Yes' ELSE 'No' END as is_class_teacher
FROM teachers t
JOIN teacher_subject_assignments tsa ON tsa.teacher_id = t.teacher_id
JOIN subjects s ON s.id = tsa.subject_id
JOIN classes c ON c.id = tsa.class_id
LEFT JOIN teacher_class_assignments tca ON tca.teacher_id = t.teacher_id AND tca.class_id = c.id
WHERE t.teacher_id = 'TCH0001'
GROUP BY t.teacher_id, t.first_name, t.last_name, c.class_name, tca.is_class_teacher
ORDER BY c.class_name;
```

## Migration Order

1. ✅ Run `add-level-columns.sql`
2. ✅ Run `setup-school-structure.sql`
3. ✅ Create your teachers (using CSV or manual)
4. ✅ Assign teachers to classes based on your model
5. ✅ Test teacher login and verify dashboard shows correct assignments
