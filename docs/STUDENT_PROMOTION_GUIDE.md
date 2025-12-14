# Student Promotion System - Complete Guide

## Overview
The Student Promotion System manages end-of-year student promotions with automatic performance-based recommendations, class teacher decisions, and administrative execution.

## Key Features

### 1. **Automatic Performance Analysis**
- Calculates total scores across all subjects for the academic year
- Computes minimum required score: **(Total Subjects × 100) ÷ 4**
- Recommends promotion or repetition based on performance

### 2. **Class Teacher Control**
- Only class teachers can make promotion decisions
- Available only during **Third Term**
- Can override automatic recommendations
- Add remarks for each student

### 3. **Administrative Execution**
- Bulk promotion execution per class
- Class progression mapping (which class follows which)
- Complete audit trail
- Handles promotions, repetitions, and graduations

## How It Works

### Phase 1: Third Term - Class Teacher Decisions

**When:** During Third Term only  
**Who:** Class Teachers  
**Where:** `/teacher/promotions`

1. **Automatic Recommendations Generated:**
   - System analyzes each student's performance across all 3 terms
   - Calculates: Total Score, Average, Subjects Count
   - Compares against minimum requirement
   - Suggests: Promote or Repeat

2. **Teacher Reviews Recommendations:**
   - Green indicators: Meets criteria (recommend promote)
   - Red indicators: Below threshold (recommend repeat)
   - View detailed performance metrics

3. **Teacher Makes Final Decisions:**
   - Can accept automatic recommendations
   - Can override any recommendation
   - Add optional remarks for each student
   - Must decide for ALL students before submission

4. **Decisions Submitted:**
   - Stored as "pending" status
   - Awaits administrative execution
   - Cannot modify students until admin executes

### Phase 2: End of Year - Administrative Execution

**When:** Start of new academic year  
**Who:** Administrators  
**Where:** `/admin/promotions`

1. **Admin Reviews Summaries:**
   - See all classes with promotion decisions
   - View counts: Total students, Promote, Repeat
   - Check for any pending decisions

2. **Execute Promotions:**
   - Click "Execute" for each class
   - System automatically:
     - Promotes students to next class
     - Keeps repeaters in same class
     - Marks graduating students as "graduated"
     - Records complete history

3. **Results:**
   - Immediate feedback on execution
   - Error handling for any issues
   - Complete audit trail created

## Performance Calculation

### Formula:
```
Minimum Required Score = (Total Subjects × 100) ÷ 4
```

### Example Scenarios:

**Scenario 1: Student with 10 subjects**
- Total Subjects: 10
- Minimum Required: (10 × 100) ÷ 4 = **250 points**
- Student's Total: 280 points
- **Result:** Meets criteria → Recommend Promote

**Scenario 2: Student with 8 subjects**
- Total Subjects: 8
- Minimum Required: (8 × 100) ÷ 4 = **200 points**
- Student's Total: 185 points
- **Result:** Below threshold → Recommend Repeat

**Scenario 3: Manual Override**
- System recommends: Repeat (score: 195/200)
- Teacher decision: Promote (with remarks: "Showed significant improvement in Term 3")
- **Result:** Student will be promoted per teacher's decision

## Database Structure

### Main Tables:

#### 1. `student_promotions`
Stores promotion decisions for each student
```sql
- student_id: UUID
- academic_year: VARCHAR(20) -- e.g., "2024/2025"
- current_class_id: UUID
- promotion_status: 'pending' | 'promoted' | 'repeated' | 'graduated'
- next_class_id: UUID (NULL if repeated/graduated)
- total_subjects: INTEGER
- total_score: DECIMAL
- average_score: DECIMAL
- minimum_required_score: DECIMAL
- meets_promotion_criteria: BOOLEAN
- recommended_action: 'promote' | 'repeat'
- decided_by_teacher_id: UUID
- decision_date: TIMESTAMP
- teacher_remarks: TEXT
- executed_by_admin_id: UUID
- execution_date: TIMESTAMP
```

#### 2. `class_progression`
Maps which class comes after which
```sql
- current_class_id: UUID
- next_class_id: UUID (NULL if graduation)
- is_graduation: BOOLEAN
```

#### 3. `promotion_history`
Complete audit trail of all promotions
```sql
- student_id: UUID
- academic_year: VARCHAR(20)
- from_class_id: UUID
- to_class_id: UUID (NULL if repeated)
- action: 'promoted' | 'repeated' | 'graduated'
- performed_by: UUID
- performed_at: TIMESTAMP
- remarks: TEXT
```

## Class Progression Setup

### Admin Setup Required:
Before promotions can be executed, admins must configure class progressions:

**Example Progressions:**
```
Basic 1 → Basic 2
Basic 2 → Basic 3
Basic 3 → Basic 4
Basic 4 → Basic 5
Basic 5 → Basic 6
Basic 6 → Basic 7 (JHS 1)
Basic 7 → Basic 8 (JHS 2)
Basic 8 → Basic 9 (JHS 3)
Basic 9 → Graduation
```

### Setup Steps:
1. Go to `/admin/promotions`
2. Click "Class Progressions" tab
3. Click "Add Mapping"
4. Select current class
5. Select next class (or mark as graduation)
6. Save mapping

## User Workflows

### Class Teacher Workflow:

1. **Wait for Third Term**
   - System only allows access during Term 3
   - Automatic notification when available

2. **Review Class Performance**
   - Navigate to `/teacher/promotions`
   - Select your class (only classes you're class teacher for)
   - View automatic recommendations

3. **Make Decisions**
   - Review each student's performance metrics
   - Click "Promote" or "Repeat" for each student
   - Add remarks as needed (optional)
   - Ensure all students have decisions

4. **Submit Decisions**
   - Click "Submit Promotion Decisions"
   - Confirmation message displayed
   - Awaits admin execution

### Administrator Workflow:

1. **Configure Class Progressions** (One-time setup)
   - Set up which class follows which
   - Mark final year classes as graduation

2. **Monitor Pending Decisions**
   - Navigate to `/admin/promotions`
   - Review "Execute Promotions" tab
   - See summary of all classes

3. **Execute Promotions**
   - Review each class summary
   - Click "Execute" for each class
   - Confirm execution
   - Review results

4. **Check History**
   - Switch to "History" tab
   - View all promotion actions
   - Audit trail for accountability

## Key Functions

### `calculate_student_promotion_metrics(student_id, academic_year)`
Calculates performance and recommendation for one student
```sql
Returns:
- total_subjects: INTEGER
- total_score: DECIMAL
- average_score: DECIMAL
- minimum_required: DECIMAL
- meets_criteria: BOOLEAN
- recommendation: 'promote' | 'repeat'
```

### `generate_promotion_recommendations(class_id, academic_year, teacher_id)`
Generates recommendations for all students in a class
```sql
Returns table of all students with metrics
```

### `execute_class_promotion(class_id, academic_year, admin_id)`
Executes bulk promotion for a class
```sql
Returns:
- promoted_count: INTEGER
- repeated_count: INTEGER
- graduated_count: INTEGER
- errors: TEXT[]
```

## Business Rules

### 1. **Third Term Only**
- Promotion interface only accessible during Third Term
- Ensures complete academic year data available
- Other terms show informational message

### 2. **Class Teacher Authority**
- Only class teachers can make promotion decisions
- Subject teachers cannot access promotion system
- Must be assigned as class teacher in system

### 3. **All Students Must Be Decided**
- Cannot submit partial decisions
- Must decide for every student in class
- Prevents accidental omissions

### 4. **Admin Execution Required**
- Teacher decisions don't immediately move students
- Admin must execute promotions
- Allows review before final action

### 5. **Automatic Handling**
- Promotions: Student moved to next class
- Repetitions: Student stays in same class
- Graduations: Student marked as "graduated"

## Security & Permissions

### Row Level Security (RLS):

**Teachers:**
- Can view promotions for their assigned classes
- Can manage promotions only as class teacher
- Cannot see other teachers' classes

**Admins:**
- Full access to all promotions
- Can execute promotions
- Can manage class progressions
- View complete history

**Students:**
- Can view their own promotion history
- Cannot modify any data

## Reports & Analytics

### Available Reports:

1. **Class Performance Summary**
   - Total students per class
   - Promotion vs. repetition ratios
   - Average performance metrics

2. **Promotion History**
   - Complete audit trail
   - Filter by academic year
   - Student-level tracking

3. **Teacher Decision Tracking**
   - Which decisions were overrides
   - Teacher remarks analysis
   - Decision patterns

## Best Practices

### For Class Teachers:

1. **Review Performance Early**
   - Don't wait until last minute
   - Identify at-risk students early
   - Provide intervention opportunities

2. **Use Remarks Effectively**
   - Document reasons for overrides
   - Note special circumstances
   - Provide guidance for repeaters

3. **Be Objective**
   - Consider full year performance
   - Don't rely solely on final term
   - Use system recommendations as guide

### For Administrators:

1. **Set Up Progressions Early**
   - Configure before third term
   - Verify all classes mapped
   - Handle special cases (combined classes, etc.)

2. **Review Before Execution**
   - Check for anomalies
   - Verify class teacher decisions complete
   - Ensure progression mappings correct

3. **Execute Timely**
   - Execute at start of new academic year
   - Coordinate with class assignments
   - Communicate to stakeholders

## Common Scenarios

### Scenario 1: Student Repeating
```
Teacher Decision: Repeat
System Action: Student stays in Basic 3
Next Year: Student still in Basic 3 with new cohort
History: Recorded as "repeated" in promotion_history
```

### Scenario 2: Normal Promotion
```
Teacher Decision: Promote
System Action: Student moved from Basic 3 to Basic 4
Next Year: Student in Basic 4
History: Recorded as "promoted" with from/to classes
```

### Scenario 3: Graduation
```
Teacher Decision: Promote
Current Class: Basic 9 (marked as graduation class)
System Action: Student status changed to "graduated"
Next Year: Student no longer active in system
History: Recorded as "graduated"
```

### Scenario 4: Override Decision
```
System Recommendation: Repeat (score: 195/250)
Teacher Decision: Promote
Teacher Remarks: "Significant improvement in Term 3, recommend promotion with support"
System Action: Promotes student as per teacher decision
History: Records teacher override with remarks
```

## Troubleshooting

### Issue: "Promotions Not Available"
**Cause:** Not in Third Term  
**Solution:** Wait for Third Term or contact admin to set current term

### Issue: "No Classes Assigned"
**Cause:** Not assigned as class teacher  
**Solution:** Contact admin to assign as class teacher

### Issue: "Cannot Submit Decisions"
**Cause:** Not all students have decisions  
**Solution:** Review list, ensure every student has Promote or Repeat selected

### Issue: "Execution Failed"
**Cause:** Missing class progression mapping  
**Solution:** Admin must set up class progression in settings

## SQL Migration

To set up the promotion system, run:
```bash
database/create-student-promotion-system.sql
```

This creates:
- All tables (student_promotions, class_progression, promotion_history)
- All functions (calculate metrics, generate recommendations, execute promotions)
- All RLS policies
- All indexes and triggers

---

**Document Version:** 1.0  
**Last Updated:** December 8, 2025  
**System:** School Management Portal - Student Promotion Module
