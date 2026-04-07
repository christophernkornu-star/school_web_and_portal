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
export async function fetchReportCardData(studentId: string, termId?: string) {
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
    
    // Fetch subjects based on level
    const classLevel = studentData.classes?.level
    let levelCategory = ''
    
    if (typeof classLevel === 'string') {
        levelCategory = classLevel.toLowerCase()
    } else if (typeof classLevel === 'number') {
        if (classLevel >= 1 && classLevel <= 2) levelCategory = 'kindergarten'
        else if (classLevel >= 3 && classLevel <= 5) levelCategory = 'lower_primary'
        else if (classLevel >= 6 && classLevel <= 8) levelCategory = 'upper_primary'
        else if (classLevel >= 9) levelCategory = 'jhs'
    }

    try {
        const { data: allSubjects } = await supabase
        .from('subjects')
        .select('id, name, level')
        .order('name')

        if (allSubjects) {
            const relevantSubjects = allSubjects.filter((sub: any) => 
                !sub.level || sub.level.toLowerCase() === levelCategory
            )

            const existingSubjectIds = new Set(
                grades?.filter((g: any) => g.term_id === targetTermId).map((g: any) => g.subject_id)
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

    // Calculations
    // Calculate total score from all grades (treating null as 0)
    const rawTotalScore = report.grades.reduce((sum, g) => sum + (g.total || 0), 0)
    report.totalScore = Math.round(rawTotalScore * 10) / 10

    // Average over ALL subjects (graded or not) per user request
    const totalSubjects = report.grades.length
    report.averageScore = totalSubjects > 0 
        ? Math.round(report.totalScore / totalSubjects * 10) / 10
        : 0

    // Aggregate
    const className = (studentData.classes?.name || studentData.classes?.class_name || '').toLowerCase()
    const isJHS = className.includes('jhs') || 
                className.includes('basic 7') || 
                className.includes('basic 8') || 
                className.includes('basic 9')
    
    if (isJHS) {
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
            .rpc('get_or_create_promotion_status', {
              p_student_id: studentId,
              p_academic_year: academicYear
            }) : Promise.resolve({ data: [] })
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
        if (promotionData && promotionData.length > 0) {
            const promotion = promotionData[0]
            report.promotionDecision = promotion.promotion_status
            if (promotion.teacher_remarks) {
            report.promotionStatus = promotion.teacher_remarks
            }
        }
    }

    return { student: studentData, reportData: report, settings, scoreSettings }
}
