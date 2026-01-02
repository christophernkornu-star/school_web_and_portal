# Fix Admin Promotion Logic - Part 3

## Issue Identified
The student was still not moving to the next class. This is likely because the `next_class_id` was still resolving to `NULL` in some edge cases (e.g., if the `class_progression` join failed and the existing record also had `NULL`).

## Fix Implemented
I have updated the `execute_admin_promotion_decision` function in `database/create-admin-promotion-function.sql` to:
1.  **Add a Fallback Lookup:** If `v_next_class_id` is still `NULL` after the initial logic, it explicitly queries the `class_progression` table again using the `current_class_id`.
2.  **Add Error Handling:** If `v_next_class_id` is *still* `NULL` and the status is 'promoted', it now raises a clear exception: `Cannot promote student: No next class defined...`. This will prevent silent failures and help diagnose configuration issues.

## Instructions

1.  **Run the Updated Script**:
    *   Open your Supabase SQL Editor.
    *   Copy the contents of `database/create-admin-promotion-function.sql`.
    *   Run the script to recreate the function with the robust logic.

2.  **Retest**:
    *   Go to the Admin Portal.
    *   Try promoting the student again.
    *   If it works, great!
    *   If you see an error message starting with "Cannot promote student...", it means the Class Progression settings are missing for that specific class, and we'll need to fix the `class_progression` table.
