# Class Exercises System - User Guide

## Overview
The Class Exercises system allows teachers to record individual class exercises, quizzes, and assignments throughout the term. The system automatically calculates the total class score by summing all exercises.

## Key Features

### 1. **Flexible Scoring**
- Teachers can mark exercises over **any number** (e.g., 5, 10, 20, 50, 100)
- Each exercise records:
  - Score obtained (e.g., 8)
  - Maximum score (e.g., 10)
  - Exercise name (e.g., "Quiz 1", "Assignment 2")
  - Date
  - Optional remarks

### 2. **Automatic Calculation**
The system automatically:
- Sums all exercise scores for each student
- Calculates the percentage: `(Total Obtained / Total Maximum) × 100`
- Converts to class score (max 40): `Percentage × 0.4`

### 3. **Example Calculation**

If a teacher records these exercises for a student:
- Quiz 1: 8/10
- Quiz 2: 15/20
- Assignment 1: 18/25
- Class Test: 40/50

**Automatic Calculation:**
- Total Obtained: 8 + 15 + 18 + 40 = **81**
- Total Maximum: 10 + 20 + 25 + 50 = **105**
- Percentage: (81 ÷ 105) × 100 = **77.14%**
- Class Score (Max 40): 77.14 × 0.4 = **30.86**

This 30.86 becomes the class score component for the term.

## How to Use

### Step 1: Access Class Exercises
1. Log in to the Teacher Portal
2. Click **"Class Exercises"** from the dashboard
3. Or navigate to: `/teacher/class-exercises`

### Step 2: Record an Exercise
1. **Select Filters:**
   - Choose Class
   - Choose Subject
   - Choose Student
   - Term is auto-selected (set by admin)

2. **Click "Add New Exercise"**

3. **Fill in Exercise Details:**
   - Exercise Name (e.g., "Quiz 1", "Homework 3")
   - Date (defaults to today)
   - Score Obtained (what the student got)
   - Max Score (total possible for this exercise)
   - Remarks (optional notes)

4. **Click "Save Exercise"**

### Step 3: View Student Exercises
1. Switch to **"View Exercises"** tab
2. Select class, subject, and student
3. See all recorded exercises with:
   - Individual scores and percentages
   - Total summary card showing:
     - Number of exercises
     - Combined totals
     - Overall percentage
     - Converted class score (max 40)

### Step 4: View Class Summary
1. Switch to **"Class Summary"** tab
2. Select class and subject
3. See a table of all students showing:
   - Number of exercises recorded
   - Total scores
   - Percentage
   - Class score (max 40) for each student

## Integration with Final Scores

### Current Workflow:
1. **Throughout the Term:**
   - Teachers record individual exercises in **Class Exercises** page
   - System automatically calculates running totals

2. **End of Term:**
   - Go to **Final Scores** page
   - The class score from exercises is automatically available
   - Enter only the **Exam Score** (over 100, converts to max 60)
   - System calculates: Total = Class Score (40) + Exam Score (60)

### Benefits:
- **Flexibility:** Teachers can record exercises immediately after marking
- **Any Scale:** Works with any marking scheme (5, 10, 20, 50, 100, etc.)
- **Transparency:** Students and parents can see all individual exercises
- **Accuracy:** Automatic calculation eliminates manual errors
- **Progressive Assessment:** Build up class scores throughout the term

## Database Structure

### Table: `class_exercises`
```sql
- id: UUID (primary key)
- student_id: UUID (references students)
- subject_id: UUID (references subjects)
- term_id: UUID (references terms)
- teacher_id: UUID (references teachers)
- exercise_name: VARCHAR(255)
- exercise_date: DATE
- score_obtained: DECIMAL(5,2)
- max_score: DECIMAL(5,2)
- remarks: TEXT (optional)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### Key Constraints:
- `score_obtained` must be ≥ 0
- `max_score` must be > 0
- `score_obtained` cannot exceed `max_score`
- Unique constraint on: (student_id, subject_id, term_id, exercise_name, exercise_date)

## Permissions & Security

### Row Level Security (RLS):
- **Teachers:** Can only see exercises they created
- **Students:** Can see their own exercises
- **Admins:** Can see all exercises

## Tips for Teachers

### Best Practices:
1. **Record exercises promptly** after marking
2. **Use descriptive names** (e.g., "Quiz 1 - Algebra", not just "Quiz")
3. **Be consistent** with naming across classes
4. **Review class summary** regularly to track progress
5. **Add remarks** for exercises that need attention

### Common Scenarios:

**Scenario 1: Pop Quiz (5 marks)**
- Exercise Name: "Pop Quiz - Fractions"
- Score Obtained: 4
- Max Score: 5
- Result: 80% contribution to class total

**Scenario 2: Major Assignment (50 marks)**
- Exercise Name: "Project - Solar System"
- Score Obtained: 42
- Max Score: 50
- Result: 84% contribution to class total

**Scenario 3: Multiple Small Tests**
- Test 1: 7/10 (70%)
- Test 2: 8/10 (80%)
- Test 3: 9/10 (90%)
- Combined: 24/30 (80% overall)

## Frequently Asked Questions

### Q: Can I edit or delete exercises?
**A:** Yes! In the "View Exercises" tab, each exercise has Edit and Delete buttons.

### Q: What if I record exercises on different scales?
**A:** No problem! The system calculates percentages for each exercise, then combines them proportionally based on their maximum scores.

### Q: Can I see which students haven't been assessed?
**A:** Yes! The "Class Summary" tab shows all students. Those with 0 exercises haven't been assessed yet.

### Q: How do exercises convert to the final report card?
**A:** All exercises are summed and converted to a percentage, then multiplied by 0.4 to get the class score (max 40). This is combined with the exam score (max 60) for the total (max 100).

### Q: Can I record exercises for past dates?
**A:** Yes! You can set any date when recording an exercise.

## Support

For technical issues or questions:
- Contact your school administrator
- Refer to the database setup file: `database/create-class-exercises-table.sql`
- Check the teacher dashboard for the "Class Exercises" link

---

**Document Version:** 1.0  
**Last Updated:** December 8, 2025  
**System:** School Management Portal - Class Exercises Module
