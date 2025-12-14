'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Save, RefreshCw } from 'lucide-react'
import signatureImg from '@/app/student/report-card/signature.png'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

// Import remarks from student report card (same system)
const ATTITUDE_REMARKS = {
  excellent: ['Excellent attitude towards learning', 'Shows great enthusiasm', 'Very positive and motivated', 'Exceptionally dedicated'],
  good: ['Good attitude towards learning', 'Shows interest in studies', 'Positive and cooperative', 'Generally motivated'],
  average: ['Satisfactory attitude', 'Needs to show more interest', 'Could be more enthusiastic', 'Average motivation'],
  poor: ['Needs improvement in attitude', 'Shows little interest', 'Must develop better attitude', 'Requires motivation']
}

const INTEREST_REMARKS = {
  excellent: [
    'Enjoys reading storybooks and solving challenging math problems',
    'Likes leading group discussions and helping peers with studies',
    'Shows keen interest in science experiments and creative writing',
    'Active in quiz competitions and enjoys learning new topics',
    'Loves exploring library books and participating in class debates'
  ],
  good: [
    'Enjoys playing football and participating in cultural activities',
    'Likes drawing and engaging in creative arts',
    'Shows interest in gardening and nature studies',
    'Enjoys storytelling and listening to folklore',
    'Likes participating in school worship and singing'
  ],
  average: [
    'Likes playing with friends during break time',
    'Enjoys traditional games like Ampe and Oware',
    'Shows interest in practical agriculture and hands-on tasks',
    'Likes drumming and dancing during cultural events',
    'Enjoys listening to stories but needs to read more'
  ],
  poor: [
    'Likes playing football but needs to focus more on reading',
    'Enjoys running errands but should spend more time on homework',
    'Likes playing excessively during class hours',
    'Shows interest in games but lacks focus in academic work',
    'Enjoys socialising but needs to develop interest in books'
  ]
}

const CONDUCT_REMARKS = {
  excellent: ['Excellent conduct', 'Well-behaved and respectful', 'A role model to others', 'Outstanding behaviour'],
  good: ['Good conduct', 'Generally well-behaved', 'Respectful to teachers and peers', 'Behaves appropriately'],
  average: ['Satisfactory conduct', 'Behaviour needs improvement', 'Occasionally disruptive', 'Must be more disciplined'],
  poor: ['Poor conduct', 'Frequently misbehaves', 'Needs serious improvement', 'Must change behaviour']
}

const CLASS_TEACHER_REMARKS = {
  excellent: ['An outstanding student! Keep up the excellent work', 'Exceptional performance. A pleasure to teach', 'Brilliant work this term. Very proud of you', 'Excellent results. Continue to aim high'],
  good: ['Good performance this term. Keep it up', 'A hardworking student with good results', 'Well done! Continue to work hard', 'Good progress shown. Maintain the effort'],
  average: ['Average performance. Can do better with more effort', 'Fair results. Needs to work harder', 'Satisfactory work but must improve', 'More effort needed to achieve better results'],
  poor: ['Poor performance. Needs serious improvement', 'Must work much harder next term', 'Below expectations. Requires extra effort', 'Needs to focus more on studies']
}

const HEADTEACHER_REMARKS = {
  excellent: ['Excellent performance! The school is proud of you', 'Outstanding achievement. Keep it up', 'A remarkable student. Continue the good work', 'Exceptional results. Well done!'],
  good: ['Good performance. Continue to work hard', 'Well done. Maintain your good work', 'Commendable effort. Keep improving', 'Good progress. Stay focused'],
  average: ['Average performance. More effort is required', 'Satisfactory but can do better', 'Needs to put in more effort', 'Fair results. Improvement expected'],
  poor: ['Below average. Serious improvement needed', 'Performance not satisfactory. Must work harder', 'Disappointing results. Requires immediate attention', 'Needs to take studies more seriously']
}

function getPerformanceLevel(averageScore: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (averageScore >= 80) return 'excellent'
  if (averageScore >= 60) return 'good'
  if (averageScore >= 40) return 'average'
  return 'poor'
}

function getAutoRemark(remarkType: string, averageScore: number, attendancePercentage?: number): string {
  let level = getPerformanceLevel(averageScore)
  
  // Adjust level based on attendance for teacher remarks
  if (attendancePercentage !== undefined && (remarkType === 'classTeacher' || remarkType === 'headTeacher')) {
    if (attendancePercentage < 50) {
      level = 'poor'
    } else if (attendancePercentage < 70 && level !== 'poor') {
      level = 'average'
    } else if (attendancePercentage < 85 && level === 'excellent') {
      level = 'good'
    }
  }

  let remarks: string[] = []
  
  switch (remarkType) {
    case 'attitude':
      remarks = ATTITUDE_REMARKS[level]
      break
    case 'interest':
      remarks = INTEREST_REMARKS[level]
      break
    case 'conduct':
      remarks = CONDUCT_REMARKS[level]
      break
    case 'classTeacher':
      remarks = CLASS_TEACHER_REMARKS[level]
      break
    case 'headTeacher':
      remarks = HEADTEACHER_REMARKS[level]
      break
  }
  
  return remarks[Math.floor(Math.random() * remarks.length)]
}

function getAllRemarks(remarkType: string): string[] {
  switch (remarkType) {
    case 'attitude':
      return [...ATTITUDE_REMARKS.excellent, ...ATTITUDE_REMARKS.good, ...ATTITUDE_REMARKS.average, ...ATTITUDE_REMARKS.poor]
    case 'interest':
      return [...INTEREST_REMARKS.excellent, ...INTEREST_REMARKS.good, ...INTEREST_REMARKS.average, ...INTEREST_REMARKS.poor]
    case 'conduct':
      return [...CONDUCT_REMARKS.excellent, ...CONDUCT_REMARKS.good, ...CONDUCT_REMARKS.average, ...CONDUCT_REMARKS.poor]
    case 'classTeacher':
      return [...CLASS_TEACHER_REMARKS.excellent, ...CLASS_TEACHER_REMARKS.good, ...CLASS_TEACHER_REMARKS.average, ...CLASS_TEACHER_REMARKS.poor]
    case 'headTeacher':
      return [...HEADTEACHER_REMARKS.excellent, ...HEADTEACHER_REMARKS.good, ...HEADTEACHER_REMARKS.average, ...HEADTEACHER_REMARKS.poor]
    default:
      return []
  }
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

function getGradeValue(score: number): number {
  if (score >= 80) return 1
  if (score >= 70) return 2
  if (score >= 60) return 3
  if (score >= 55) return 4
  if (score >= 50) return 5
  if (score >= 45) return 6
  if (score >= 40) return 7
  if (score >= 35) return 8
  return 9
}

function calculateAggregate(grades: any[]): number | null {
  // Buckets for core subjects
  let english: number | null = null
  let math: number | null = null
  let science: number | null = null
  let social: number | null = null
  
  const others: number[] = []
  
  grades.forEach(g => {
    const subject = (g.subject_name || '').toLowerCase()
    const score = g.total || 0
    const gradeVal = getGradeValue(score)
    
    // Strict categorization for Core Subjects
    if (subject.includes('english')) {
      english = english === null ? gradeVal : Math.min(english, gradeVal)
    } else if (subject.includes('mathematics') || subject.includes('math')) {
      math = math === null ? gradeVal : Math.min(math, gradeVal)
    } else if (subject.includes('integrated science') || subject === 'science' || subject === 'general science') {
      science = science === null ? gradeVal : Math.min(science, gradeVal)
    } else if (subject.includes('social studies') || subject.includes('social')) {
      social = social === null ? gradeVal : Math.min(social, gradeVal)
    } else {
      others.push(gradeVal)
    }
  })
  
  // Calculate total from 4 cores + best 2 others
  let total = 0
  
  if (english) total += english
  if (math) total += math
  if (science) total += science
  if (social) total += social
  
  // Sort others (ascending, lower is better)
  others.sort((a, b) => a - b)
  const bestOthers = others.slice(0, 2)
  
  total += bestOthers.reduce((a, b) => a + b, 0)
  
  return total
}

interface ReportRemarks {
  attitude: string
  interest: string
  conduct: string
  classTeacher: string
  headTeacher: string
}

export default function TeacherStudentReportPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.id as string
  const termId = searchParams.get('term')
  
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<any>(null)
  const [student, setStudent] = useState<any>(null)
  const [reportData, setReportData] = useState<any>(null)
  const [academicSettings, setAcademicSettings] = useState<any>(null)
  const [downloading, setDownloading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  const [remarks, setRemarks] = useState<ReportRemarks>({
    attitude: '',
    interest: '',
    conduct: '',
    classTeacher: '',
    headTeacher: ''
  })

  useEffect(() => {
    loadData()
  }, [studentId, termId])

  const loadData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const { data: teacherData } = await getTeacherData(user.id)
      if (!teacherData) {
        router.push('/login?portal=teacher')
        return
      }
      setTeacher(teacherData)

      // Get student info
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          *,
          profiles(id, full_name, email),
          classes(id, name, level, category)
        `)
        .eq('id', studentId)
        .single()

      if (studentError || !studentData) {
        console.error('Error loading student:', studentError)
        alert('Student not found')
        router.push('/teacher/reports')
        return
      }
      setStudent(studentData)

      // Get scores for this student and term
      const { data: scoresData } = await supabase
        .from('scores')
        .select(`
          *,
          subjects(id, name),
          academic_terms(name, academic_year)
        `)
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .order('created_at') as { data: any[] | null }

      // Get attendance - count days where student was present or late
      const { data: attendanceRecords, count: daysPresent } = await supabase
        .from('attendance')
        .select('id', { count: 'exact' })
        .eq('student_id', studentId)
        .in('status', ['present', 'late']) as { data: any[], count: number | null }

      // Fetch term data via API route to bypass RLS
      const termResponse = await fetch(`/api/term-data?termId=${termId}`)
      const termData = termResponse.ok ? await termResponse.json() : null

      // Calculate average
      const validScores = scoresData?.filter(s => s.total !== null) || []
      const totalScore = Math.round(validScores.reduce((sum, s) => sum + (s.total || 0), 0) * 10) / 10
      const averageScore = validScores.length > 0 ? Math.round((totalScore / validScores.length) * 10) / 10 : 0

      // Get all scores for the same term to calculate subject ranks
      const { data: allTermScores } = await supabase
        .from('scores')
        .select('student_id, subject_id, total')
        .eq('term_id', termId)
        .not('total', 'is', null) as { data: any[] | null }

      // Calculate subject ranks
      const subjectRanks: { [subjectId: string]: { [studentId: string]: number } } = {}
      if (allTermScores) {
        // Group scores by subject
        const subjectScores: { [subjectId: string]: { studentId: string, total: number }[] } = {}
        allTermScores.forEach(score => {
          if (!subjectScores[score.subject_id]) {
            subjectScores[score.subject_id] = []
          }
          subjectScores[score.subject_id].push({ studentId: score.student_id, total: score.total })
        })

        // Sort and assign ranks for each subject
        Object.keys(subjectScores).forEach(subjectId => {
          const sorted = subjectScores[subjectId].sort((a, b) => b.total - a.total)
          subjectRanks[subjectId] = {}
          sorted.forEach((item, index) => {
            subjectRanks[subjectId][item.studentId] = index + 1
          })
        })
      }

      // Get class position (overall)
      const { data: classScoresData } = await supabase
        .from('scores')
        .select('student_id, total')
        .eq('term_id', termId)
        .not('total', 'is', null) as { data: any[] | null }

      // Group by student and calculate averages
      const studentAverages: any = {}
      classScoresData?.forEach((score: any) => {
        if (!studentAverages[score.student_id]) {
          studentAverages[score.student_id] = { total: 0, count: 0 }
        }
        studentAverages[score.student_id].total += score.total || 0
        studentAverages[score.student_id].count += 1
      })

      const averages = Object.entries(studentAverages).map(([sid, data]: any) => ({
        student_id: sid,
        average: data.total / data.count
      }))

      averages.sort((a: any, b: any) => b.average - a.average)
      const position = averages.findIndex((a: any) => a.student_id === studentId) + 1

      // Get academic settings
      const { data: settingsData } = await supabase
        .from('academic_settings')
        .select('*')
        .single() as { data: any }

      setAcademicSettings(settingsData)

      const grades = scoresData?.map(s => ({
        subject_name: s.subjects?.name || 'Unknown',
        subject_id: s.subjects?.id || s.subject_id,
        class_score: s.class_score,
        exam_score: s.exam_score,
        total: s.total,
        // Recalculate grade to ensure consistency with aggregate (BECE 1-9 Scale)
        grade: s.total !== null ? getGradeValue(s.total).toString() : '-',
        remarks: s.remarks,
        rank: subjectRanks[s.subject_id]?.[studentId] || null
      })) || []

      // Calculate aggregate for JHS students
      const className = (studentData.classes?.name || studentData.classes?.class_name || '').toLowerCase()
      const isJHS = className.includes('jhs') || 
                    className.includes('basic 7') || 
                    className.includes('basic 8') || 
                    className.includes('basic 9') ||
                    className.includes('form 1') ||
                    className.includes('form 2') ||
                    className.includes('form 3')
      
      let aggregate = null
      if (isJHS) {
        aggregate = calculateAggregate(grades)
      }

      setReportData({
        grades,
        termName: termData?.name || '',
        year: termData?.academic_year || '',
        daysPresent: daysPresent || 0,
        totalDays: termData?.total_days || 0,
        averageScore: Math.round(averageScore * 10) / 10,
        position: position > 0 ? position : null,
        totalClassSize: averages.length,
        aggregate
      })

      // Generate auto remarks
      const autoRemarks = {
        attitude: getAutoRemark('attitude', averageScore),
        interest: getAutoRemark('interest', averageScore),
        conduct: getAutoRemark('conduct', averageScore),
        classTeacher: getAutoRemark('classTeacher', averageScore),
        headTeacher: getAutoRemark('headTeacher', averageScore)
      }
      setRemarks(autoRemarks)

      setLoading(false)
    } catch (error) {
      console.error('Error loading data:', error)
      setLoading(false)
    }
  }

  const handleRemarkChange = (type: keyof ReportRemarks, value: string) => {
    setRemarks(prev => ({ ...prev, [type]: value }))
  }

  const applyAutoRemarks = () => {
    if (!reportData) return
    
    const attendancePercentage = reportData.totalDays > 0 
      ? (reportData.daysPresent / reportData.totalDays) * 100 
      : undefined

    const autoRemarks = {
      attitude: getAutoRemark('attitude', reportData.averageScore, attendancePercentage),
      interest: getAutoRemark('interest', reportData.averageScore, attendancePercentage),
      conduct: getAutoRemark('conduct', reportData.averageScore, attendancePercentage),
      classTeacher: getAutoRemark('classTeacher', reportData.averageScore, attendancePercentage),
      headTeacher: getAutoRemark('headTeacher', reportData.averageScore, attendancePercentage)
    }
    setRemarks(autoRemarks)
  }

  const downloadPDF = async () => {
    if (!reportData || !student || !academicSettings) return

    setDownloading(true)
    try {
      // Convert images to base64
      let watermarkBase64 = ''
      let logoBase64 = ''
      let methodistLogoBase64 = ''

      try {
        const watermarkResponse = await fetch('/school_crest-removebg-preview (2).png')
        const watermarkBlob = await watermarkResponse.blob()
        watermarkBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(watermarkBlob)
        })
      } catch (err) {
        console.warn('Could not load watermark:', err)
      }

      try {
        const logoResponse = await fetch('/school_crest.png')
        const logoBlob = await logoResponse.blob()
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(logoBlob)
        })
      } catch (err) {
        console.warn('Could not load school crest:', err)
      }

      try {
        const methodistResponse = await fetch('/Methodist_logo.png')
        const methodistBlob = await methodistResponse.blob()
        methodistLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(methodistBlob)
        })
      } catch (err) {
        console.warn('Could not load Methodist logo:', err)
      }

      // Convert signature image to base64
      let signatureBase64 = ''
      try {
        const response = await fetch(signatureImg.src)
        const blob = await response.blob()
        signatureBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (imgError) {
        console.warn('Could not load signature image:', imgError)
      }

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow popups to download report card')
        return
      }

      const html = generateReportHTML(watermarkBase64, logoBase64, methodistLogoBase64, signatureBase64)
      printWindow.document.write(html)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 500)

    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate report card')
    } finally {
      setDownloading(false)
    }
  }

  const generateReportHTML = (watermarkBase64: string, logoBase64: string, methodistLogoBase64: string, signatureBase64: string = ''): string => {
    const currentDate = new Date().toLocaleDateString('en-GB')
    const vacationDate = academicSettings?.vacation_start_date
      ? new Date(academicSettings.vacation_start_date + 'T00:00:00').toLocaleDateString('en-GB')
      : ''
    const reopeningDate = academicSettings?.school_reopening_date
      ? new Date(academicSettings.school_reopening_date + 'T00:00:00').toLocaleDateString('en-GB')
      : ''

    // Use base64 images or fallback to empty
    const backgroundImage = watermarkBase64 ? `url('${watermarkBase64}')` : 'none'
    const logoImage = logoBase64 || ''
    const methodistLogo = methodistLogoBase64 || ''

    // Get student name from profiles or construct from first/last name
    const studentName = student.profiles?.full_name || `${student.last_name || ''} ${student.first_name || ''}`
    const className = student.classes?.name || student.classes?.class_name || ''

    // Determine promotion status
    const getPromotionStatusText = (): string => {
      const isThirdTerm = reportData.termName?.toLowerCase().includes('third') || 
                          reportData.termName?.toLowerCase().includes('term 3') ||
                          reportData.termName?.toLowerCase().includes('3rd')
      
      if (!isThirdTerm) return ''
      
      const avg = reportData.averageScore || 0
      if (avg >= 50) return 'PROMOTED TO NEXT CLASS'
      if (avg >= 40) return 'PROMOTED ON TRIAL'
      return 'TO REPEAT CLASS'
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Report Card - ${studentName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
          
          @page {
            size: A4;
            margin: 5mm;
          }
          @media print {
            html, body {
              width: 210mm;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .no-print { display: none !important; }
            .report-card {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              margin: 0 !important;
              min-height: 260mm !important;
              height: auto !important;
              page-break-inside: avoid !important;
            }
            .watermark-overlay {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 9pt;
            line-height: 1.25;
            padding: 0;
            color: #00008B;
            background: white;
          }
          .report-card {
            border: 3px solid #00008B;
            padding: 10px;
            width: 100%;
            min-height: 285mm;
            margin: 0 auto;
            position: relative;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            background: white;
            isolation: isolate;
          }
          .watermark-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-image: ${backgroundImage};
            background-repeat: no-repeat;
            background-position: center center;
            background-size: 90%;
            opacity: 0.08;
            z-index: -1;
            pointer-events: none;
          }
          .report-card > *:not(.watermark-overlay) {
            position: relative;
            z-index: 1;
          }
          .header {
            border: 2px solid #00008B;
            padding: 8px 15px;
            margin-bottom: 10px;
            position: relative;
            box-shadow: 5px 5px 10px rgba(0,0,0,0.15);
          }
          .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px 15px;
          }
          .header-logo {
            width: 95px;
            height: 95px;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .header-logo img {
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
          }
          .header-top {
            text-align: center;
            flex: 1;
            padding: 0 10px;
          }
          .school-name {
            font-size: 26pt;
            font-weight: bold;
            font-family: Impact, 'Arial Black', sans-serif;
            color: #00008B;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }
          .school-address {
            font-size: 18pt;
            margin: 1px 0;
            color: #00008B;
          }
          .school-address.box {
            font-size: 20pt;
          }
          .school-motto {
            font-size: 16pt;
            font-style: italic;
            margin-top: 4px;
            font-weight: bold;
            color: #00008B;
          }
          .report-title {
            background: #fff;
            border: 2px solid #00008B;
            padding: 4px;
            text-align: center;
            font-weight: bold;
            font-size: 19pt;
            margin: 10px 40px 20px 40px;
            color: #00008B;
            box-shadow: 3px 3px 5px rgba(0,0,0,0.2);
          }
          .student-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0;
            margin-bottom: 6px;
            border: 1px solid #00008B;
          }
          .info-row {
            display: contents;
          }
          .info-cell {
            padding: 3px 6px;
            border: 1px solid #00008B;
            font-size: 11pt;
            color: #00008B;
            text-transform: uppercase;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px;
          }
          .info-label {
            font-weight: bold;
            color: #00008B;
            position: relative;
            padding-right: 8px;
          }
          .info-label::after {
            content: '';
            position: absolute;
            right: 0;
            top: -3px;
            bottom: -3px;
            width: 1px;
            background-color: transparent;
            border-right: 1px solid #00008B;
          }
          .info-value {
            padding-left: 8px;
          }
          .grades-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 5px;
            font-size: 11pt;
            font-family: 'Times New Roman', Times, serif;
          }
          .grades-table th,
          .grades-table td {
            border: 1px solid #00008B;
            padding: 2.5px;
            text-align: center;
            color: #00008B;
            font-size: 11pt;
          }
          .grades-table th {
            background: #f0f0f0;
            font-weight: bold;
            font-size: 11pt;
            text-transform: uppercase;
            color: #00008B;
          }
          .grades-table td:first-child,
          .grades-table th:first-child {
            text-align: left;
          }
          .grades-table td:last-child,
          .grades-table th:last-child {
            text-align: left;
          }
          .sn-col {
            width: 30px;
          }
          .subject-col {
            width: 180px;
          }
          .score-col {
            width: 60px;
          }
          .total-col {
            width: 60px;
          }
          .rank-col {
            width: 50px;
          }
          .remarks-col {
            width: 180px;
            white-space: nowrap;
          }
          .total-row {
            font-weight: bold;
          }
          .bottom-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 5px;
            margin-top: 5px;
          }
          .attendance-box,
          .promotion-box {
            border: 1px solid #00008B;
            padding: 3px;
            font-size: 11pt;
            color: #00008B;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 2px;
            text-transform: uppercase;
            font-size: 11pt;
            color: #00008B;
          }
          .remarks-section {
            border: 1px solid #00008B;
            margin-top: 5px;
          }
          .remarks-row {
            display: grid;
            grid-template-columns: 220px 1fr;
            border-bottom: 1px solid #00008B;
          }
          .remarks-row:last-child {
            border-bottom: none;
          }
          .remarks-label {
            padding: 6px 10px 6px 8px;
            font-weight: bold;
            border-right: 1px solid #00008B;
            font-size: 11pt;
            color: #00008B;
            white-space: nowrap;
            position: relative;
          }
          .remarks-content {
            padding: 6px 8px;
            min-height: 22px;
            color: #00008B;
            font-size: 11pt;
            border-left: 1px solid #00008B;
          }
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border: 2px solid #00008B;
            margin-top: 6px;
            min-height: 80px;
          }
          .signature-box {
            text-align: center;
            font-size: 11pt;
            color: #00008B;
            padding: 5px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .signature-box:first-child {
            border-right: 2px solid #00008B;
          }
          .signature-line {
            color: #00008B;
            font-size: 11pt;
            font-weight: bold;
          }
          .footer-note {
            margin-top: 4px;
            font-size: 5pt;
            text-align: center;
            font-style: italic;
            border-top: 1px solid #00008B;
            padding-top: 2px;
            color: #00008B;
          }
          .copyright-footer {
            position: absolute;
            bottom: 2px;
            right: 5px;
            font-size: 6pt;
            color: #666;
            font-style: italic;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <div class="report-card">
          <div class="watermark-overlay"></div>
          <!-- Header -->
          <div class="header">
            <div class="header-content">
              <div class="header-logo">
                ${logoImage ? `<img src="${logoImage}" alt="School Crest" />` : ''}
              </div>
              <div class="header-top">
                <div class="school-name">BIRIWA METHODIST 'C' BASIC SCHOOL</div>
                <div class="school-address box">POST OFFICE BOX 5</div>
                <div class="school-address">TEL: +233244930752</div>
                <div class="school-address">E-mail: biriwamethodistcschool@gmail.com</div>
                <div class="school-motto">MOTTO: DISCIPLINE WITH HARD WORK</div>
              </div>
              <div class="header-logo">
                ${methodistLogo ? `<img src="${methodistLogo}" alt="Methodist Logo" />` : ''}
              </div>
            </div>
          </div>
          <div class="report-title">STUDENT'S REPORT SHEET</div>

          <!-- Student Information -->
          <div class="student-info-grid">
            <div class="info-row">
              <div class="info-cell"><span class="info-label">NAME:</span><span class="info-value">${studentName}</span></div>
              <div class="info-cell"><span class="info-label">TERM:</span><span class="info-value">${reportData.termName}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">STD ID:</span><span class="info-value">${student.student_id || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">AVG SCORE:</span><span class="info-value">${reportData.averageScore}%${(reportData.aggregate !== null && reportData.aggregate !== undefined) ? ` | AGG: ${reportData.aggregate}` : ''}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">GENDER:</span><span class="info-value">${student.gender || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">POS. IN CLASS:</span><span class="info-value">${reportData.position ? `${reportData.position}${getOrdinalSuffix(reportData.position)}` : 'N/A'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">CLASS:</span><span class="info-value">${className}</span></div>
              <div class="info-cell"><span class="info-label">VACATION DATE:</span><span class="info-value">${vacationDate || 'TBA'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">NO. ON ROLL:</span><span class="info-value">${reportData.totalClassSize || ''}</span></div>
              <div class="info-cell"><span class="info-label">REOPENING DATE:</span><span class="info-value">${reopeningDate || 'TBA'}</span></div>
            </div>
          </div>

          <!-- Grades Table -->
          <table class="grades-table">
            <thead>
              <tr>
                <th class="sn-col">S/N</th>
                <th class="subject-col">SUBJECT</th>
                <th class="score-col">CLASS SCORE<br/>40MARKS</th>
                <th class="score-col">EXAM SCORE<br/>60MARKS</th>
                <th class="total-col">TOTAL SCORE<br/>100MARKS</th>
                <th class="rank-col">RANK</th>
                <th class="remarks-col">REMARKS</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.grades.map((grade: any, index: number) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="text-align: left;">${(grade.subject_name || '').replace(/\\s*\\((LP|UP|JHS)\\)\\s*$/i, '').toUpperCase()}</td>
                  <td>${grade.class_score ?? ''}</td>
                  <td>${grade.exam_score ?? ''}</td>
                  <td><strong>${grade.total !== null && grade.total !== undefined ? Number(grade.total).toFixed(1) : ''}</strong></td>
                  <td>${grade.rank ? `${grade.rank}${getOrdinalSuffix(grade.rank)}` : ''}</td>
                  <td style="text-align: left;">${grade.remarks || ''}</td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td colspan="2" style="text-align: right; padding-right: 10px;">TOTAL</td>
                <td></td>
                <td></td>
                <td><strong>${reportData.grades.reduce((sum: number, g: any) => sum + (g.total || 0), 0).toFixed(1)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <!-- Bottom Section -->
          <div class="bottom-section">
            <div class="attendance-box">
              <div class="section-title">ATTENDANCE: ${reportData.daysPresent || 0} OUT OF ${reportData.totalDays || 0}</div>
            </div>
            <div class="promotion-box">
              <div class="section-title">PROMOTION STATUS: ${getPromotionStatusText()}</div>
            </div>
          </div>

          <!-- Remarks Section -->
          <div class="remarks-section">
            <div class="remarks-row">
              <div class="remarks-label">ATTITUDE</div>
              <div class="remarks-content">${remarks.attitude}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">INTEREST</div>
              <div class="remarks-content">${remarks.interest}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">CONDUCT</div>
              <div class="remarks-content">${remarks.conduct}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">CLASS TEACHER'S REMARKS</div>
              <div class="remarks-content">${remarks.classTeacher}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">HEADTEACHER'S REMARKS</div>
              <div class="remarks-content">${remarks.headTeacher}</div>
            </div>
          </div>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line">HEADMASTER'S STAMP<br/>&<br/>SIGNATURE</div>
            </div>
            <div class="signature-box" style="padding: 2px; position: relative;">
              ${signatureBase64 ? `<img src="${signatureBase64}" alt="Signature" style="width: 90%; height: auto; max-height: 120px; object-fit: contain; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);" />` : ''}
            </div>
          </div>

          <!-- Footer Note -->
          <div class="footer-note">
            Any student showing this document beside all right reserved @Biriwa Methodist School © school. In any circumstances, the paper in which in color with blue mixed texture of a tinted hachure.
            Date generated: ${currentDate}
          </div>
          <div class="copyright-footer">@2025 FortSoft. All rights reserved.</div>
        </div>
      </body>
      </html>
    `
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report card...</p>
        </div>
      </div>
    )
  }

  if (!reportData || !student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load report data</p>
          <Link href="/teacher/reports" className="text-ghana-green hover:underline mt-4 inline-block">
            Back to Reports
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/teacher/reports" className="text-ghana-green hover:text-green-700">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{student.profiles?.full_name}</h1>
                <p className="text-sm text-gray-600">
                  {reportData.termName} - {reportData.year} | {student.classes?.class_name}
                </p>
              </div>
            </div>
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="flex items-center gap-2 px-6 py-3 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Download Report Card
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Performance Summary */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-sm text-gray-600 mb-1">Average Score</p>
            <p className="text-3xl font-bold text-purple-600">{reportData.averageScore}%</p>
          </div>
          {(reportData.aggregate !== null && reportData.aggregate !== undefined) && (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-sm text-gray-600 mb-1">Aggregate</p>
              <p className="text-3xl font-bold text-red-600">{reportData.aggregate}</p>
            </div>
          )}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-sm text-gray-600 mb-1">Class Position</p>
            <p className="text-3xl font-bold text-orange-600">
              {reportData.position}{getOrdinalSuffix(reportData.position)} / {reportData.totalClassSize}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-sm text-gray-600 mb-1">Attendance</p>
            <p className="text-3xl font-bold text-blue-600">
              {reportData.daysPresent}/{reportData.totalDays}
            </p>
          </div>
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-800">Subject Grades</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-ghana-green text-white">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Subject</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Class Score</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Exam Score</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.grades.map((grade: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{grade.subject_name}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-700">{grade.class_score ?? '-'}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-700">{grade.exam_score ?? '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{grade.total ?? '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{grade.grade || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{grade.remarks || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks Editor */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Edit Report Card Remarks</h3>
            <button
              onClick={applyAutoRemarks}
              className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
            >
              <RefreshCw className="w-4 h-4" />
              Apply Auto Remarks
            </button>
          </div>

          <div className="space-y-4">
            {[
              { key: 'attitude', label: 'Attitude to Work' },
              { key: 'interest', label: 'Interest' },
              { key: 'conduct', label: 'Conduct' },
              { key: 'classTeacher', label: "Class Teacher's Remarks" }
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                <select
                  value={remarks[key as keyof ReportRemarks]}
                  onChange={(e) => handleRemarkChange(key as keyof ReportRemarks, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                >
                  {getAllRemarks(key).map((remark, index) => (
                    <option key={index} value={remark}>{remark}</option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Headteacher's Remarks <span className="text-xs text-gray-500">(Auto-generated)</span>
              </label>
              <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {remarks.headTeacher}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
