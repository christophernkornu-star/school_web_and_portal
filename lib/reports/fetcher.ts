import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ReportCardData } from './types'
import { getGradeValue, calculateAggregate, isPromotionTerm } from '@/lib/academic-utils'

// In-memory cache for system and academic settings to prevent redundant queries during bulk report generation
let cachedSettings: any = null
let cachedScoreSettings: any = null
let settingsCacheTime = 0
const SETTINGS_TTL = 1000 * 60 * 5 // 5 minutes

// Helper function to fetch data for a single student properly
// Exported so bulk reports can use it
export async function fetchReportCardData(
  studentId: string,
  termId?: string,
  options?: { restrictCurrentClassOnly?: boolean }
) {
    const supabase = getSupabaseBrowserClient()

    // 1. Fetch Student Info
    const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select(`
        id,
        student_id,
        first_name,
        middle_name,
        last_name,
        gender,
        date_of_birth,
        class_id,
        results_withheld,
        withheld_reason,
        classes (name, level),
        profiles:profile_id (full_name)
    `)
    .eq('id', studentId)
    .single()

        if (studentError) throw studentError

    // Fetch section info
    let sectionName: string | null = null
    const { data: sectionData } = await supabase
        .from('student_sections')
        .select('sections(name)')
        .eq('student_id', studentId)
        .maybeSingle()
    
    if (sectionData?.sections?.name) {
        sectionName = sectionData.sections.name
    }

    // 2. Fetch Academic Settings (With in-memory caching for bulk generation)
    if (!cachedSettings || (Date.now() - settingsCacheTime > SETTINGS_TTL)) {
        const { data: fetchedSettings } = await supabase
        .from('academic_settings')
        .select('*')
        .single()

        const { data: gradingConfig } = await supabase
            .from('system_settings')
            .select('setting_key, setting_value')
            .in('setting_key', ['class_score_percentage', 'exam_score_percentage'])

        cachedSettings = fetchedSettings
        
        let newScoreSettings = { classScorePercentage: 30, examScorePercentage: 70 } // Defaults
        if (gradingConfig) {
            const classScoreSetting = gradingConfig.find((s: any) => s.setting_key === 'class_score_percentage')
            const examScoreSetting = gradingConfig.find((s: any) => s.setting_key === 'exam_score_percentage')

            if (classScoreSetting && classScoreSetting.setting_value) {
                newScoreSettings.classScorePercentage = Number(classScoreSetting.setting_value)
            }
            if (examScoreSetting && examScoreSetting.setting_value) {
                newScoreSettings.examScorePercentage = Number(examScoreSetting.setting_value)
            }
        }
        cachedScoreSettings = newScoreSettings
        settingsCacheTime = Date.now()
    }

    const settings = cachedSettings
    const scoreSettings = cachedScoreSettings

    // 3. Fetch Grades
    const { data: grades, error: gradesError } = await supabase
    .from('scores')
    .select(`
        *,
        academic_terms (
        id,
        name,
        academic_year
        ),
        subjects (
        name
        )
    `)
    .eq('student_id', studentId)
    .order('academic_terms(academic_year)', { ascending: false })
    .order('academic_terms(name)', { ascending: false })

    if (gradesError) throw gradesError

    // 4. Fetch Remarks
    const { data: storedRemarks } = await supabase
    .from('student_remarks')
    .select('*')
    .eq('student_id', studentId)

    // Group grades by term
    const termGroups: { [key: string]: ReportCardData } = {}

    grades?.forEach((grade: any) => {
        const tId = grade.term_id
        const termName = grade.academic_terms?.name || 'Unknown Term'
        const year = grade.academic_terms?.academic_year || 'N/A'

        if (!termGroups[tId]) {
            termGroups[tId] = {
            termId: tId,
            termName,
            year,
            grades: [],
            totalScore: 0,
            averageScore: 0,
            position: null,
            totalClassSize: null,
            remarks: {} 
            }
        }

        termGroups[tId].grades.push({
            id: grade.id,
            subject_name: grade.subjects?.name || 'Unknown Subject',
            class_score: grade.class_score,
            exam_score: grade.exam_score,
            total: grade.total,
            grade: grade.total !== null ? getGradeValue(grade.total).toString() : '-',
            remarks: grade.remarks,
            term_id: grade.term_id,
            rank: null
        })
    })

    // Select target term
    let targetTermId = termId
    let activeTermInfo: any = null

    if (!targetTermId && Object.keys(termGroups).length > 0) {
        targetTermId = Object.keys(termGroups)[0]
    }
    
    if (!targetTermId) {
        const { data: activeTerm } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year')
        .eq('is_current', true)
        .single()
        
        if (activeTerm) {
            targetTermId = activeTerm.id
            activeTermInfo = activeTerm
        }
    }

    if (!targetTermId) return { student: studentData, reportData: null, settings, scoreSettings }

    // Initialize report if empty
    if (!termGroups[targetTermId]) {
        let termName = 'Unknown Term'
        let termYear = 'N/A'
        
        if (activeTermInfo && activeTermInfo.id === targetTermId) {
            termName = activeTermInfo.name
            termYear = activeTermInfo.academic_year
        } else {
            const { data: t } = await supabase
            .from('academic_terms')
            .select('name, academic_year')
            .eq('id', targetTermId)
            .single()
            if (t) {
                termName = t.name
                termYear = t.academic_year
            }
        }
        
        termGroups[targetTermId] = {
            termId: targetTermId,
            termName,
            year: termYear,
            grades: [],
            totalScore: 0,
            averageScore: 0,
            position: null,
            totalClassSize: null,
            remarks: {} 
        }
    }

        const report = termGroups[targetTermId]

    // Fetch THIS term's own vacation & reopening dates (per-term dates fix).
    // Previously all report cards read the single global academic_settings row,
    // which caused them to show the NEXT term's dates as soon as admin saved them.
    {
      const { data: termDates } = await supabase
        .from('academic_terms')
        .select('vacation_date, reopening_date')
        .eq('id', targetTermId)
        .maybeSingle()
            report.vacationDate = termDates?.vacation_date || undefined
      report.reopeningDate = termDates?.reopening_date || undefined
    }

        // Determine the CLASS that produced the scores for the TARGET term.
    // This is the critical fix for cross-level transitions (e.g. Basic 6 -> Basic 7).
    // We must NOT use the student's CURRENT class to build the subject set for a
    // historical term — that would merge the previous level's scored subjects with
    // the current level's subjects. We derive the term's class from scores.class_id
    // (added & backfilled by database/historical-reports.sql), falling back to the
    // student's current class only when no class was captured.
    const targetTermGradesAll = grades?.filter((g: any) => g.term_id === targetTermId) || []

    // When viewing a student's report from their CURRENT class (e.g. a teacher on the
    // standard report roster, or the student portal), we must NOT surface historical
    // scores from a PREVIOUS class just because the teacher selected an earlier term.
    // If we did, a Basic 7 teacher selecting a past term would see the student's Basic 6
    // records. Instead we restrict to scores recorded under the student's current class
    // and, when there are none for that class in the selected term, report it as no record.
    const restrictCurrent = !!options?.restrictCurrentClassOnly
    const targetTermGrades = restrictCurrent
      ? targetTermGradesAll.filter((g: any) => g.class_id === studentData.class_id)
      : targetTermGradesAll

    const targetTermClassId = targetTermGrades.find((g: any) => g.class_id)?.class_id
      || (!restrictCurrent ? studentData.class_id : null)

    // Fetch that class's level (so we show the subject set for the class the
    // student was actually in that term, not the class they're in now).
    let termClassLevel: number | string | null = null
    let termClassName: string | null = null
    let termJHS = false
    if (targetTermClassId) {
      const { data: termClass } = await supabase
        .from('classes')
        .select('name, level')
        .eq('id', targetTermClassId)
        .maybeSingle()
            if (termClass) {
        termClassLevel = (termClass as any).level
        termClassName = String((termClass as any).name || '').trim() || null
        const ln = String((termClass as any).name || '').toLowerCase()
        termJHS = ln.includes('jhs') || ln.includes('basic 7') || ln.includes('basic 8') || ln.includes('basic 9')
      }
    }

    // If the student has NO recorded scores at all for the target term, this term
    // simply hasn't been started/completed for the class they belong to in it.
    // Do NOT inject the current class's subjects here — otherwise we'd fabricate a
    // report for a term the student never did at this level.
    const termHasStarted = targetTermGrades.length > 0

    // Fetch subjects based on the TERM's class level (not the current class)
    let levelCategory = ''
    if (typeof termClassLevel === 'string') {
      levelCategory = termClassLevel.toLowerCase()
    } else if (typeof termClassLevel === 'number') {
      if (termClassLevel >= 1 && termClassLevel <= 2) levelCategory = 'kindergarten'
      else if (termClassLevel >= 3 && termClassLevel <= 5) levelCategory = 'lower_primary'
      else if (termClassLevel >= 6 && termClassLevel <= 8) levelCategory = 'upper_primary'
      else if (termClassLevel >= 9) levelCategory = 'jhs'
    }

    try {
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, name, level')
        .order('name')

      if (allSubjects && termHasStarted) {
        const relevantSubjects = allSubjects.filter((sub: any) =>
          !sub.level || sub.level.toLowerCase() === levelCategory
        )

        const existingSubjectIds = new Set(
          targetTermGrades.map((g: any) => g.subject_id)
        )

        relevantSubjects.forEach((sub: any) => {
          if (!existingSubjectIds.has(sub.id)) {
            report.grades.push({
              id: `missing-${sub.id}`,
              subject_name: sub.name,
              class_score: null,
              exam_score: null,
              total: null,
              grade: '-',
              remarks: null,
              term_id: targetTermId,
              rank: null
            })
          }
        })
        report.grades.sort((a, b) => a.subject_name.localeCompare(b.subject_name))
      }
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }

    // Flag whether this term has actually started/been completed for this class,
    // so the report UI can show a clear "not started/completed" message instead of
    // a blank or mixed report.
        report.termHasStarted = termHasStarted
    report.termClassLevel = termClassLevel
    report.termClassId = targetTermClassId
    report.termClassName = termClassName

    // Calculations
    // Calculate total score from all grades (treating null as 0)
    const rawTotalScore = report.grades.reduce((sum, g) => sum + (g.total || 0), 0)
    report.totalScore = Math.round(rawTotalScore * 10) / 10

    // Average over ALL subjects (graded or not) per user request
    const totalSubjects = report.grades.length
    report.averageScore = totalSubjects > 0 
        ? Math.round(report.totalScore / totalSubjects * 10) / 10
        : 0

        // Aggregate (based on the TERM's class, not the student's current class)
    if (termJHS) {
        const calcInput = report.grades
            .filter(g => g.total !== null)
            .map(g => ({
                subjectName: g.subject_name,
                score: g.total as number
            }))
        report.aggregate = calculateAggregate(calcInput).total
    }

    // Remarks
    if (storedRemarks) {
        const remarkForTerm = storedRemarks.find((r: any) => r.term_id === targetTermId)
        if (remarkForTerm) {
            report.remarks = {
                attitude: remarkForTerm.attitude,
                interest: remarkForTerm.interest,
                conduct: remarkForTerm.conduct,
                classTeacher: remarkForTerm.class_teacher_remark,
                headTeacher: remarkForTerm.head_teacher_remark
            }
        }
    }

    // Attendance & Rankings
    const isThirdTerm = isPromotionTerm(report.termName)
    const academicYear = report.year || ''

    const [attendanceResult, termMetadata, rankingsResponse, promotionDataResult] = await Promise.all([
        supabase
        .from('student_attendance')
        .select('days_present')
        .eq('student_id', studentId)
        .eq('term_id', targetTermId)
        .maybeSingle(),
        
        supabase
        .from('academic_terms')
        .select('total_days')
        .eq('id', targetTermId)
        .single(),

        // Note: fetch is not correct here if run on server, but this is client side code usually.
        // But for bulk loop, calling internal API might be slow.
        // We can optimize this later. For now, we simulate or call fetch relative.
        // Or better: Use database RPCs if possible, or just accept the API call.
        // Since we are moving this to shared library, we must assume window.fetch is available or use Axios.
        // But this runs on client (browser), so fetch is fine.
        fetch(`/api/class-rankings?classId=${studentData.class_id}&termId=${targetTermId}`),
        
                isThirdTerm ? supabase
            .from('student_promotions')
            .select('*')
            .eq('student_id', studentId)
            .eq('academic_year', academicYear)
            .maybeSingle() : Promise.resolve({ data: null })
    ])

    report.attendance = {
        present: (attendanceResult.data as any)?.days_present || 0,
        total: (termMetadata.data as any)?.total_days || 0
    }
    report.daysPresent = report.attendance.present // compat
    report.totalDays = report.attendance.total // compat

    if (rankingsResponse && rankingsResponse.ok) {
        const rankingsData = await rankingsResponse.json()
        const classScores = rankingsData.scores || []
        report.totalClassSize = rankingsData.totalClassSize || 1
        
        const uniqueSubjects = new Set(classScores.map((s: any) => s.subject_id))
        const totalSubjectsCount = uniqueSubjects.size || 1

        const studentTotals: Record<string, number> = {}
        classScores.forEach((score: any) => {
            if (!studentTotals[score.student_id]) studentTotals[score.student_id] = 0
            studentTotals[score.student_id] += (score.total || 0)
        })

        const sortedStudents = Object.entries(studentTotals)
            .map(([sid, total]) => ({ sid, average: total / totalSubjectsCount }))
            .sort((a, b) => b.average - a.average)
        
        const position = sortedStudents.findIndex(s => s.sid === studentId) + 1
        report.position = position > 0 ? position : null

        // Subj ranks
        report.grades.forEach(grade => {
            // Get all scores for this subject
            const subjectScores = classScores
                .filter((s: any) => (s.subjects as any)?.name === grade.subject_name)
                .map((s: any) => ({ student_id: s.student_id, total: s.total || 0 }))
                .sort((a: any, b: any) => b.total - a.total)

            const rank = subjectScores.findIndex((s: any) => s.student_id === studentId) + 1
            grade.rank = rank > 0 ? rank : null
        })
    }
    
        if (isThirdTerm) {
        const promotionData = (promotionDataResult as any).data
        if (promotionData) {
            report.promotionDecision = promotionData.promotion_status
            if (promotionData.teacher_remarks) {
            report.promotionStatus = promotionData.teacher_remarks
            }
            // Store full promotion data for report card display
            report.promotionData = promotionData
        }
    }

    // Add section name to student data
    studentData.section_name = sectionName

    return { student: studentData, reportData: report, settings, scoreSettings }
}
