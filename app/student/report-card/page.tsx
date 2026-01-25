'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Download, Printer, ArrowLeft, FileText, ChevronDown } from 'lucide-react'
import signatureImg from './signature.png'

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

// Function to determine performance level based on average score
function getPerformanceLevel(averageScore: number): 'excellent' | 'good' | 'average' | 'poor' {
  if (averageScore >= 80) return 'excellent'
  if (averageScore >= 60) return 'good'
  if (averageScore >= 40) return 'average'
  return 'poor'
}

// Seeded random number generator
function seededRandom(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

// Function to get auto-generated remark based on performance and attendance
function getAutoRemark(remarkType: string, averageScore: number, studentId: string, termId: string, attendancePercentage?: number): string {
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
  
  // Return a deterministic remark based on student and term
  if (remarks.length === 0) return ''
  const seed = `${studentId}-${termId}-${remarkType}`
  const index = Math.floor(seededRandom(seed) * remarks.length)
  return remarks[index]
}

// Get all remarks for a type (for manual selection)
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

interface ReportRemarks {
  attitude: string
  interest: string
  conduct: string
  classTeacher: string
  headTeacher: string
}

interface Grade {
  id: string
  subject_name: string
  class_score: number
  exam_score: number
  total: number
  grade: string
  remarks: string
  term_id: string
  rank?: number | null
  academic_terms: {
    name: string
    academic_year: string
  }
}

interface ReportCardData {
  termId: string
  termName: string
  year: string
  grades: Grade[]
  totalScore: number
  averageScore: number
  position: number | null
  totalClassSize: number | null
  daysPresent?: number
  totalDays?: number
  promotionStatus?: string // For Term 3 only
  promotionDecision?: 'promoted' | 'repeated' | 'graduated' | 'pending' | null
  aggregate?: number | null
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

function calculateAggregate(grades: Grade[]): number | null {
  // Buckets for core subjects
  let english: number | null = null
  let math: number | null = null
  let science: number | null = null
  let social: number | null = null
  
  const others: number[] = []
  
  grades.forEach(g => {
    const subject = g.subject_name.toLowerCase()
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

function getOrdinalSuffix(num: number): string {
  const j = num % 10
  const k = num % 100
  if (j === 1 && k !== 11) return 'st'
  if (j === 2 && k !== 12) return 'nd'
  if (j === 3 && k !== 13) return 'rd'
  return 'th'
}

// Get promotion status text based on report data
function getPromotionStatusText(report: ReportCardData): string {
  // Check if this is Term 3 (Third Term)
  const isThirdTerm = report.termName?.toLowerCase().includes('third') || 
                      report.termName?.toLowerCase().includes('term 3') ||
                      report.termName?.toLowerCase().includes('3rd')
  
  // If there's a promotion decision from the database, use it
  if (report.promotionDecision) {
    switch (report.promotionDecision) {
      case 'promoted':
        return 'Promoted'
      case 'repeated':
        return 'Repeated'
      case 'graduated':
        return 'Graduated'
      case 'pending':
        return 'Pending Decision'
      default:
        return ''
    }
  }
  
  // If not Third Term, don't show promotion status
  if (!isThirdTerm) {
    return ''
  }
  
  // Auto-calculate based on average for Third Term when no decision recorded
  // Using 30% as the default passing average as requested
  const avg = report.averageScore || 0
  if (avg >= 30) return 'Promoted'
  return 'Repeated'
}

export default function ReportCardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [reportCards, setReportCards] = useState<ReportCardData[]>([])
  const [selectedTerm, setSelectedTerm] = useState<string>('')
  const [downloading, setDownloading] = useState(false)
  const [studentInfo, setStudentInfo] = useState<any>(null)
  const [academicSettings, setAcademicSettings] = useState<any>(null)
  const printRef = useRef<HTMLDivElement>(null)
  
  // Remarks state - auto or manual selection
  const [remarks, setRemarks] = useState<ReportRemarks>({
    attitude: '',
    interest: '',
    conduct: '',
    classTeacher: '',
    headTeacher: ''
  })
  const [remarkMode, setRemarkMode] = useState<{[key: string]: 'auto' | 'manual'}>({
    attitude: 'auto',
    interest: 'auto',
    conduct: 'auto',
    classTeacher: 'auto',
    headTeacher: 'auto' // Headteacher is always auto
  })
  const [showDropdown, setShowDropdown] = useState<string | null>(null)

  // Update remarks when report changes
  const updateRemarksForReport = (averageScore: number, termId: string, studentId: string, attendancePercentage?: number) => {
    setRemarks({
      attitude: getAutoRemark('attitude', averageScore, studentId, termId, attendancePercentage),
      interest: getAutoRemark('interest', averageScore, studentId, termId, attendancePercentage),
      conduct: getAutoRemark('conduct', averageScore, studentId, termId, attendancePercentage),
      classTeacher: getAutoRemark('classTeacher', averageScore, studentId, termId, attendancePercentage),
      headTeacher: getAutoRemark('headTeacher', averageScore, studentId, termId, attendancePercentage)
    })
  }

  useEffect(() => {
    loadReportCards()
  }, [])

  async function loadReportCards() {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      // Get student profile with personal info
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single() as { data: any }

      if (!profile) {
        console.error('No profile found')
        return
      }

      // Get student info
      const { data: student } = await supabase
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
          classes (name)
        `)
        .eq('profile_id', profile.id)
        .maybeSingle() as { data: any }

      if (!student) {
        console.error('No student record found for this user')
        // If user is admin/teacher trying to access student page, redirect or show message
        if (profile.role !== 'student') {
          alert('You are logged in as ' + profile.role + '. This page is for students only.')
          router.push('/' + profile.role + '/dashboard') 
        }
        return
      }

      setStudentInfo(student)

      // Get academic settings for vacation and reopening dates
      const { data: settings } = await supabase
        .from('academic_settings')
        .select('vacation_start_date, school_reopening_date')
        .single() as { data: any }
      
      setAcademicSettings(settings)

      // Get all scores with term info
      const { data: grades, error } = await supabase
        .from('scores')
        .select(`
          *,
          academic_terms (
            name,
            academic_year
          ),
          subjects (
            name
          )
        `)
        .eq('student_id', student.id)
        .order('academic_terms(academic_year)', { ascending: false })
        .order('academic_terms(name)', { ascending: false }) as { data: any[] | null, error: any }

      if (error) {
        console.error('Error fetching grades:', error)
        return
      }

      // Group grades by term
      const termGroups: { [key: string]: ReportCardData } = {}

      grades?.forEach((grade: any) => {
        const termId = grade.term_id
        const termName = grade.academic_terms?.name || 'Unknown Term'
        const year = grade.academic_terms?.academic_year || 'N/A'

        if (!termGroups[termId]) {
          termGroups[termId] = {
            termId,
            termName,
            year,
            grades: [],
            totalScore: 0,
            averageScore: 0,
            position: null,
            totalClassSize: null
          }
        }

        termGroups[termId].grades.push({
          id: grade.id,
          subject_name: grade.subjects?.name || 'Unknown Subject',
          class_score: grade.class_score,
          exam_score: grade.exam_score,
          total: grade.total,
          // Recalculate grade to ensure consistency with aggregate (BECE 1-9 Scale)
          grade: grade.total !== null ? getGradeValue(grade.total).toString() : '-',
          remarks: grade.remarks,
          term_id: grade.term_id,
          academic_terms: {
            name: termName,
            academic_year: year
          }
        })
      })

      // Calculate totals and averages
      Object.values(termGroups).forEach((report) => {
        const validScores = report.grades
          .map(g => g.total)
          .filter((score): score is number => score !== null)
        
        report.totalScore = Math.round(validScores.reduce((sum, score) => sum + score, 0) * 10) / 10
        report.averageScore = validScores.length > 0 
          ? Math.round(report.totalScore / validScores.length * 10) / 10
          : 0
          
        // Calculate aggregate for JHS students
        const className = (student.classes?.name || '').toLowerCase()
        const isJHS = className.includes('jhs') || 
                      className.includes('basic 7') || 
                      className.includes('basic 8') || 
                      className.includes('basic 9')
        
        if (isJHS) {
          report.aggregate = calculateAggregate(report.grades)
        }
      })

      // Calculate class position and subject ranks for each term in parallel
      await Promise.all(reportCardsArray.map(async (report) => {
        try {
          console.log(`Calculating for term: ${report.termName}, student class_id: ${student.class_id}`)
          
          // Load promotion status for Third Term reports
          const isThirdTerm = report.termName?.toLowerCase().includes('third') || 
                              report.termName?.toLowerCase().includes('term 3') ||
                              report.termName?.toLowerCase().includes('3rd')
          
          const academicYear = report.year || '';

          // Fetch independent data in parallel
          const [attendanceResult, termDataResult, rankingsResponse, promotionDataResult] = await Promise.all([
             supabase
              .from('attendance')
              .select('id', { count: 'exact', head: true }) // optimized: select only id and head
              .eq('student_id', student.id)
              .in('status', ['present', 'late']),
             
             supabase
              .from('academic_terms')
              .select('total_days')
              .eq('id', report.termId)
              .maybeSingle(),

             fetch(`/api/class-rankings?classId=${student.class_id}&termId=${report.termId}`),
            
             isThirdTerm ? supabase
                .from('student_promotions')
                .select('promotion_status, teacher_remarks')
                .eq('student_id', student.id)
                .eq('academic_year', academicYear)
                .limit(1) : Promise.resolve({ data: [] })
          ]);

          
          report.daysPresent = attendanceResult.count || 0
          report.totalDays = (termDataResult.data as any)?.total_days || 0
          
          let rankingsData = { scores: [], totalClassSize: 1 };
          if (rankingsResponse.ok) {
             rankingsData = await rankingsResponse.json();
          }
          
          const classScores = rankingsData.scores || []
          const totalClassSize = rankingsData.totalClassSize || 1
          
          // Store total class size for display
          report.totalClassSize = totalClassSize

          if (classScores && classScores.length > 0) {
            
            // Calculate total scores per student (from classScores only)
            const studentTotals: { [studentId: string]: number } = {}
            classScores.forEach((score: any) => {
              if (!studentTotals[score.student_id]) {
                studentTotals[score.student_id] = 0
              }
              studentTotals[score.student_id] += score.total || 0
            })

            // Sort students by total score (descending)
            const sortedStudents = Object.entries(studentTotals)
              .sort(([, totalA], [, totalB]) => totalB - totalA)

            // Find current student's position
            const position = sortedStudents.findIndex(([sid]) => sid === student.id) + 1
            report.position = position > 0 ? position : null
            

            // Calculate subject ranks
            report.grades.forEach(grade => {
              // Get all scores for this subject (from class scores only)
              const subjectScores = classScores
                .filter((s: any) => (s.subjects as any)?.name === grade.subject_name)
                .map((s: any) => ({ student_id: s.student_id, total: s.total || 0 }))
                .sort((a: any, b: any) => b.total - a.total)

              // Find rank for this student
              const rank = subjectScores.findIndex((s: any) => s.student_id === student.id) + 1
              grade.rank = rank > 0 ? rank : null
            })
          } 
          
          
          if (isThirdTerm) {
             const promotionData = (promotionDataResult as any).data;
            if (promotionData && promotionData.length > 0) {
              const promotion = promotionData[0]
              report.promotionDecision = promotion.promotion_status
              // Optional: Use teacher_remarks if set
              if (promotion.teacher_remarks) {
                report.promotionStatus = promotion.teacher_remarks
              }
            }
          }
        } catch (error) {
          console.error('Error calculating position:', error)
        }
      }));

      setReportCards(reportCardsArray)

      // Select most recent term by default and generate remarks
      if (reportCardsArray.length > 0) {
        const firstReport = reportCardsArray[0]
        const totalDays = firstReport.totalDays || 0
        const daysPresent = firstReport.daysPresent || 0
        
        const attendancePercentage = totalDays > 0 
          ? (daysPresent / totalDays) * 100 
          : undefined
        setSelectedTerm(firstReport.termId)
        updateRemarksForReport(firstReport.averageScore, firstReport.termId, student.id, attendancePercentage)
      }
    } catch (error) {
      console.error('Error loading report cards:', error)
    } finally {
      setLoading(false)
    }
  }

  // Handle term selection change
  const handleTermChange = (termId: string) => {
    setSelectedTerm(termId)
    const report = reportCards.find(r => r.termId === termId)
    if (report && studentInfo?.id) {
      const totalDays = report.totalDays || 0
      const daysPresent = report.daysPresent || 0
      
      const attendancePercentage = totalDays > 0 
        ? (daysPresent / totalDays) * 100 
        : undefined
      updateRemarksForReport(report.averageScore, termId, studentInfo.id, attendancePercentage)
    }
  }

  // Handle remark change (manual selection)
  const handleRemarkChange = (type: keyof ReportRemarks, value: string) => {
    setRemarks(prev => ({ ...prev, [type]: value }))
    setShowDropdown(null)
  }

  // Toggle between auto and manual mode
  const toggleRemarkMode = (type: string) => {
    if (type === 'headTeacher') return // Headteacher is always auto
    
    const newMode = remarkMode[type] === 'auto' ? 'manual' : 'auto'
    setRemarkMode(prev => ({ ...prev, [type]: newMode }))
    
    // If switching to auto, regenerate the remark
    if (newMode === 'auto') {
      const report = reportCards.find(r => r.termId === selectedTerm)
      if (report && studentInfo?.id) {
        setRemarks(prev => ({ ...prev, [type]: getAutoRemark(type, report.averageScore, studentInfo.id, selectedTerm) }))
      }
    }
  }

  async function downloadPDF(termId: string) {
    try {
      setDownloading(true)
      const report = reportCards.find(r => r.termId === termId)
      if (!report) return

      // Convert watermark image to base64 for proper loading in print window
      let watermarkBase64 = ''
      try {
        const response = await fetch('/school_crest-removebg-preview (2).png')
        const blob = await response.blob()
        watermarkBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (imgError) {
        console.warn('Could not load watermark image:', imgError)
      }

      // Convert school crest logo image to base64 (left logo)
      let logoBase64 = ''
      try {
        const response = await fetch('/school_crest.png')
        const blob = await response.blob()
        logoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (imgError) {
        console.warn('Could not load school crest logo:', imgError)
      }

      // Convert Methodist logo image to base64 (right logo)
      let methodistLogoBase64 = ''
      try {
        const response = await fetch('/Methodist_logo.png')
        const blob = await response.blob()
        methodistLogoBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      } catch (imgError) {
        console.warn('Could not load Methodist logo:', imgError)
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

      // Create print-friendly window
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('Please allow pop-ups to download the report card')
        return
      }

      const html = generateReportHTML(report, academicSettings, watermarkBase64, logoBase64, methodistLogoBase64, signatureBase64)
      printWindow.document.write(html)
      printWindow.document.close()
      
      // Wait for content and fonts to load then trigger print
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
      }, 500)
    } catch (error) {
      console.error('Error generating PDF:', error)
      alert('Failed to generate report card. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  function generateReportHTML(report: ReportCardData, academicSettings: any, watermarkBase64: string = '', logoBase64: string = '', methodistLogoBase64: string = '', signatureBase64: string = ''): string {
    const currentDate = new Date().toLocaleDateString('en-GB')
    
    // Format dates for display
    console.log('Academic Settings in PDF:', academicSettings)
    const vacationDate = academicSettings?.vacation_start_date 
      ? new Date(academicSettings.vacation_start_date + 'T00:00:00').toLocaleDateString('en-GB')
      : ''
    const reopeningDate = academicSettings?.school_reopening_date
      ? new Date(academicSettings.school_reopening_date + 'T00:00:00').toLocaleDateString('en-GB')
      : ''
    console.log('Formatted dates - Vacation:', vacationDate, 'Reopening:', reopeningDate)

    // Use base64 images or fallback to empty
    const backgroundImage = watermarkBase64 ? `url('${watermarkBase64}')` : 'none'
    const logoImage = logoBase64 || ''
    const methodistLogo = methodistLogoBase64 || ''
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Report Card - ${studentInfo?.first_name} ${studentInfo?.last_name}</title>
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
            position: relative;
            z-index: 1;
            background-color: rgba(255, 255, 255, 0.92);
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
            font-size: 12pt;
            margin: 1px 0;
            color: #00008B;
          }
          .school-address.box {
            font-size: 14pt;
          }
          .school-motto {
            font-size: 11pt;
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
              <div class="info-cell"><span class="info-label">NAME:</span><span class="info-value">${studentInfo?.last_name} ${studentInfo?.middle_name ? studentInfo.middle_name + ' ' : ''}${studentInfo?.first_name}</span></div>
              <div class="info-cell"><span class="info-label">TERM:</span><span class="info-value">${report.termName}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">STD ID:</span><span class="info-value">${studentInfo?.student_id || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">AVG SCORE:</span><span class="info-value">${report.averageScore}%${(report.aggregate !== null && report.aggregate !== undefined) ? ` | AGG: ${report.aggregate}` : ''}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">GENDER:</span><span class="info-value">${studentInfo?.gender || 'N/A'}</span></div>
              <div class="info-cell"><span class="info-label">POS. IN CLASS:</span><span class="info-value">${report.position ? `${report.position}${getOrdinalSuffix(report.position)}` : 'N/A'}</span></div>
            </div>
            <div class="info-row">
              <div class="info-cell"><span class="info-label">CLASS:</span><span class="info-value">${Array.isArray(studentInfo?.classes) ? studentInfo.classes[0]?.name : studentInfo?.classes?.name}</span></div>
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
              ${report.grades.map((grade, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td style="text-align: left;">${grade.subject_name.replace(/\s*\((LP|UP|JHS)\)\s*$/i, '').toUpperCase()}</td>
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
                <td><strong>${report.totalScore !== null && report.totalScore !== undefined ? Number(report.totalScore).toFixed(1) : ''}</strong></td>
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
              <div class="section-title">PROMOTION STATUS: ${report.promotionStatus || getPromotionStatusText(report)}</div>
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

  const selectedReport = reportCards.find(r => r.termId === selectedTerm)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto mb-4"></div>
              <p className="text-gray-600">Loading report cards...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (studentInfo?.results_withheld) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/student/dashboard')}
              className="flex items-center gap-2 text-methodist-blue hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-methodist-blue">Report Cards</h1>
          </div>

          <div className="bg-white rounded-lg shadow p-12 text-center border-l-4 border-red-500">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Results Withheld</h3>
            <p className="text-gray-600 mb-6 max-w-lg mx-auto">
              Your report card has been withheld by the administration. Please contact the school office for more information.
            </p>
            
            {studentInfo.withheld_reason && (
              <div className="bg-red-50 p-4 rounded-lg max-w-md mx-auto text-left">
                <p className="text-sm font-semibold text-red-800 mb-1">Reason:</p>
                <p className="text-red-700">{studentInfo.withheld_reason}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="flex items-center gap-2 text-methodist-blue hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl md:text-3xl font-bold text-methodist-blue">Report Cards</h1>
          <p className="text-gray-600 mt-2 text-sm md:text-base">View and download your academic reports</p>
        </div>

        {reportCards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Report Cards Available</h3>
            <p className="text-gray-600">Your report cards will appear here once grades are published.</p>
          </div>
        ) : (
          <>
            {/* Term Selector */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Academic Term
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reportCards.map((report) => (
                  <button
                    key={report.termId}
                    onClick={() => handleTermChange(report.termId)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      selectedTerm === report.termId
                        ? 'border-methodist-blue bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-800">{report.termName}</div>
                    <div className="text-sm text-gray-600">{report.year}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {report.grades.length} subjects
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Report Card */}
            {selectedReport && (
              <div className="bg-white rounded-lg shadow">
                {/* Report Header */}
                <div className="border-b border-gray-200 p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                        {selectedReport.termName} Report
                      </h2>
                      <p className="text-gray-600 mt-1 text-sm md:text-base">
                        Academic Year: {selectedReport.year}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadPDF(selectedReport.termId)}
                      disabled={downloading}
                      className="w-full md:w-auto flex items-center justify-center gap-2 bg-methodist-blue text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {downloading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Download PDF
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Grades Table */}
                <div className="p-4 md:p-6">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px]">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-2 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Class Score
                          </th>
                          <th className="px-2 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Exam Score
                          </th>
                          <th className="px-2 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                          <th className="px-2 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Grade
                          </th>
                          <th className="px-2 md:px-6 py-3 text-center text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Rank
                          </th>
                          <th className="px-3 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                            Remarks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedReport.grades.map((grade) => (
                          <tr key={grade.id} className="hover:bg-gray-50">
                            <td className="px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                              {grade.subject_name.replace(/\s*\((LP|UP|JHS)\)\s*$/i, '')}
                            </td>
                            <td className="px-2 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 text-center">
                              {grade.class_score ?? '-'}
                            </td>
                            <td className="px-2 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-600 text-center">
                              {grade.exam_score ?? '-'}
                            </td>
                            <td className="px-2 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm font-semibold text-gray-900 text-center">
                              {grade.total ?? '-'}
                            </td>
                            <td className="px-2 md:px-6 py-4 whitespace-nowrap text-center">
                              <span className={`inline-flex px-2 md:px-3 py-1 text-[10px] md:text-xs font-semibold rounded-full ${
                                grade.grade === 'A' ? 'bg-green-100 text-green-800' :
                                grade.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                grade.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                grade.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {grade.grade || '-'}
                              </span>
                            </td>
                            <td className="px-2 md:px-6 py-4 whitespace-nowrap text-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium bg-blue-100 text-blue-800">
                                {grade.rank ? `${grade.rank}${getOrdinalSuffix(grade.rank)}` : '-'}
                              </span>
                            </td>
                            <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-gray-600">
                              {grade.remarks || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary */}
                <div className="border-t border-gray-200 p-4 md:p-6 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6">
                    <div className="text-center p-2 bg-white rounded shadow-sm md:shadow-none md:bg-transparent">
                      <p className="text-xs md:text-sm text-gray-600 mb-1">Total Subjects</p>
                      <p className="text-lg md:text-3xl font-bold text-methodist-blue">
                        {selectedReport.grades.length}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded shadow-sm md:shadow-none md:bg-transparent">
                      <p className="text-xs md:text-sm text-gray-600 mb-1">Total Score</p>
                      <p className="text-lg md:text-3xl font-bold text-green-600">
                        {selectedReport.totalScore}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded shadow-sm md:shadow-none md:bg-transparent">
                      <p className="text-xs md:text-sm text-gray-600 mb-1">Average Score</p>
                      <p className="text-lg md:text-3xl font-bold text-purple-600">
                        {selectedReport.averageScore}%
                      </p>
                    </div>
                    {(selectedReport.aggregate !== null && selectedReport.aggregate !== undefined) && (
                      <div className="text-center p-2 bg-white rounded shadow-sm md:shadow-none md:bg-transparent">
                        <p className="text-xs md:text-sm text-gray-600 mb-1">Aggregate</p>
                        <p className="text-lg md:text-3xl font-bold text-red-600">
                          {selectedReport.aggregate}
                        </p>
                      </div>
                    )}
                    <div className="text-center p-2 bg-white rounded shadow-sm md:shadow-none md:bg-transparent">
                      <p className="text-xs md:text-sm text-gray-600 mb-1">Attendance</p>
                      <p className="text-lg md:text-3xl font-bold text-blue-600">
                        {selectedReport.daysPresent || 0}/{selectedReport.totalDays || 0}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white rounded shadow-sm md:shadow-none md:bg-transparent col-span-2 md:col-span-1">
                      <p className="text-xs md:text-sm text-gray-600 mb-1">Class Position</p>
                      <p className="text-lg md:text-3xl font-bold text-orange-600">
                        {selectedReport.position ? `${selectedReport.position}${getOrdinalSuffix(selectedReport.position)} / ${selectedReport.totalClassSize || '-'}` : '-'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Remarks Editor */}
                <div className="border-t border-gray-200 p-4 md:p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Report Card Remarks</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Remarks are auto-generated based on student performance.
                  </p>
                  
                  <div className="space-y-4 md:space-y-6">
                    {/* Attitude */}
                    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Attitude</label>
                      </div>
                      <div className="flex-1 relative">
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">{remarks.attitude}</p>
                      </div>
                    </div>

                    {/* Interest */}
                    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Interest</label>
                      </div>
                      <div className="flex-1 relative">
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">{remarks.interest}</p>
                      </div>
                    </div>

                    {/* Conduct */}
                    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Conduct</label>
                      </div>
                      <div className="flex-1 relative">
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">{remarks.conduct}</p>
                      </div>
                    </div>

                    {/* Class Teacher's Remarks */}
                    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Class Teacher's Remarks</label>
                      </div>
                      <div className="flex-1 relative">
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">{remarks.classTeacher}</p>
                      </div>
                    </div>

                    {/* Headteacher's Remarks */}
                    <div className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4">
                      <div className="w-full md:w-48 flex-shrink-0">
                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide">Headteacher's Remarks</label>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100">{remarks.headTeacher}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
