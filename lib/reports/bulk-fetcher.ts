import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ReportCardData, Grade } from './types'
import { getGradeValue, calculateAggregate, isPromotionTerm } from '@/lib/academic-utils'

let cachedSettings: any = null
let cachedScoreSettings: any = null
let settingsCacheTime = 0
const SETTINGS_TTL = 1000 * 60 * 5 // 5 minutes

export async function fetchBulkReportCardData(studentIds: string[], termId?: string) {
    const supabase = getSupabaseBrowserClient()
    if (!studentIds || studentIds.length === 0) return []

    // 1. Settings
    if (!cachedSettings || (Date.now() - settingsCacheTime > SETTINGS_TTL)) {   
        const { data: fetchedSettings } = await supabase.from('academic_settings').select('*').single()
        const { data: gradingConfig } = await supabase.from('system_settings').select('setting_key, setting_value').in('setting_key', ['class_score_percentage', 'exam_score_percentage'])
        cachedSettings = fetchedSettings
        let newScoreSettings = { classScorePercentage: 30, examScorePercentage: 70 }
        if (gradingConfig) {
            const cs = gradingConfig.find((s: any) => s.setting_key === 'class_score_percentage')
            const es = gradingConfig.find((s: any) => s.setting_key === 'exam_score_percentage')
            if (cs && cs.setting_value) newScoreSettings.classScorePercentage = Number(cs.setting_value)
            if (es && es.setting_value) newScoreSettings.examScorePercentage = Number(es.setting_value)
        }
        cachedScoreSettings = newScoreSettings
        settingsCacheTime = Date.now()
    }

    const settings = cachedSettings
    const scoreSettings = cachedScoreSettings

    // 2. Fetch Students
    const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id, first_name, middle_name, last_name, gender, date_of_birth, class_id, results_withheld, withheld_reason, classes (name, level), profiles:profile_id (full_name)')
        .in('id', studentIds)
    if (studentsError) throw studentsError

    const classId = students[0]?.class_id

    // 3. Target Term Resolve
    let targetTermId = termId
    let targetTermName = 'Unknown Term'
    let targetTermYear = 'N/A'
    
    if (!targetTermId) {
        const { data: activeTerm } = await supabase.from('academic_terms').select('id, name, academic_year').eq('is_current', true).single()
        if (activeTerm) {
            targetTermId = activeTerm.id
            targetTermName = activeTerm.name
            targetTermYear = activeTerm.academic_year
        }
    } else {
        const { data: t } = await supabase.from('academic_terms').select('id, name, academic_year').eq('id', targetTermId).single()
        if (t) {
            targetTermName = t.name
            targetTermYear = t.academic_year
        }
    }
    
    if (!targetTermId) return []

    // 4. Fetch Scores (Only for target term to save mem)
    const { data: grades } = await supabase
        .from('scores')
        .select('*, subjects(name)')
        .in('student_id', studentIds)
        .eq('term_id', targetTermId)

    // 5. Fetch Remarks
    const { data: remarks } = await supabase
        .from('student_remarks')
        .select('*')
        .in('student_id', studentIds)
        .eq('term_id', targetTermId)
        
    // 6. Fetch Level Subjects
    const classLevel = students[0]?.classes?.level
    let levelCategory = ''
    if (typeof classLevel === 'string') levelCategory = classLevel.toLowerCase()
    else if (typeof classLevel === 'number') {
        if (classLevel >= 1 && classLevel <= 2) levelCategory = 'kindergarten'  
        else if (classLevel >= 3 && classLevel <= 5) levelCategory = 'lower_primary'
        else if (classLevel >= 6 && classLevel <= 8) levelCategory = 'upper_primary'
        else if (classLevel >= 9) levelCategory = 'jhs'
    }
    
    let requiredSubjectNames: string[] = []
    if (levelCategory) {
        const { data: subjectData } = await supabase.from('subjects').select('name').eq('level_category', levelCategory).eq('is_active', true).order('name')
        if (subjectData) requiredSubjectNames = subjectData.map((s: any) => s.name)
    }

    // 7. Attendance
    const { data: attendanceData } = await supabase
        .from('attendance')
        .select('student_id')
        .in('student_id', studentIds)
        .eq('academic_term_id', targetTermId)
        .eq('status', 'present')

    // Term Metadata for total working days
    const { data: termMeta } = await supabase
        .from('term_metadata')
        .select('total_working_days')
        .eq('term_id', targetTermId)
        .eq('class_id', classId)
        .maybeSingle()

    // 8. Rankings
    let classRankings: any = null
    try {
        const rankUrl = new URL('/api/class-rankings', window.location.origin)
        rankUrl.searchParams.set('classId', classId)
        rankUrl.searchParams.set('termId', targetTermId)
        const rankRes = await fetch(rankUrl.toString())
        if (rankRes.ok) classRankings = await rankRes.json()
    } catch(e) {}

    // 9. Promotion metrics (if 3rd term)
    const isThirdTerm = isPromotionTerm(targetTermName)
    let promotionData: any[] = []
    if (isThirdTerm) {
        const { data: p } = await supabase
            .from('promotion_metrics')
            .select('*')
            .in('student_id', studentIds)
            .eq('academic_year', targetTermYear)
        if (p) promotionData = p
    }

    // Assemble Results
    return students.map((student: any) => {
        let stuGrades: Grade[] = (grades || []).filter((g: any) => g.student_id === student.id).map((g: any) => ({
            id: g.id,
            subject_name: g.subjects?.name || 'Unknown Subject',
            class_score: g.class_score,
            exam_score: g.exam_score,
            total: g.total,
            grade: g.total !== null ? getGradeValue(g.total).toString() : '-',
            remarks: g.remarks,
            term_id: g.term_id,
            rank: null // Rank within subject is usually populated later if needed
        }))

        // Verify all required subjects
        const presentSubjects = new Set(stuGrades.map((g: any) => g.subject_name))     
        requiredSubjectNames.forEach((subName: any) => {
            if (!presentSubjects.has(subName)) {
                stuGrades.push({ id: `missing-${subName}`, subject_name: subName, class_score: null, exam_score: null, total: null, grade: '-', remarks: '-', term_id: targetTermId as string, rank: null })
            }
        })
        
        stuGrades.sort((a: any, b: any) => a.subject_name.localeCompare(b.subject_name))  

        const totalScoreRaw = stuGrades.reduce((sum: number, g: any) => sum + (g.total || 0), 0)
        const totalScore = Math.round(totalScoreRaw * 10) / 10
        const totalSubjects = stuGrades.length
        const averageScore = totalSubjects > 0 ? Math.round(totalScore / totalSubjects * 10) / 10 : 0

        let aggregate = undefined
        const className = (student.classes?.name || student.classes?.class_name || '').toLowerCase()
        const isJHS = className.includes('jhs') || className.includes('basic 7') || className.includes('basic 8') || className.includes('basic 9')
        if (isJHS) {
            const calcInput = stuGrades.filter((g: any) => g.total !== null).map((g: any) => ({ subjectName: g.subject_name, score: g.total as number }))
            aggregate = calculateAggregate(calcInput).total
        }

        let stuRemark = (remarks || []).find((r: any) => r.student_id === student.id)

        let stuAttendanceCount = (attendanceData || []).filter((a: any) => a.student_id === student.id).length
        let totalDays = termMeta?.total_working_days || 0
        const attendance = totalDays > 0 ? { present: stuAttendanceCount, total: totalDays } : undefined
        
        let position = null
        let totalClassSize = null
        if (classRankings && !classRankings.error) {
            const stuRank = classRankings.rankings?.find((r: any) => r.student_id === student.id)
            if (stuRank) position = stuRank.position
            if (classRankings.rankings) totalClassSize = classRankings.rankings.length
        }

        let studentPromotion = isThirdTerm ? promotionData.find(p => p.student_id === student.id) : null

        const reportData: ReportCardData = {
            termId: targetTermId as string,
            termName: targetTermName,
            year: targetTermYear,
            grades: stuGrades,
            totalScore,
            averageScore,
            position,
            totalClassSize,
            aggregate,
            attendance,
            remarks: stuRemark ? {
                attitude: stuRemark.attitude,
                interest: stuRemark.interest,
                conduct: stuRemark.conduct,
                classTeacher: stuRemark.class_teacher_remark,
                headTeacher: stuRemark.head_teacher_remark
            } : {},
            promotionData: studentPromotion
        }

        return {
            student,
            reportData,
            settings,
            scoreSettings
        }
    })
}
