# Attendance System Implementation Guide

## Overview
The attendance system has been updated to track student attendance on a term basis rather than daily records. This allows:
- Admin sets total school days per term (e.g., 63 days)
- Teachers enter days present for each student (e.g., 56 out of 63)
- System calculates attendance rates automatically
- Statistics grouped by overall, boys, and girls

## Database Changes

### 1. New Table: `student_attendance`
```sql
CREATE TABLE student_attendance (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  class_id UUID REFERENCES classes(id),
  term_id UUID REFERENCES academic_terms(id),
  days_present INTEGER NOT NULL DEFAULT 0,
  days_absent INTEGER GENERATED (computed from total_days - days_present),
  remarks TEXT,
  recorded_by UUID REFERENCES teachers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, term_id)
)
```

### 2. Updated Table: `academic_terms`
Added column:
- `total_days INTEGER` - Total school days in the term (set by admin)

### 3. New View: `attendance_statistics`
Provides aggregated statistics including:
- Overall attendance rate
- Boys vs Girls attendance rates
- Average days present
- Total students, boys count, girls count

## Setup Instructions

### Step 1: Run Database Migration
```bash
# Option 1: Using the script
node scripts\update-attendance-system.js

# Option 2: Manual (recommended for production)
# Run the SQL file in Supabase SQL Editor:
# database/update-attendance-system.sql
```

### Step 2: Admin - Set Total Days
1. Navigate to **Admin → Settings → Attendance Settings**
2. For each academic term, enter the total number of school days
   - Example: Term 1 (2024/2025) = 63 days
3. Click "Save Changes"

### Step 3: Teachers - Record Attendance
1. Navigate to **Teacher → Mark Attendance**
2. Select your class (only class teachers can record attendance)
3. Current term is automatically selected
4. Enter days present for each student (0 to total days)
5. System shows real-time attendance percentage
6. Click "Save Attendance"

## Features

### Admin Interface (`/admin/settings/attendance`)
- View all academic terms
- Set total school days for each term
- See current term highlighted
- Instructions on how the system works

### Teacher Interface (`/teacher/attendance`)
- Select class (only classes where teacher is class teacher)
- View current term with total days
- Enter days present for each student
- Real-time statistics:
  * Total students count
  * Overall attendance rate
  * Boys attendance rate (with count)
  * Girls attendance rate (with count)
- Color-coded attendance percentages:
  * Green (90-100%): Excellent
  * Blue (75-89%): Good
  * Yellow (60-74%): Fair
  * Red (0-59%): Poor
- Save all changes at once

### Statistics Display
Each class shows:
1. **Overall Rate**: Total days present / Total possible days × 100
2. **Boys Rate**: Boys' total days present / Boys' total possible days × 100
3. **Girls Rate**: Girls' total days present / Girls' total possible days × 100

### Example Calculation
**Class: Basic 3 (Term 1 - 63 days total)**
- Total Students: 30 (15 boys, 15 girls)
- Boys present: 900 days total (60 days average per boy)
- Girls present: 920 days total (61.3 days average per girl)

**Results:**
- Boys Rate: 900 / (15 × 63) = 900 / 945 = 95.2%
- Girls Rate: 920 / (15 × 63) = 920 / 945 = 97.4%
- Overall: 1820 / (30 × 63) = 1820 / 1890 = 96.3%

## File Structure

### New Files Created
```
app/admin/settings/attendance/page.tsx    # Admin attendance settings
database/update-attendance-system.sql      # Database migration
scripts/update-attendance-system.js        # Migration script
```

### Modified Files
```
app/teacher/attendance/page.tsx            # Updated teacher interface
app/admin/settings/page.tsx               # Added link to attendance settings
```

## Usage Workflow

### Term Start (Admin)
1. Create new term in General Settings
2. Go to Attendance Settings
3. Set total school days (e.g., 63)
4. Notify teachers attendance tracking is active

### During Term (Teachers)
1. Throughout the term, track student attendance manually
2. At any time, go to Mark Attendance
3. Enter cumulative days present for each student
4. Save periodically to keep records updated
5. System shows real-time attendance rates

### Term End (Teachers/Admin)
1. Teachers finalize attendance records
2. Admin can view statistics via attendance_statistics view
3. Attendance data flows to report cards
4. Compare boys vs girls attendance trends

## Report Card Integration

The attendance will display as:
- **Attendance: 56 out of 63** (on report card)
- Percentage: 88.9%
- This data comes from `student_attendance` table

To integrate with report cards, update the report card query to:
```sql
SELECT 
  sa.days_present,
  at.total_days,
  ROUND((sa.days_present::decimal / at.total_days * 100), 1) as attendance_percentage
FROM student_attendance sa
JOIN academic_terms at ON sa.term_id = at.id
WHERE sa.student_id = $1 AND sa.term_id = $2
```

## Security

### Row Level Security (RLS)
- Students can only view their own attendance
- Teachers can only view/edit attendance for classes they're assigned as class teacher
- Admins have full access
- All policies are defined in the migration SQL

## Benefits

1. **Simplified Tracking**: No need to mark daily attendance
2. **Flexible**: Can update attendance at any time during the term
3. **Comprehensive Stats**: Automatic calculation of rates by gender
4. **Accurate**: Single source of truth per student per term
5. **Efficient**: Reduces database records (1 per student per term vs daily)

## Troubleshooting

### "No Class Teacher Assignment" Error
- Teacher must be assigned as class teacher (is_class_teacher = true)
- Check teacher_class_assignments table
- Only class teachers can record attendance

### Total Days showing 0
- Admin needs to set total_days in Attendance Settings
- Default is 0 until admin configures it

### Can't save attendance
- Check RLS policies are active
- Ensure teacher is class teacher for selected class
- Verify term_id matches current term

## Next Steps

1. ✅ Database schema updated
2. ✅ Admin interface created
3. ✅ Teacher interface created
4. ⏳ Test with real data
5. ⏳ Integrate with report card generation
6. ⏳ Add attendance reports/analytics page
7. ⏳ Add notifications for low attendance

## Support

For issues or questions:
1. Check database logs in Supabase
2. Verify RLS policies are active
3. Ensure all migrations ran successfully
4. Check browser console for error messages
