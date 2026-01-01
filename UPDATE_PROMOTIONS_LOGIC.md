# Student Promotion Logic Update

## Changes Made

1.  **Admin Promotions Page (`app/admin/promotions/page.tsx`)**:
    *   Updated data fetching to retrieve scores from **all terms** (Term 1, Term 2, Term 3) of the current academic year, instead of just Term 3.
    *   Fixed a bug where the code was trying to select a non-existent `score` column. It now correctly selects the `total` column.
    *   Updated the table header to show "Year Avg" instead of "Term 3 Avg".
    *   The average calculation now considers all subjects across all terms.

2.  **Database Logic**:
    *   Verified that the `calculate_student_promotion_metrics` function in the database is already defined to calculate the average across the entire academic year (joining `academic_terms` and filtering by `academic_year`).

3.  **Data Migration Script**:
    *   Created `database/recalculate-promotion-metrics.sql`.
    *   This script iterates through all existing records in the `student_promotions` table and recalculates the metrics (Average Score, Total Score, etc.) using the updated logic.

## Instructions

To apply the changes fully and ensure the data is consistent:

1.  **Run the Migration Script**:
    *   Open your Supabase SQL Editor.
    *   Copy the contents of `database/recalculate-promotion-metrics.sql`.
    *   Run the script.
    *   This will update the `student_promotions` table with the correct averages for the current academic year.

2.  **Verify in Admin Panel**:
    *   Go to the Admin Dashboard -> Promotions.
    *   Check that the "Year Avg" column reflects the cumulative average.

3.  **Verify in Teacher Portal**:
    *   Go to the Teacher Portal -> Promotions.
    *   The "Average Score" displayed for students should now match the recalculated values.
