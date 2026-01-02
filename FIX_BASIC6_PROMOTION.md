# Fix Basic 6 to Basic 7 Promotion

## Issue Identified
The user reported that promoting a student from Basic 6 does not move them to Basic 7. This strongly suggests that the `class_progression` rule linking "Basic 6" to "Basic 7" (or "JHS 1") is missing or incorrect in the database.

## Debugging Steps
I have created a debug script `database/debug-basic6-progression.sql` to verify the IDs and existing rules.

## Fix Implemented
I have created a fix script `database/fix-basic6-progression.sql` that:
1.  Finds the exact ID for "Basic 6" (or "Primary 6").
2.  Finds the exact ID for "Basic 7" (or "JHS 1").
3.  **Deletes** any existing (potentially broken) rule for Basic 6.
4.  **Inserts** a fresh, correct rule linking Basic 6 -> Basic 7.

## Instructions

1.  **Run the Fix Script**:
    *   Open your Supabase SQL Editor.
    *   Copy the contents of `database/fix-basic6-progression.sql`.
    *   Run the script.
    *   Check the "Results" or "Messages" tab to see "Fixed progression: Basic 6 -> Basic 7".

2.  **Retest Promotion**:
    *   Go back to the Admin Portal.
    *   Promote the Basic 6 student again (toggle to Repeated then back to Promoted).
    *   They should now successfully move to Basic 7.
