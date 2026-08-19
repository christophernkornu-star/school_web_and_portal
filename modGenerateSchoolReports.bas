Option Explicit
'===================================================================================
' MODULE : modGenerateSchoolReports
' WORKBOOK: GA_CENTRAL_MUNICIPAL_DIRECTORATE.xlsm
'
' PURPOSE
'   Automatically generates a "SCHOOL PERFORMANCE & CONSOLIDATED EXAMINERS' REPORT"
'   Word document (.docx, optionally .pdf), in the same style/structure as the
'   hand-written HOLY CHILD R.C JHS report.
'
' FIX (this version) - Run-time error 13 "Type mismatch"
'   The original used  CStr(someCellValue & "")  to read text values from a
'   sheet. When a cell holds an Excel error value (#DIV/0!, #N/A, #VALUE!,
'   #REF!, ...) - possible because MASTER SHEET and EXAMINERS REPORT contain live
'   formulas - the concatenation "errorValue & """ " itself raises Error 13 before
'   CStr ever runs. All those reads now go through a SafeText() helper that returns
'   "" for error/empty/Null values. Numeric reads were already protected by
'   IsNumericSafe().
'===================================================================================
'------------------------------- CONFIG ---------------------------------------
Private Const SHEET_MASTER As String = "MASTER SHEET"
Private Const SHEET_SUMMARY As String = "SUMMARY"
Private Const SHEET_EXAM As String = "EXAMINERS REPORT"
Private Const SHEET_REPORT As String = "SCHOOL REPORT SHEET"
Private Const REPORT_SCHOOL_CELL As String = "D4"   ' the "SELECT SCHOOL:" dropdown cell
Private Const OUTPUT_FOLDER_NAME As String = "School Performance Reports"
Private Const ALSO_EXPORT_PDF As Boolean = True
' MASTER SHEET column numbers (A=1, B=2 ...) as laid out in this workbook today.
Private Const C_SCHOOL As Integer = 1
Private Const C_NAME As Integer = 2
Private Const C_MATH As Integer = 3
Private Const C_MATH_G As Integer = 4
Private Const C_SCI As Integer = 5
Private Const C_SCI_G As Integer = 6
Private Const C_SOC As Integer = 7
Private Const C_SOC_G As Integer = 8
Private Const C_ENG As Integer = 9
Private Const C_ENG_G As Integer = 10
Private Const C_RME As Integer = 11
Private Const C_RME_G As Integer = 12
Private Const C_COMP As Integer = 13
Private Const C_COMP_G As Integer = 14
Private Const C_CAD As Integer = 15
Private Const C_CAD_G As Integer = 16
Private Const C_CTEC As Integer = 17
Private Const C_CTEC_G As Integer = 18
Private Const C_FRE As Integer = 19
Private Const C_FRE_G As Integer = 20
Private Const C_TWI As Integer = 21
Private Const C_LANG_G As Integer = 22   ' GRD10 - shared grade column for Twi/Ga
Private Const C_GA As Integer = 23
Private Const C_TOT As Integer = 25
Private Const C_AGG As Integer = 27
'------------------------------- DATA TYPES -------------------------------------
Private Type StudentRec
Name As String
Agg As Long
Tot As Long
End Type
Private Type SubjectResult
SubjectName As String
PassRate As Double      ' fraction, e.g. 0.043478
AvgScore As Double      ' percentage points, e.g. 21.1
End Type
'===================================================================================
' MAIN ENTRY POINT
'===================================================================================
Public Sub GenerateAllSchoolReports()
Dim t0 As Single: t0 = Timer
Dim masterData As Variant
Dim schools As Collection
Dim schoolAverages As Object      ' Scripting.Dictionary: school -> avg agg
Dim totalSchools As Long, totalStudents As Long
Dim municipalAvg As Double
Dim outFolder As String
Dim wdApp As Object
Dim i As Long
Dim sch As Variant
Dim doneCount As Long
Dim failList As String
If Not ValidateRequiredSheets() Then Exit Sub
Application.ScreenUpdating = False
Application.StatusBar = "Reading master data..."
On Error GoTo Unexpected
If Not LoadContext(masterData, schools, schoolAverages, totalSchools, totalStudents, municipalAvg, outFolder) Then
GoTo CleanExit
End If
Set wdApp = CreateObject("Word.Application")
wdApp.Visible = False
For i = 1 To schools.Count
sch = schools(i)
Application.StatusBar = "Generating report " & i & " of " & schools.Count & ": " & sch
On Error GoTo SchoolFailed
BuildSchoolReport wdApp, masterData, schoolAverages, CStr(sch), _
totalSchools, totalStudents, municipalAvg, outFolder
doneCount = doneCount + 1
On Error GoTo Unexpected
GoTo NextSchool
SchoolFailed:
failList = failList & "  - " & sch & " (error " & Err.Number & ": " & Err.Description & ")" & vbCrLf
On Error GoTo Unexpected
Resume NextSchool
NextSchool:
Next i
wdApp.Quit
Set wdApp = Nothing
Dim summary As String
summary = doneCount & " of " & schools.Count & " school report(s) generated in:" & vbCrLf & outFolder & _
vbCrLf & vbCrLf & "Time taken: " & Format(Timer - t0, "0.0") & "s"
If Len(failList) > 0 Then
summary = summary & vbCrLf & vbCrLf & "The following school(s) failed and were skipped:" & _
vbCrLf & failList
MsgBox summary, vbExclamation
Else
MsgBox summary, vbInformation
End If
CleanExit:
Application.StatusBar = False
Application.ScreenUpdating = True
Exit Sub
Unexpected:
Dim errNum As Long, errDesc As String
errNum = Err.Number: errDesc = Err.Description
On Error Resume Next
If Not wdApp Is Nothing Then wdApp.Quit
On Error GoTo 0
MsgBox "GenerateAllSchoolReports stopped because of an unexpected error:" & vbCrLf & vbCrLf & _
"Error " & errNum & ": " & errDesc & vbCrLf & vbCrLf & _
"No further reports will be generated. Please share this exact message so the " & _
"cause can be tracked down.", vbCritical, "Unexpected error"
Resume CleanExit
End Sub
'===================================================================================
Public Sub GenerateCurrentSchoolReport()
'===================================================================================
Dim t0 As Single: t0 = Timer
Dim masterData As Variant
Dim schools As Collection
Dim schoolAverages As Object
Dim totalSchools As Long, totalStudents As Long
Dim municipalAvg As Double
Dim outFolder As String
Dim wdApp As Object
Dim school As String
If Not ValidateRequiredSheets() Then Exit Sub
school = Trim(SafeText(ThisWorkbook.Worksheets(SHEET_REPORT).Range(REPORT_SCHOOL_CELL).Value))
If Len(school) = 0 Then
MsgBox "Please select a school in cell " & REPORT_SCHOOL_CELL & " on the '" & SHEET_REPORT & _
"' sheet first.", vbExclamation
Exit Sub
End If
Application.ScreenUpdating = False
Application.StatusBar = "Reading master data..."
On Error GoTo Unexpected
If Not LoadContext(masterData, schools, schoolAverages, totalSchools, totalStudents, municipalAvg, outFolder) Then
GoTo CleanExit
End If
If Not SchoolExists(schools, school) Then
MsgBox "'" & school & "' was not found in '" & SHEET_MASTER & "'. Aborting.", vbExclamation
GoTo CleanExit
End If
Set wdApp = CreateObject("Word.Application")
wdApp.Visible = False
Application.StatusBar = "Generating report for " & school & "..."
BuildSchoolReport wdApp, masterData, schoolAverages, school, _
totalSchools, totalStudents, municipalAvg, outFolder
wdApp.Quit
Set wdApp = Nothing
MsgBox "Report generated for " & school & ":" & vbCrLf & outFolder & _
vbCrLf & vbCrLf & "Time taken: " & Format(Timer - t0, "0.0") & "s", vbInformation
CleanExit:
Application.StatusBar = False
Application.ScreenUpdating = True
Exit Sub
Unexpected:
Dim errNum As Long, errDesc As String
errNum = Err.Number: errDesc = Err.Description
On Error Resume Next
If Not wdApp Is Nothing Then wdApp.Quit
On Error GoTo 0
MsgBox "GenerateCurrentSchoolReport stopped because of an unexpected error while " & _
"generating the report for '" & school & "':" & vbCrLf & vbCrLf & _
"Error " & errNum & ": " & errDesc & vbCrLf & vbCrLf & _
"Please share this exact message so the cause can be tracked down.", _
vbCritical, "Unexpected error"
Resume CleanExit
End Sub
'------------------------------------------------------------------
Private Function LoadContext(ByRef masterData As Variant, ByRef schools As Collection, ByRef schoolAverages As Object, _
ByRef totalSchools As Long, ByRef totalStudents As Long, ByRef municipalAvg As Double, _
ByRef outFolder As String) As Boolean
masterData = ReadMasterData()
If IsEmpty(masterData) Then
MsgBox "Could not find any data in '" & SHEET_MASTER & "'. Aborting.", vbExclamation
LoadContext = False
Exit Function
End If
Set schools = GetUniqueSchools(masterData)
Set schoolAverages = BuildSchoolAverages(masterData, schools)
totalSchools = schools.Count
totalStudents = UBound(masterData, 1) - 1   ' minus header row
municipalAvg = WeightedMunicipalAverage(masterData)
outFolder = GetOutputFolder()
If Len(outFolder) = 0 Then
LoadContext = False
Exit Function
End If
LoadContext = True
End Function
'------------------------------------------------------------------
Private Function GetOutputFolder() As String
Dim base As String
Dim candidate As String
base = SafeText(ThisWorkbook.Path)
If Len(base) = 0 Or LCase(Left(base, 4)) = "http" Then
base = Environ$("USERPROFILE") & Application.PathSeparator & "Documents"
If Dir(base, vbDirectory) = "" Then
MsgBox "This workbook has not been saved to a local folder (or was opened " & _
"directly from OneDrive/SharePoint online), so reports cannot be saved " & _
"next to it." & vbCrLf & vbCrLf & _
"Please use File > Save As to save a local copy of this workbook first, " & _
"then run this again.", vbExclamation, "Cannot determine output folder"
GetOutputFolder = ""
Exit Function
End If
End If
candidate = base & Application.PathSeparator & OUTPUT_FOLDER_NAME
On Error GoTo MkDirFailed
If Dir(candidate, vbDirectory) = "" Then MkDir candidate
On Error GoTo 0
GetOutputFolder = candidate
Exit Function
MkDirFailed:
MsgBox "Could not create the output folder:" & vbCrLf & candidate & vbCrLf & vbCrLf & _
"VBA error " & Err.Number & ": " & Err.Description & vbCrLf & vbCrLf & _
"This can happen if the folder path is on a OneDrive/SharePoint location that " & _
"isn't fully synced, or if you don't have write permission there.", _
vbExclamation, "Cannot create output folder"
GetOutputFolder = ""
End Function
'------------------------------------------------------------------
Private Function ValidateRequiredSheets() As Boolean
' NOTE: declared As Variant, not As String(). Assigning the result of Array()
' (which returns a Variant, not a String() array) to a typed String() dynamic
' array can raise Runtime error 13 (Type mismatch) on some Excel builds.
Dim required As Variant
required = Array(SHEET_MASTER, SHEET_REPORT, SHEET_EXAM)
Dim missing As String
Dim i As Long
For i = LBound(required) To UBound(required)
If Not SheetExists(required(i)) Then
missing = missing & "  - " & required(i) & vbCrLf
End If
Next i
If Len(missing) > 0 Then
Dim actualNames As String
Dim ws As Worksheet
For Each ws In ThisWorkbook.Worksheets
actualNames = actualNames & "  - " & ws.Name & vbCrLf
Next ws
MsgBox "This macro expects the following sheet(s), which could not be found " & _
"(exact name match required):" & vbCrLf & vbCrLf & missing & vbCrLf & _
"Sheets actually in this workbook:" & vbCrLf & vbCrLf & actualNames & vbCrLf & _
"Either rename the sheet(s) to match, or update the SHEET_MASTER / " & _
"SHEET_REPORT / SHEET_EXAM constants near the top of this module.", _
vbExclamation, "Required sheet not found"
ValidateRequiredSheets = False
Exit Function
End If
ValidateRequiredSheets = True
End Function
Private Function SheetExists(ByVal sheetName As String) As Boolean
Dim ws As Worksheet
On Error Resume Next
Set ws = ThisWorkbook.Worksheets(sheetName)
On Error GoTo 0
SheetExists = Not ws Is Nothing
End Function
Private Function SchoolExists(schools As Collection, school As String) As Boolean
Dim s As Variant
For Each s In schools
If StrComp(CStr(s), school, vbTextCompare) = 0 Then
SchoolExists = True
Exit Function
End If
Next s
End Function
'===================================================================================
' DATA READING / AGGREGATION HELPERS
'===================================================================================
Private Function ReadMasterData() As Variant
Dim ws As Worksheet
Dim lastRow As Long, lastCol As Long
On Error GoTo Fail
Set ws = ThisWorkbook.Worksheets(SHEET_MASTER)
lastRow = ws.Cells(ws.Rows.Count, C_SCHOOL).End(xlUp).Row
lastCol = ws.Cells(1, ws.Columns.Count).End(xlToLeft).Column
If lastRow < 2 Then Exit Function
If lastCol < C_AGG Then
MsgBox "'" & SHEET_MASTER & "' only has data out to column " & lastCol & _
", but this macro expects data out to column " & C_AGG & " (the AGG column)." & _
vbCrLf & vbCrLf & "Check that no columns were deleted/moved, or update the " & _
"column constants (C_SCHOOL, C_NAME, ... C_AGG) near the top of this module " & _
"to match the sheet's current layout.", vbExclamation, "Column mismatch in " & SHEET_MASTER
ReadMasterData = Empty
Exit Function
End If
ReadMasterData = ws.Range(ws.Cells(1, 1), ws.Cells(lastRow, lastCol)).Value2
Exit Function
Fail:
ReadMasterData = Empty
End Function
' Returns a Collection of unique, non-blank school names, in first-seen order.
Private Function GetUniqueSchools(masterData As Variant) As Collection
Dim seen As Object: Set seen = CreateObject("Scripting.Dictionary")
Dim result As Collection
Set result = New Collection
Dim r As Long, s As String
For r = 2 To UBound(masterData, 1)
s = Trim(SafeText(masterData(r, C_SCHOOL)))
If Len(s) > 0 Then
If Not seen.Exists(s) Then
seen.Add s, True
result.Add s
End If
End If
Next r
Set GetUniqueSchools = result
End Function
' Dictionary of school name -> average aggregate (unrounded), used for ranking.
Private Function BuildSchoolAverages(masterData As Variant, schools As Collection) As Object
Dim dict As Object: Set dict = CreateObject("Scripting.Dictionary")
Dim sch As Variant
For Each sch In schools
dict(CStr(sch)) = AvgAggForSchool(masterData, CStr(sch))
Next sch
Set BuildSchoolAverages = dict
End Function
Private Function AvgAggForSchool(masterData As Variant, school As String) As Double
Dim r As Long, n As Long, total As Double
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
If IsNumericSafe(masterData(r, C_AGG)) Then
total = total + masterData(r, C_AGG)
n = n + 1
End If
End If
Next r
If n > 0 Then AvgAggForSchool = total / n
End Function
Private Function WeightedMunicipalAverage(masterData As Variant) As Double
Dim r As Long, n As Long, total As Double
For r = 2 To UBound(masterData, 1)
If IsNumericSafe(masterData(r, C_AGG)) Then
total = total + masterData(r, C_AGG)
n = n + 1
End If
Next r
If n > 0 Then WeightedMunicipalAverage = total / n
End Function
Private Function SchoolRank(schoolAverages As Object, school As String) As Long
Dim k As Variant, myAvg As Double, rank As Long
myAvg = schoolAverages(school)
rank = 1
For Each k In schoolAverages.Keys
If schoolAverages(k) < myAvg Then rank = rank + 1
Next k
SchoolRank = rank
End Function
Private Function SameSchool(cellVal As Variant, school As String) As Boolean
SameSchool = (StrComp(Trim(SafeText(cellVal)), school, vbTextCompare) = 0)
End Function
Private Function CountStudents(masterData As Variant, school As String) As Long
Dim r As Long, n As Long
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then n = n + 1
Next r
CountStudents = n
End Function
' Best student text in the form "Name (Agg: N)" - lowest AGG, ties broken by highest TOT.
Private Function BestStudentText(masterData As Variant, school As String) As String
Dim r As Long
Dim bestAgg As Long: bestAgg = 9999
Dim bestTot As Long: bestTot = -1
Dim bestName As String
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
If IsNumericSafe(masterData(r, C_AGG)) And IsNumericSafe(masterData(r, C_TOT)) Then
Dim a As Long, t As Long
a = masterData(r, C_AGG): t = masterData(r, C_TOT)
If a > 0 And (a < bestAgg Or (a = bestAgg And t > bestTot)) Then
bestAgg = a: bestTot = t: bestName = Trim(SafeText(masterData(r, C_NAME)))
End If
End If
End If
Next r
If Len(bestName) > 0 Then
BestStudentText = bestName & " (Agg: " & bestAgg & ")"
Else
BestStudentText = "N/A"
End If
End Function
' Achievement gap = (highest AGG at the school) - (lowest positive AGG at the school)
Private Function AchievementGap(masterData As Variant, school As String) As Long
Dim r As Long
Dim maxAgg As Long: maxAgg = -1
Dim minAgg As Long: minAgg = 9999
Dim found As Boolean
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
If IsNumericSafe(masterData(r, C_AGG)) Then
Dim a As Long: a = masterData(r, C_AGG)
If a > maxAgg Then maxAgg = a
If a > 0 And a < minAgg Then minAgg = a: found = True
End If
End If
Next r
If found And maxAgg >= 0 Then AchievementGap = maxAgg - minAgg
End Function
' Count of students in a school whose AGG falls within [lowInclusive, highInclusive].
Private Function BandCount(masterData As Variant, school As String, lowInclusive As Long, highInclusive As Long) As Long
Dim r As Long, n As Long
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
If IsNumericSafe(masterData(r, C_AGG)) Then
Dim a As Long: a = masterData(r, C_AGG)
If lowInclusive = -1 Then
If a > 0 And a <= highInclusive Then n = n + 1
Else
If a >= lowInclusive And a <= highInclusive Then n = n + 1
End If
End If
End If
Next r
BandCount = n
End Function
' Pass rate + average raw score for one subject.
Private Function GetSubjectResult(masterData As Variant, school As String, subjectName As String, _
rawCol As Integer, gradeCol As Integer, passThreshold As Integer) As SubjectResult
Dim r As Long, n As Long, passN As Long
Dim scoreTotal As Double, scoreN As Long
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
n = n + 1
If IsNumericSafe(masterData(r, gradeCol)) Then
If masterData(r, gradeCol) <= passThreshold Then passN = passN + 1
End If
If rawCol > 0 Then
If IsNumericSafe(masterData(r, rawCol)) Then
scoreTotal = scoreTotal + masterData(r, rawCol)
scoreN = scoreN + 1
End If
End If
End If
Next r
Dim res As SubjectResult
res.SubjectName = subjectName
If n > 0 Then res.PassRate = passN / n
If scoreN > 0 Then res.AvgScore = scoreTotal / scoreN
GetSubjectResult = res
End Function
' Special case: Ghanaian Language raw score lives in EITHER the Twi column OR the
' Ga column for a given student (never both) - so average across whichever is filled.
Private Function GetLanguageResult(masterData As Variant, school As String) As SubjectResult
Dim r As Long, n As Long, passN As Long
Dim scoreTotal As Double, scoreN As Long
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
n = n + 1
If IsNumericSafe(masterData(r, C_LANG_G)) Then
If masterData(r, C_LANG_G) <= 7 Then passN = passN + 1
End If
If IsNumericSafe(masterData(r, C_TWI)) Then
scoreTotal = scoreTotal + masterData(r, C_TWI): scoreN = scoreN + 1
ElseIf IsNumericSafe(masterData(r, C_GA)) Then
scoreTotal = scoreTotal + masterData(r, C_GA): scoreN = scoreN + 1
End If
End If
Next r
Dim res As SubjectResult
res.SubjectName = "GHANAIAN LANGUAGE (TWI/GA)"
If n > 0 Then res.PassRate = passN / n
If scoreN > 0 Then res.AvgScore = scoreTotal / scoreN
GetLanguageResult = res
End Function
Private Function CoreSubjects(masterData As Variant, school As String) As SubjectResult()
Dim res(0 To 3) As SubjectResult
res(0) = GetSubjectResult(masterData, school, "MATHEMATICS", C_MATH, C_MATH_G, 7)
res(1) = GetSubjectResult(masterData, school, "SCIENCE", C_SCI, C_SCI_G, 7)
res(2) = GetSubjectResult(masterData, school, "SOCIAL STUDIES", C_SOC, C_SOC_G, 7)
res(3) = GetSubjectResult(masterData, school, "ENGLISH LANGUAGE", C_ENG, C_ENG_G, 8)
CoreSubjects = res
End Function
Private Function ElectiveSubjects(masterData As Variant, school As String) As SubjectResult()
Dim res(0 To 5) As SubjectResult
res(0) = GetSubjectResult(masterData, school, "RELIGIOUS AND MORAL EDUCATION", C_RME, C_RME_G, 7)
res(1) = GetSubjectResult(masterData, school, "COMPUTING", C_COMP, C_COMP_G, 7)
res(2) = GetSubjectResult(masterData, school, "CREATIVE ARTS AND DESIGN", C_CAD, C_CAD_G, 7)
res(3) = GetSubjectResult(masterData, school, "CAREER TECHNOLOGY", C_CTEC, C_CTEC_G, 7)
res(4) = GetSubjectResult(masterData, school, "FRENCH", C_FRE, C_FRE_G, 7)
res(5) = GetLanguageResult(masterData, school)
ElectiveSubjects = res
End Function
Private Function StudentComesBefore(a As StudentRec, b As StudentRec, forTop As Boolean) As Boolean
If forTop Then
If a.Agg <> b.Agg Then
StudentComesBefore = (a.Agg < b.Agg)
Else
StudentComesBefore = (a.Tot > b.Tot)
End If
Else
If a.Agg <> b.Agg Then
StudentComesBefore = (a.Agg > b.Agg)
Else
StudentComesBefore = (a.Tot < b.Tot)
End If
End If
End Function
' Top or bottom N students for a school. forTop:=True -> lowest AGG first.
Private Function GetRankedStudents(masterData As Variant, school As String, nPop As Integer, forTop As Boolean) As StudentRec()
Dim r As Long, cnt As Long
Dim all() As StudentRec
ReDim all(1 To CountStudents(masterData, school))
For r = 2 To UBound(masterData, 1)
If SameSchool(masterData(r, C_SCHOOL), school) Then
cnt = cnt + 1
all(cnt).Name = Trim(SafeText(masterData(r, C_NAME)))
If IsNumericSafe(masterData(r, C_AGG)) Then all(cnt).Agg = masterData(r, C_AGG)
If IsNumericSafe(masterData(r, C_TOT)) Then all(cnt).Tot = masterData(r, C_TOT)
End If
Next r
Dim i As Long, j As Long, tmp As StudentRec
For i = 2 To cnt
tmp = all(i)
j = i - 1
Do While j >= 1 And StudentComesBefore(tmp, all(j), forTop)
all(j + 1) = all(j)
j = j - 1
Loop
all(j + 1) = tmp
Next i
Dim outN As Integer: outN = IIf(cnt < nPop, cnt, nPop)
Dim result() As StudentRec
If outN > 0 Then
ReDim result(1 To outN)
For i = 1 To outN
result(i) = all(i)
Next i
End If
GetRankedStudents = result
End Function
'===================================================================================
' WORD REPORT BUILDER (SECTION ONE = dynamic, SECTION TWO = fixed/shared)
'===================================================================================
Private Sub BuildSchoolReport(wdApp As Object, masterData As Variant, schoolAverages As Object, _
school As String, totalSchools As Long, totalStudents As Long, _
municipalAvg As Double, outFolder As String)
Dim wdDoc As Object, rng As Object
Set wdDoc = wdApp.Documents.Add
Dim n As Long: n = CountStudents(masterData, school)
Dim avgAgg As Double: avgAgg = Round(schoolAverages(school), 1)
Dim rank As Long: rank = SchoolRank(schoolAverages, school)
Dim bestText As String: bestText = BestStudentText(masterData, school)
Dim gap As Long: gap = AchievementGap(masterData, school)
Dim distN As Long: distN = BandCount(masterData, school, -1, 15)
Dim credN As Long: credN = BandCount(masterData, school, 16, 24)
Dim passN As Long: passN = BandCount(masterData, school, 25, 30)
Dim needN As Long: needN = BandCount(masterData, school, 31, 999)
Dim core() As SubjectResult: core = CoreSubjects(masterData, school)
Dim elective() As SubjectResult: elective = ElectiveSubjects(masterData, school)
Dim top5() As StudentRec: top5 = GetRankedStudents(masterData, school, 5, True)
Dim bottom5() As StudentRec: bottom5 = GetRankedStudents(masterData, school, 5, False)
Set rng = wdDoc.Content
AddParagraph rng, "GA CENTRAL MUNICIPAL EDUCATION DIRECTORATE", "Title", True
AddParagraph rng, "SCHOOL PERFORMANCE & CONSOLIDATED EXAMINERS' REPORT — BASIC 8", "Heading 1", True
AddParagraph rng, "Basic 8 End of Term 3 Mock Examination", "Subtitle", True
AddParagraph rng, school, "Heading 2", True
' ---- SECTION ONE ----
AddParagraph rng, "SECTION ONE — SCHOOL PERFORMANCE REPORT", "Heading 1"
AddParagraph rng, "This report presents a comprehensive, data-driven review of the Basic 8 mock " & _
"examination performance of " & school & ", prepared by the GA CENTRAL MUNICIPAL EDUCATION " & _
"DIRECTORATE on the basis of the consolidated results and subject examiners' findings held on " & _
"record. It combines a statistical analysis of candidate performance with the qualitative " & _
"observations of the subject examiners, and closes with recommendations intended to guide " & _
"school authorities, teachers and other stakeholders in preparing candidates for the Basic " & _
"Education Certificate Examination (BECE).", "Normal", 0
AddParagraph rng, "1.1  Performance Snapshot", "Heading 2"
Dim standing As String
If avgAgg < municipalAvg Then
standing = "performing above the municipal average"
ElseIf avgAgg > municipalAvg Then
standing = "performing below the municipal average"
Else
standing = "performing exactly in line with the municipal average"
End If
Dim spreadWord As String
spreadWord = IIf(gap >= 30, "very wide", IIf(gap >= 15, "wide", "moderate"))
AddParagraph rng, school & " presented " & n & " candidates for the Basic 8 mock examination, " & _
"recording an average aggregate of " & Format(avgAgg, "0.0") & ". This places the school " & _
Ordinal(rank) & " of " & totalSchools & " schools in the GA CENTRAL MUNICIPAL EDUCATION " & _
"DIRECTORATE on average aggregate, against a municipal average aggregate of " & _
Format(municipalAvg, "0.0") & " across " & totalStudents & " candidates directorate-wide — " & _
"meaning the school is " & standing & " (a lower aggregate reflects stronger performance under " & _
"the Ghanaian grading scale, where 6 is the best attainable aggregate). The best-performing " & _
"candidate at the school was " & bestText & ", with an achievement gap of " & gap & " aggregate " & _
"points separating the top candidate from the weakest candidate — an indication of the " & _
spreadWord & " spread in preparedness within the cohort.", "Normal", 0
AddParagraph rng, "1.2  Performance Banding", "Heading 2"
AddParagraph rng, BuildBandingNarrative(n, distN, credN, passN, needN), "Normal"
AddParagraph rng, "1.3  Core Subjects — Pass Rate & Average Score", "Heading 2"
AddParagraph rng, BuildSubjectNarrative(core, True), "Normal"
AddParagraph rng, "1.4  Elective Subjects — Pass Rate & Average Score", "Heading 2"
AddParagraph rng, BuildSubjectNarrative(elective, False), "Normal"
AddParagraph rng, "1.5  Top 5 Performing Candidates", "Heading 2"
AddStudentTable wdDoc, rng, top5
AddParagraph rng, "1.6  Candidates Requiring Urgent Intervention (Bottom 5)", "Heading 2"
AddStudentTable wdDoc, rng, bottom5
AddParagraph rng, "1.7  Overall Commentary & Recommendations", "Heading 2"
AddParagraph rng, BuildOverallCommentary(school, rank, totalSchools, needN, n, core, elective), "Normal"
AddParagraph rng, "School-Level Recommendations", "Heading 3"
AddBulletList rng, BuildRecommendations(core, elective)
' ---- SECTION TWO (identical for every school - pulled from EXAMINERS REPORT sheet) ----
rng.InsertBreak 7   ' wdPageBreak
rng.Collapse 0
AppendExaminersReport rng
' ---- SAVE ----
Dim safeName As String: safeName = SanitizeFileName(school)
Dim docPath As String: docPath = outFolder & Application.PathSeparator & safeName & " Performance Report.docx"
Dim pdfPath As String: pdfPath = outFolder & Application.PathSeparator & safeName & " Performance Report.pdf"
On Error GoTo SaveFailed
wdDoc.SaveAs2 fileName:=docPath, FileFormat:=16   ' wdFormatXMLDocument (.docx)
If ALSO_EXPORT_PDF Then
wdDoc.ExportAsFixedFormat OutputFileName:=pdfPath, ExportFormat:=17   ' wdExportFormatPDF
End If
On Error GoTo 0
wdDoc.Close SaveChanges:=False
Exit Sub
SaveFailed:
Dim errNum As Long, errDesc As String
errNum = Err.Number: errDesc = Err.Description
On Error Resume Next
wdDoc.Close SaveChanges:=False
On Error GoTo 0
MsgBox "Could not save the report for '" & school & "'." & vbCrLf & vbCrLf & _
"VBA error " & errNum & ": " & errDesc & vbCrLf & vbCrLf & _
"Target path:" & vbCrLf & docPath & vbCrLf & vbCrLf & _
"This is usually caused by a file path that's too long, a file that's currently " & _
"open elsewhere, or a school name containing characters Windows won't allow in a " & _
"file name.", vbExclamation, "Report save failed"
End Sub
'===================================================================================
' NARRATIVE BUILDERS
'===================================================================================
Private Function BuildBandingNarrative(n As Long, distN As Long, credN As Long, passN As Long, needN As Long) As String
Dim s As String
s = "Of the " & n & " candidates, " & needN & " (" & Format(SafeDiv(needN, n), "0.0%") & _
") currently fall into the 'Need Intervention' band (aggregate 31 and above), while " & _
passN & " (" & Format(SafeDiv(passN, n), "0.0%") & ") achieved a 'Pass' aggregate (25-30)"
If credN > 0 Then s = s & ", " & credN & " (" & Format(SafeDiv(credN, n), "0.0%") & ") reached the 'Credit' band"
If distN > 0 Then s = s & ", and " & distN & " (" & Format(SafeDiv(distN, n), "0.0%") & ") achieved 'Distinction'"
s = s & "."
Dim needPct As Double: needPct = SafeDiv(needN, n)
If credN = 0 And distN = 0 Then
s = s & " No candidate currently sits within the Distinction or Credit bands."
End If
If needPct >= 0.7 Then
s = s & " This banding profile signals that, while a segment of candidates is within reach of a " & _
"Pass aggregate with targeted support, the large majority of the cohort requires structured " & _
"remediation across the core subjects before the actual BECE if the school's overall aggregate " & _
"standing is to improve."
ElseIf needPct >= 0.3 Then
s = s & " This banding profile signals a cohort with a sizeable share of candidates still needing " & _
"structured intervention, alongside a meaningful group within reach of Pass or better with " & _
"continued support ahead of the BECE."
Else
s = s & " This banding profile signals a cohort that is, on the whole, comparatively well " & _
"prepared, with the remaining candidates in the 'Need Intervention' band being a smaller, " & _
"identifiable group who should be prioritised for targeted support."
End If
BuildBandingNarrative = s
End Function
Private Function BuildSubjectNarrative(subjects() As SubjectResult, isCore As Boolean) As String
Dim i As Long, s As String
Dim parts As String
For i = LBound(subjects) To UBound(subjects)
If i > LBound(subjects) Then parts = parts & "; "
parts = parts & ProperCaseSubject(subjects(i).SubjectName) & " recorded a pass rate of " & _
Format(subjects(i).PassRate, "0.0%") & " (average score " & Format(subjects(i).AvgScore, "0.0") & "%)"
Next i
Dim worstIdx As Long, bestIdx As Long
worstIdx = LBound(subjects): bestIdx = LBound(subjects)
For i = LBound(subjects) To UBound(subjects)
If subjects(i).PassRate < subjects(worstIdx).PassRate Then worstIdx = i
If subjects(i).PassRate > subjects(bestIdx).PassRate Then bestIdx = i
Next i
If isCore Then
s = "Performance across the four core subjects is uneven. " & parts & ". " & _
ProperCaseSubject(subjects(worstIdx).SubjectName) & " stands out as the area of gravest " & _
"concern, with a pass rate of " & Format(subjects(worstIdx).PassRate, "0.0%") & _
" — in line with the pattern flagged directorate-wide in the subject examiner's findings " & _
"in Section Two of this report. " & ProperCaseSubject(subjects(bestIdx).SubjectName) & _
" is the school's strongest core subject at " & Format(subjects(bestIdx).PassRate, "0.0%") & _
", and should be leveraged as a model for the study habits and instructional approaches " & _
"applied to the weaker subjects."
Else
s = "Elective subject pass rates are recorded as follows: " & parts & ". " & _
ProperCaseSubject(subjects(bestIdx).SubjectName) & " is the school's best-performing " & _
"elective subject, while " & ProperCaseSubject(subjects(worstIdx).SubjectName) & _
" remains the area requiring closest attention, mirroring the weaknesses flagged in the " & _
"consolidated examiners' report for that subject directorate-wide."
End If
BuildSubjectNarrative = s
End Function
Private Function BuildOverallCommentary(school As String, rank As Long, totalSchools As Long, needN As Long, _
n As Long, core() As SubjectResult, elective() As SubjectResult) As String
Dim s As String
Dim standing As String
standing = IIf(rank <= totalSchools \ 3, "a school that is competitive within the GA CENTRAL " & _
"MUNICIPAL EDUCATION DIRECTORATE", "a school that, while trailing a number of its peers within " & _
"the GA CENTRAL MUNICIPAL EDUCATION DIRECTORATE, has clearly identifiable areas for improvement")
Dim worstName As String, worstRate As Double
worstRate = 2
Dim i As Long
For i = LBound(core) To UBound(core)
If core(i).PassRate < worstRate Then worstRate = core(i).PassRate: worstName = core(i).SubjectName
Next i
For i = LBound(elective) To UBound(elective)
If elective(i).PassRate < worstRate Then worstRate = elective(i).PassRate: worstName = elective(i).SubjectName
Next i
s = "Taken together, the results show " & standing & " — ranking " & Ordinal(rank) & " of " & _
totalSchools & " schools on average aggregate — but whose candidates remain, on the whole, some " & _
"distance from the aggregate bands (Distinction and Credit) that maximise placement options at " & _
"the BECE. The single most urgent priority is " & ProperCaseSubject(worstName) & ", where a " & _
Format(worstRate, "0.0%") & " pass rate places a significant share of the cohort at risk. "
s = s & "The performance banding also shows that " & _
IIf(needN / n >= 0.5, "the school's challenge is concentrated at the bottom of the cohort: a " & _
"determined push to move candidates out of the 'Need Intervention' band and into 'Pass' or " & _
"better would meaningfully improve the school's average aggregate and municipal ranking " & _
"ahead of the BECE.", "a smaller group of candidates still sits in the 'Need Intervention' " & _
"band: targeted, individual support for this group would consolidate the school's already " & _
"reasonable standing ahead of the BECE.")
BuildOverallCommentary = s
End Function
Private Function BuildRecommendations(core() As SubjectResult, elective() As SubjectResult) As Collection
Dim recs As Collection
Set recs = New Collection
Dim worstCoreName As String, worstCoreRate As Double: worstCoreRate = 2
Dim worstElecName As String, worstElecRate As Double: worstElecRate = 2
Dim strongName As String, strongRate As Double: strongRate = -1
Dim i As Long
For i = LBound(core) To UBound(core)
If core(i).PassRate < worstCoreRate Then worstCoreRate = core(i).PassRate: worstCoreName = core(i).SubjectName
If core(i).PassRate > strongRate Then strongRate = core(i).PassRate: strongName = core(i).SubjectName
Next i
For i = LBound(elective) To UBound(elective)
If elective(i).PassRate < worstElecRate Then worstElecRate = elective(i).PassRate: worstElecName = elective(i).SubjectName
Next i
recs.Add "Institute daily, structured remediation sessions in " & ProperCaseSubject(worstCoreName) & _
" — the core subject with the lowest pass rate at this school."
recs.Add "Pair the bottom-5 candidates identified in this report with dedicated subject teachers or " & _
"peer-mentors for close monitoring through to the BECE."
recs.Add "Replicate the instructional strategies behind the school's strong " & ProperCaseSubject(strongName) & _
" results in the weaker subjects."
recs.Add "Introduce weekly mock quizzes in " & ProperCaseSubject(worstElecName) & _
" to lift the pass rate in this lower-performing elective subject."
recs.Add "Track candidates currently in the 'Pass' band (aggregate 25-30) individually — they are the " & _
"closest to moving into the Credit band with focused support."
Set BuildRecommendations = recs
End Function
'===================================================================================
' SECTION TWO — pulled verbatim from the EXAMINERS REPORT sheet (same for every school)
'===================================================================================
Private Sub AppendExaminersReport(rng As Object)
Dim ws As Worksheet
Dim r As Long, lastRow As Long
Dim cellText As String
Dim lines() As String, i As Long
Dim firstBodyRow As Boolean
Set ws = ThisWorkbook.Worksheets(SHEET_EXAM)
lastRow = ws.Cells(ws.Rows.Count, "B").End(xlUp).Row
AddParagraph rng, "SECTION TWO — CONSOLIDATED EXAMINERS' REPORT", "Heading 1"
For r = 1 To lastRow
cellText = SafeText(ws.Cells(r, "B").Value)
If Len(Trim(cellText)) = 0 Then GoTo NextRow
If r = 12 Then GoTo NextRow   ' directorate header line already shown in the title block
If r = 15 Then
AddParagraph rng, cellText, "Normal"
GoTo NextRow
End If
' "1. MATHEMATICS" style subject headings (short line, starts with a digit)
If Len(cellText) < 60 And IsNumeric(Left(cellText, 1)) Then
AddParagraph rng, cellText, "Heading 2"
GoTo NextRow
End If
' Multi-line cells: first line = sub-heading (bold), remaining lines = bullets
lines = Split(cellText, Chr(10))
firstBodyRow = True
For i = LBound(lines) To UBound(lines)
Dim ln As String: ln = lines(i)
If Len(Trim(ln)) = 0 Then GoTo NextLine
If firstBodyRow Then
AddParagraph rng, ln, "Heading 3"
firstBodyRow = False
ElseIf Left(ln, 2) = ChrW(8226) & " " Then
AddBulletLine rng, Mid(ln, 3)
Else
AddBulletLine rng, ln
End If
NextLine:
Next i
NextRow:
Next r
End Sub
'===================================================================================
' LOW-LEVEL WORD HELPERS
'===================================================================================
Private Sub AddParagraph(rng As Object, text As String, styleName As String, Optional ByVal centered As Boolean = False)
rng.Collapse 0   ' 0 = wdCollapseEnd
On Error Resume Next
rng.Style = rng.Document.Styles(styleName)
On Error GoTo 0
rng.Text = text
If centered Then rng.ParagraphFormat.Alignment = 1 ' wdAlignParagraphCenter
rng.InsertParagraphAfter
rng.Collapse 0
End Sub
Private Sub AddBulletList(rng As Object, items As Collection)
Dim itm As Variant
For Each itm In items
AddBulletLine rng, CStr(itm)
Next itm
End Sub
Private Sub AddBulletLine(rng As Object, text As String)
rng.Collapse 0
On Error Resume Next
rng.Style = rng.Document.Styles("List Bullet")
On Error GoTo 0
rng.Text = text
rng.InsertParagraphAfter
rng.Collapse 0
End Sub
Private Sub AddStudentTable(wdDoc As Object, rng As Object, students() As StudentRec)
Dim tbl As Object
Dim i As Long, r As Long
If Not IsArrayPopulated(students) Then
AddParagraph rng, "No candidate data available.", "Normal"
Exit Sub
End If
rng.Collapse 0
Set tbl = wdDoc.Tables.Add(rng, UBound(students) - LBound(students) + 2, 3)
tbl.Borders.Enable = True
tbl.Cell(1, 1).Range.Text = "Rank"
tbl.Cell(1, 2).Range.Text = "Candidate Name"
tbl.Cell(1, 3).Range.Text = "Aggregate"
r = 2
For i = LBound(students) To UBound(students)
tbl.Cell(r, 1).Range.Text = CStr(i - LBound(students) + 1)
tbl.Cell(r, 2).Range.Text = students(i).Name
tbl.Cell(r, 3).Range.Text = CStr(students(i).Agg)
r = r + 1
Next i
rng.SetRange tbl.Range.End, tbl.Range.End
rng.Collapse 0
rng.InsertParagraphAfter
rng.Collapse 0
End Sub
'===================================================================================
' SMALL UTILITIES
'===================================================================================
' Returns True only if the dynamic array has actually been ReDim'd with >=1 element.
Private Function IsArrayPopulated(arr() As StudentRec) As Boolean
On Error GoTo NotPopulated
IsArrayPopulated = (UBound(arr) >= LBound(arr))
Exit Function
NotPopulated:
IsArrayPopulated = False
End Function
Private Function SafeDiv(a As Double, b As Double) As Double
If b <> 0 Then SafeDiv = a / b
End Function
' Coerces any cell value to a String WITHOUT ever throwing a "Type mismatch".
' The old pattern  CStr(cell.Value & "")  raises Error 13 the instant the cell
' holds an Excel error value (#DIV/0!, #N/A, #VALUE!, ...) because an Error
' variant cannot be concatenated with a string. Errors/empty/Null -> "" instead.
Private Function SafeText(v As Variant) As String
Select Case VarType(v)
Case vbError, vbEmpty, vbNull, vbMissing
SafeText = ""
Case Else
SafeText = CStr(v)
End Select
End Function
' IsNumeric() throws Run-time error 13 ("Type mismatch") when given a Variant/Error
' (e.g. a cell holding #DIV/0!, #N/A, #VALUE!). Use this wrapper everywhere instead
' of calling IsNumeric directly on sheet data.
Private Function IsNumericSafe(v As Variant) As Boolean
If VarType(v) = vbError Then
IsNumericSafe = False
Else
IsNumericSafe = IsNumeric(v)
End If
End Function
Private Function Ordinal(n As Long) As String
Select Case n Mod 100
Case 11, 12, 13
Ordinal = n & "th"
Case Else
Select Case n Mod 10
Case 1: Ordinal = n & "st"
Case 2: Ordinal = n & "nd"
Case 3: Ordinal = n & "rd"
Case Else: Ordinal = n & "th"
End Select
End Select
End Function
Private Function ProperCaseSubject(s As String) As String
' "MATHEMATICS" -> "Mathematics"; leaves bracketed abbreviations like (TWI/GA) alone
Dim words() As String, i As Long, w As String
words = Split(LCase(s), " ")
For i = LBound(words) To UBound(words)
w = words(i)
If Len(w) > 0 Then
If Left(w, 1) = "(" Then
words(i) = "(" & UCase(Mid(w, 2, 1)) & Mid(w, 3)
Else
words(i) = UCase(Left(w, 1)) & Mid(w, 2)
End If
End If
Next i
ProperCaseSubject = Join(words, " ")
End Function
Private Function SanitizeFileName(s As String) As String
Dim badChars As String: badChars = "\/:*?""<>|"
Dim i As Long, c As String, result As String
result = s
For i = 1 To Len(badChars)
result = Replace(result, Mid(badChars, i, 1), "-")
Next i
SanitizeFileName = Application.WorksheetFunction.Trim(result)
End Function
'===================================================================================
' OPTIONAL: adds buttons on the SUMMARY sheet next to the existing action buttons,
' and on the SCHOOL REPORT SHEET next to the "SELECT SCHOOL:" dropdown.
'===================================================================================
Public Sub AddGenerateReportsButton()
Dim ws As Worksheet, btn As Button
Set ws = ThisWorkbook.Worksheets(SHEET_SUMMARY)
On Error Resume Next
ws.Buttons("btnGenerateAllReports").Delete
On Error GoTo 0
Set btn = ws.Buttons.Add(ws.Range("K5").Left, ws.Range("K5").Top, 170, 22)
btn.Name = "btnGenerateAllReports"
btn.OnAction = "GenerateAllSchoolReports"
btn.Characters.Text = "Generate All School Reports"
End Sub
Public Sub AddGenerateCurrentReportButton()
Dim ws As Worksheet, btn As Button
Set ws = ThisWorkbook.Worksheets(SHEET_REPORT)
On Error Resume Next
ws.Buttons("btnGenerateCurrentReport").Delete
On Error GoTo 0
Set btn = ws.Buttons.Add(ws.Range("F4").Left, ws.Range("F4").Top, 190, 20)
btn.Name = "btnGenerateCurrentReport"
btn.OnAction = "GenerateCurrentSchoolReport"
btn.Characters.Text = "Generate Report for This School"
End Sub
'===================================================================================
' DIAGNOSTIC - finds WHICH stage throws Error 13. Add this sub to the SAME module,
' then press F5 with your cursor inside it. Look at the Immediate window (Ctrl+G):
' the LAST "STEP n OK" printed before the error tells you where it crashes.
'===================================================================================
Public Sub DiagnoseGenerateReports()
On Error GoTo Fail
Dim masterData As Variant
Dim schools As Collection, schoolAverages As Object
Dim totalSchools As Long, totalStudents As Long, municipalAvg As Double, outFolder As String
Application.ScreenUpdating = False
Debug.Print "STEP 1  - ValidateRequiredSheets"
If Not ValidateRequiredSheets() Then GoTo Cleanup
Debug.Print "STEP 2  - ReadMasterData"
masterData = ReadMasterData()
If IsEmpty(masterData) Then Debug.Print "(master empty)": GoTo Cleanup
Debug.Print "   info: rows=" & UBound(masterData, 1) & ", cols=" & UBound(masterData, 2)
Debug.Print "STEP 3  - GetUniqueSchools"
Set schools = GetUniqueSchools(masterData)
Debug.Print "   info: schools=" & schools.Count
Debug.Print "STEP 4  - AvgAggForSchool (first school)"
Debug.Print "   info: avgAgg=" & AvgAggForSchool(masterData, CStr(schools(1)))
Debug.Print "STEP 5  - BuildSchoolAverages + WeightedMunicipalAverage"
Set schoolAverages = BuildSchoolAverages(masterData, schools)
municipalAvg = WeightedMunicipalAverage(masterData)
Debug.Print "   info: municipalAvg=" & municipalAvg
Debug.Print "STEP 6  - GetOutputFolder"
outFolder = GetOutputFolder()
Debug.Print "   info: outFolder=" & outFolder
Debug.Print "STEP 7  - Word present? CreateObject"
Dim wdApp As Object
Set wdApp = CreateObject("Word.Application")
Debug.Print "   WORD CREATED OK - Word is installed and registered."
wdApp.Visible = False
Debug.Print "STEP 8  - BuildSchoolReport (first school, Word doc part)"
BuildSchoolReport wdApp, masterData, schoolAverages, CStr(schools(1)), _
schools.Count, UBound(masterData, 1) - 1, municipalAvg, outFolder
wdApp.Quit
Set wdApp = Nothing
Debug.Print "ALL STEPS COMPLETED OK - no error in this path."
GoTo Cleanup
Fail:
Debug.Print "!!! FAILED at error " & Err.Number & ": " & Err.Description
If Err.Number = 13 Then
Debug.Print "    It's a Type Mismatch. Report the last 'STEP n OK' printed above."
ElseIf Err.Number = 429 Then
Debug.Print "    ERROR 429 = Microsoft Word is NOT installed/registered on this PC."
ElseIf Err.Number = 9 Then
Debug.Print "    ERROR 9 = Subscript out of range - a column constant or sheet index is wrong."
ElseIf Err.Number = 1004 Then
Debug.Print "    ERROR 1004 = WorksheetFunction failed (check SanitizeFileName's Trim)."
End If
Cleanup:
On Error Resume Next
Application.ScreenUpdating = True
On Error GoTo 0
End Sub
