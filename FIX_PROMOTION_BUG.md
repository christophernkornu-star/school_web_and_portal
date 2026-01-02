# Fix Admin Promotion Logic

## Issue Identified
The previous version of the `execute_admin_promotion_decision` function had a bug where it might fail to identify the "Next Class" correctly if the promotion record already existed but had a `NULL` value for `next_class_id`. This caused the student to remain in their current class even after being promoted.

## Fix Implemented
I have updated the function to:
1.  Explicitly fetch the `next_class_id` from the `class_progression` table (aliased as `cp_next_class_id`) to avoid ambiguity.
2.  Prioritize this value over the one stored in the `student_promotions` record.
3.  Update the `student_promotions` record with the correct `next_class_id` to ensure consistency.

## Instructions

1.  **Run the Updated Script**:
    *   Open your Supabase SQL Editor.
    *   Copy the contents of `database/create-admin-promotion-function.sql`.
    *   Run the script to recreate the function with the fix.

2.  **Retest**:
    *   Go to the Admin Portal.
    *   Try promoting the student again (you might need to toggle them to "Repeated" and then back to "Promoted" to trigger the change).
    *   Check if the student has moved to the next class.
