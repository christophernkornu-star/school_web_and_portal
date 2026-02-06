'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Printer, ArrowLeft } from 'lucide-react'
import signatureImg from '@/app/student/report-card/signature.png'
import { toast } from 'react-hot-toast'

// Remarks options based on performance levels
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
    case 'attitude': remarks = ATTITUDE_REMARKS[level]; break
    case 'interest': remarks = INTEREST_REMARKS[level]; break
    case 'conduct': remarks = CONDUCT_REMARKS[level]; break
    case 'classTeacher': remarks = CLASS_TEACHER_REMARKS[level]; break
    case 'headTeacher': remarks = HEADTEACHER_REMARKS[level]; break
  }
  
  return remarks[Math.floor(Math.random() * remarks.length)]
}

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

interface StudentReportData {
  student: any
  grades: any[]
  termName: string
  year: string
  daysPresent: number
  totalDays: number
  averageScore: number
  position: number | null
  totalClassSize: number
  promotionStatus?: string
  remarks: {
    attitude: string
    interest: string
    conduct: string
    classTeacher: string
    headTeacher: string
  }
}

function BulkReportCardsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState<StudentReportData[]>([])
  const [academicSettings, setAcademicSettings] = useState<any>(null)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    loadAllReportData()
  }, [])

  const loadAllReportData = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=teacher')
        return
      }

      const studentsParam = searchParams.get('students')
      const termId = searchParams.get('term')

      if (!studentsParam || !termId) {
        toast.error('Missing required parameters')
        router.push('/teacher/reports')
        return
      }

      const studentIds = studentsParam.split(',')

      // Get academic settings
      const { data: settingsData } = await supabase
        .from('academic_settings')
        .select('*')
        .single() as { data: any }
      setAcademicSettings(settingsData)

      // Get term data via API route to bypass RLS
      const termResponse = await fetch(`/api/term-data?termId=${termId}`)
      const termData = termResponse.ok ? await termResponse.json() : null

      // Get all scores for this term to calculate ranks
      const { data: allTermScores } = await supabase
        .from('scores')
        .select('student_id, subject_id, total')
        .eq('term_id', termId)
        .not('total', 'is', null) as { data: any[] | null }

      // Calculate subject ranks
      const subjectRanks: { [subjectId: string]: { [studentId: string]: number } } = {}
      if (allTermScores) {
        const subjectScores: { [subjectId: string]: { studentId: string, total: number }[] } = {}
        allTermScores.forEach(score => {
          if (!subjectScores[score.subject_id]) {
            subjectScores[score.subject_id] = []
          }
          subjectScores[score.subject_id].push({ studentId: score.student_id, total: score.total })
        })

        Object.keys(subjectScores).forEach(subjectId => {
          const sorted = subjectScores[subjectId].sort((a, b) => b.total - a.total)
          subjectRanks[subjectId] = {}
          sorted.forEach((item, index) => {
            subjectRanks[subjectId][item.studentId] = index + 1
          })
        })
      }

      // Calculate class positions
      const studentAverages: any = {}
      allTermScores?.forEach((score: any) => {
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

      const positionMap: { [studentId: string]: number } = {}
      averages.forEach((a, index) => {
        positionMap[a.student_id] = index + 1
      })

      // Load data for each student
      const allReports: StudentReportData[] = []

      for (const studentId of studentIds) {
        // Get student info
        const { data: student } = await supabase
          .from('students')
          .select(`
            *,
            profiles(id, full_name, email),
            classes(id, name, level, category)
          `)
          .eq('id', studentId)
          .single() as { data: any }

        if (!student) continue

        // Get class size (number on roll)
        const { count: classSize } = await supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .eq('class_id', student.class_id)

        // Get scores for this student
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
        const { count: daysPresent } = await supabase
          .from('attendance')
          .select('id', { count: 'exact' })
          .eq('student_id', studentId)
          .in('status', ['present', 'late']) as { count: number | null }

        // Calculate average
        const validScores = scoresData?.filter(s => s.total !== null) || []
        const totalScore = Math.round(validScores.reduce((sum, s) => sum + (s.total || 0), 0) * 10) / 10
        const averageScore = validScores.length > 0 ? Math.round((totalScore / validScores.length) * 10) / 10 : 0

        const attendancePercentage = termData?.total_days > 0 
          ? ((daysPresent || 0) / termData.total_days) * 100 
          : undefined

        // Get promotion status if Third Term
        let promotionStatus = undefined;
        const isThirdTerm = termData?.name?.toLowerCase().includes('third') || 
                            termData?.name?.toLowerCase().includes('term 3') || 
                            termData?.name?.toLowerCase().includes('3rd') ||
                            termData?.name?.toLowerCase().includes('final');
        
        if (isThirdTerm && termData?.academic_year) {
            try {
                const { data: promoData } = await supabase.rpc('get_or_create_promotion_status', {
                    p_student_id: studentId,
                    p_academic_year: termData.academic_year
                });
                
                if (promoData && promoData.length > 0) {
                    promotionStatus = promoData[0].promotion_status;
                }
            } catch (e) {
                console.error('Error fetching promotion status', e);
            }
        }

        allReports.push({
          student,
          grades: scoresData?.map(s => ({
            subject_name: s.subjects?.name || 'Unknown',
            subject_id: s.subjects?.id || s.subject_id,
            class_score: s.class_score,
            exam_score: s.exam_score,
            total: s.total,
            grade: s.grade,
            remarks: s.remarks,
            rank: subjectRanks[s.subject_id]?.[studentId] || null
          })) || [],
          termName: termData?.name || '',
          year: termData?.academic_year || '',
          daysPresent: daysPresent || 0,
          totalDays: termData?.total_days || 0,
          averageScore: Math.round(averageScore * 10) / 10,
          position: positionMap[studentId] || null,
          totalClassSize: classSize || averages.length,
          promotionStatus,
          remarks: {
            attitude: getAutoRemark('attitude', averageScore, attendancePercentage),
            interest: getAutoRemark('interest', averageScore, attendancePercentage),
            conduct: getAutoRemark('conduct', averageScore, attendancePercentage),
            classTeacher: getAutoRemark('classTeacher', averageScore, attendancePercentage),
            headTeacher: getAutoRemark('headTeacher', averageScore, attendancePercentage)
          }
        })
      }

      setReportData(allReports)
      setLoading(false)
    } catch (error) {
      console.error('Error loading bulk report data:', error)
      setLoading(false)
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    
    try {
      // Load images as base64
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
        toast('Please allow popups to print report cards', { icon: 'ℹ️' })
        return
      }

      const html = generateBulkReportHTML(watermarkBase64, logoBase64, methodistLogoBase64, signatureBase64)
      printWindow.document.write(html)
      printWindow.document.close()

      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 1000)

    } catch (error) {
      console.error('Error printing report cards:', error)
      toast.error('Failed to print report cards')
    } finally {
      setPrinting(false)
    }
  }

  const generateBulkReportHTML = (watermarkBase64: string, logoBase64: string, methodistLogoBase64: string, signatureBase64: string = ''): string => {
    const currentDate = new Date().toLocaleDateString('en-GB')
    const vacationDate = academicSettings?.vacation_start_date
      ? new Date(academicSettings.vacation_start_date + 'T00:00:00').toLocaleDateString('en-GB')
      : ''
    const reopeningDate = academicSettings?.school_reopening_date
      ? new Date(academicSettings.school_reopening_date + 'T00:00:00').toLocaleDateString('en-GB')
      : ''

    const backgroundImage = watermarkBase64 ? `url('${watermarkBase64}')` : 'none'
    const logoImage = logoBase64 || ''
    const methodistLogo = methodistLogoBase64 || ''

    const getPromotionStatusText = (avgScore: number, termName: string, dbStatus?: string): string => {
      if (dbStatus) {
         const status = dbStatus.toLowerCase();
         if (status === 'promoted') return 'PROMOTED';
         if (status === 'promoted_probation') return 'PROMOTED ON PROBATION';
         if (status === 'repeated') return 'REPEATED';
         if (status === 'graduated') return 'GRADUATED';
         return status.toUpperCase();
      }

      const isThirdTerm = termName?.toLowerCase().includes('third') || 
                          termName?.toLowerCase().includes('term 3') ||
                          termName?.toLowerCase().includes('3rd') ||
                          termName?.toLowerCase().includes('final');
      
      if (!isThirdTerm) return ''
      
      if (avgScore >= 30) return 'PROMOTED'
      return 'REPEATED'
    }

    const generateSingleReport = (report: StudentReportData): string => {
      const studentName = `${report.student.last_name || ''} ${report.student.middle_name ? report.student.middle_name + ' ' : ''}${report.student.first_name || ''}`
      const className = report.student.classes?.name || ''

      return `
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
              <div class="info-cell"><span class="info-label">TERM:</span><span class="info-value">${report.termName}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">STD ID:</span><span class="info-value">${report.student.student_id || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">AVG SCORE:</span><span class="info-value">${report.averageScore}%</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">GENDER:</span><span class="info-value">${report.student.gender || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">POS. IN CLASS:</span><span class="info-value">${report.position ? `${report.position}${getOrdinalSuffix(report.position)}` : 'N/A'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">CLASS:</span><span class="info-value">${className}</span></div>
              <div class="info-cell"><span class="info-label">VACATION DATE:</span><span class="info-value">${vacationDate || 'TBA'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">NO. ON ROLL:</span><span class="info-value">${report.totalClassSize || ''}</span></div>
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
              ${report.grades.map((grade: any, index: number) => `
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
                <td><strong>${report.grades.reduce((sum: number, g: any) => sum + (g.total || 0), 0).toFixed(1)}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <!-- Bottom Section -->
          <div class="bottom-section">
            <div class="attendance-box">
              <div class="section-title">ATTENDANCE: ${report.daysPresent || 0} OUT OF ${report.totalDays || 0}</div>
            </div>
            <div class="promotion-box">
              <div class="section-title">PROMOTION STATUS: ${getPromotionStatusText(report.averageScore, report.termName, report.promotionStatus)}</div>
            </div>
          </div>

          <!-- Remarks Section -->
          <div class="remarks-section">
            <div class="remarks-row">
              <div class="remarks-label">ATTITUDE</div>
              <div class="remarks-content">${report.remarks.attitude}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">INTEREST</div>
              <div class="remarks-content">${report.remarks.interest}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">CONDUCT</div>
              <div class="remarks-content">${report.remarks.conduct}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">CLASS TEACHER'S REMARKS</div>
              <div class="remarks-content">${report.remarks.classTeacher}</div>
            </div>
            <div class="remarks-row">
              <div class="remarks-label">HEADTEACHER'S REMARKS</div>
              <div class="remarks-content">${report.remarks.headTeacher}</div>
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
      `
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bulk Report Cards - ${reportData.length} Students</title>
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
              page-break-after: always;
              margin: 0 !important;
              min-height: 260mm !important;
              height: auto !important;
              page-break-inside: avoid !important;
            }
            .watermark-overlay {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .report-card:last-child {
              page-break-after: auto;
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
            margin: 0 auto 20px auto;
            position: relative;
            background: white;
            isolation: isolate;
            page-break-after: always;
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
          .report-card:last-child {
            page-break-after: auto;
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
          .sn-col { width: 30px; }
          .subject-col { width: 180px; }
          .score-col { width: 60px; }
          .total-col { width: 60px; }
          .rank-col { width: 50px; }
          .remarks-col { width: 180px; white-space: nowrap; }
          .total-row { font-weight: bold; }
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
        ${reportData.map(report => generateSingleReport(report)).join('')}
      </body>
      </html>
    `
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report cards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/teacher/reports')}
              className="flex items-center gap-2 text-ghana-green hover:text-green-700"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Reports
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              Bulk Report Cards ({reportData.length} Students)
            </h1>
          </div>
          <button
            onClick={handlePrint}
            disabled={printing || reportData.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
          >
            {printing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Preparing...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Print All Report Cards
              </>
            )}
          </button>
        </div>

        {reportData.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No report data found for the selected students.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Students to Print</h2>
            <div className="space-y-3">
              {reportData.map((report, index) => (
                <div key={report.student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-gray-500">{index + 1}.</span>
                    <div>
                      <p className="font-medium text-gray-800">
                        {report.student.profiles?.full_name || `${report.student.last_name} ${report.student.first_name}`}
                      </p>
                      <p className="text-sm text-gray-600">
                        {report.student.student_id} • {report.student.classes?.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-methodist-blue">{report.averageScore}%</p>
                    <p className="text-sm text-gray-600">
                      Position: {report.position}{report.position ? getOrdinalSuffix(report.position) : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t text-center">
              <button
                onClick={handlePrint}
                disabled={printing}
                className="inline-flex items-center gap-2 px-8 py-3 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium text-lg"
              >
                {printing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Preparing Print...
                  </>
                ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    Print {reportData.length} Report Card{reportData.length > 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function BulkReportCardsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BulkReportCardsContent />
    </Suspense>
  )
}
