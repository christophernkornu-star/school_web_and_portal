# Fix Basic 7 to Basic 8 Promotion

## Issue Identified
The user reported that promoting a student from Basic 7 does not move them to Basic 8. This indicates a missing or incorrect rule in the `class_progression` table for this specific transition.

## Fix Implemented
I have created a fix script `database/fix-basic7-progression.sql` that:
1.  Finds the exact ID for "Basic 7" (checking variations like "JHS 1").
2.  Finds the exact ID for "Basic 8" (checking variations like "JHS 2").
3.  **Deletes** any existing rule for Basic 7.
4.  **Inserts** a new, correct rule linking Basic 7 -> Basic 8.

## Instructions

1.  **Run the Fix Script**:
    *   Open your Supabase SQL Editor.
    *   Copy the contents of `database/fix-basic7-progression.sql`.
    *   Run the script.
    *   Check the "Results" or "Messages" tab to see "Fixed progression: Basic 7 -> Basic 8".

2.  **Retest Promotion**:
    *   Go back to the Admin Portal.
    *   Promote the Basic 7 student again (toggle to Repeated then back to Promoted).
    *   They should now successfully move to Basic 8.
