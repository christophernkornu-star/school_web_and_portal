# Student Name Formatting Analysis

The codebase shows inconsistent logic for displaying student names. Below is a list of files and the specific patterns used.

## Inconsistent Patterns Found

### Pattern A: `Last Name, First Name` (or with Middle Name)
- **File:** `app/teacher/mock/page.tsx`
  - Code: ``fullname: `${student.last_name}, ${student.middle_name ? student.middle_name + ' ' : ''}${student.first_name}` ``
  - Code: ``title={`${s.last_name}, ${s.first_name}`}``
  - Code: `{s.last_name}, {s.first_name}`

- **File:** `app/teacher/reports/student/[id]/page.tsx`
  - Code: `[student?.last_name, student?.middle_name, student?.first_name].filter(Boolean).join(', ')`

- **File:** `app/teacher/upload-scores/class/page.tsx`
  - Code: `{student.last_name}, {student.first_name} {student.middle_name}`

### Pattern B: `Last Middle First` (No Commas, space separated)
- **File:** `app/admin/reports/student/[id]/page.tsx`
  - Code: ``const studentName = `${student.last_name || ''} ${student.middle_name ? student.middle_name + ' ' : ''}${student.first_name || ''}` ``

- **File:** `app/student/report-card/page.tsx`
  - Code: ``${studentInfo?.last_name} ${studentInfo?.middle_name ? studentInfo.middle_name + ' ' : ''}${studentInfo?.first_name}``

- **File:** `app/teacher/reports/bulk/page.tsx`
  - Code: ``const studentName = `${report.student.last_name || ''} ${report.student.middle_name ? report.student.middle_name + ' ' : ''}${report.student.first_name || ''}` ``

### Pattern C: `First Name Last Name`
- **File:** `app/student/dashboard/page.tsx`
  - Code: ``Welcome back, {student ? `${student.first_name} ${student.last_name}` : 'Student'}!``

- **File:** `app/student/report-card/page.tsx` (in `<title>`)
  - Code: ``<title>Report Card - ${studentInfo?.first_name} ${studentInfo?.last_name}</title>``

- **File:** `app/teacher/upload-scores/exam/page.tsx`
  - Code: `{student.first_name} {student.last_name}`

- **File:** `app/teacher/upload-scores/class/page.tsx`
  - Code: ``validationErrors.push(`${student?.first_name} ${student?.last_name} - ${subject?.name}: Score ${addScore} exceeds limit of 10`)``

### Pattern D: `Last Name First Name` (Reverse order with no comma)
- **File:** `app/teacher/upload-scores/class/page.tsx`
  - Code: ``const fullName = `${student.last_name} ${student.first_name}` ``
  - Code: `` {report.student.profiles?.full_name || `${report.student.last_name} ${report.student.first_name}`} `` (in `app/teacher/reports/bulk/page.tsx`)

## Summary of Inconsistencies

1.  **Format**: Some use `Last, First Middle`, others `Last Middle First`, others `First Last`.
2.  **Order**: `Last Name` is prioritized in reports/lists, while `First Name` is used in dashboards/titles.
3.  **Separators**: Some use commas (`, `), others just spaces.
4.  **Middle Name Handling**: Some explicitly check checks `middle_name ? ... : ...`, others omit it, or include it in a filter array.
