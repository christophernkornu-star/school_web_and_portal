# System Performance Audit & Fixes

After a comprehensive scan of the system, I have identified three performance improvements (one major optimization and two potential bottlenecks).

## 1. Database Loop Optimization (High Impact)
**Issue:** The `calculate_and_save_term3_status` function (in `UPDATE_PROMOTIONS_LOGIC_V2.sql`) processes students one-by-one using a `FOR` loop.
**Impact:** If you have 500 students, this executes 500 individual transaction sub-blocks and 500 separate calls to the metrics calculator. This will be slow during the "End of Year" processing.
**Fix:** I have refactored this function to use a **Set-Based SQL Operation**. This processes all active students in a single optimized query, which the database engine can execution-plan much better.

## 2. Frontend Parallel Fetching (Medium Impact)
**Issue:** The Student Report Card page (`app/student/report-card/page.tsx`) fetches rank information for *every term* of the student's history in parallel (`Promise.all`).
**Impact:** A student in JHS 3 (9 terms) will fire ~9 simultaneous API requests to `/api/class-rankings` when opening the page. Each API request fetches scores for the whole class.
**Analysis:** While unrelated to the promotion logic, this creates a CPU spike on the database server when many students check results simultaneously.
**Recommendation:** This requires a larger architectural change (caching rankings), but ensuring indexes are present (see below) mitigates the impact significantly.

## 3. Missing Indexes (Medium Impact)
**Issue:** The database performs joins on `academic_terms.academic_year` and `student_promotions.academic_year` frequently, but these columns may lack dedicated indexes for sorting and filtering.
**Fix:** I will create a script `database/fix_performance_indexes.sql` to add these indexes.

---

## Action Plan
1.  **Refactor SQL Logic:** I have updated your open file `UPDATE_PROMOTIONS_LOGIC_V2.sql` to use the optimized set-based approach.
2.  **Add Indexes:** I have created a script `database/fix_performance_indexes.sql` to add the missing performance indexes.
