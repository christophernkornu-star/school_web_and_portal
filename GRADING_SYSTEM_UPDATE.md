# Grading System Update

## Overview
The grading system has been updated to support dynamic percentages for Class Scores and Exam Scores, configurable by the Admin.

## Changes

### Database
- Added `class_score_percentage` and `exam_score_percentage` to `system_settings` table.

### Admin Portal
- Updated **General Settings** (`/admin/settings/general`) to allow configuring the percentages (e.g., 30/70, 40/60).

### Teacher Portal
1. **Upload Class Scores** (`/teacher/upload-scores/class`):
   - Fetches configured percentages.
   - Auto-calculates Class Score based on the setting (e.g., input raw score out of 100 -> converts to out of 30 or 40).
   - Validation ensures scores don't exceed 100 before conversion.

2. **Enter Scores** (`/teacher/scores`):
   - Grid/Manual Entry: 
     - Fetches configured percentages.
     - Displays dynamic max score info (e.g., "Class Score (Max 40)").
     - Validation logic updated to check against dynamic maximums.
     - Conversion formulas updated.

3. **View/Edit Scores** (`/teacher/scores/view`):
   - Fetches configured percentages.
   - Validation for editing individual scores enforces the configured limit (e.g., prevents entering 35 if max is 30).

4. **Student Reports** (`/teacher/reports/student/[id]`):
   - Table headers now dynamically display the max marks (e.g., "CLASS SCORE 40MARKS" vs "30MARKS").
   - Ensures consistency with the grading policy.

## Usage
1. Go to **Admin > Settings > General**.
2. Set "Class Score Percentage" (e.g., 30) and "Exam Score Percentage" (e.g., 70).
3. Save settings.
4. Teachers will see these limits reflected immediately when entering scores or determining grades.

## Note
- Existing scores are stored as calculated values. Changing the percentage mid-term will affect new entries and edits, but will not automatically recalculate already stored scores unless they are re-saved.
