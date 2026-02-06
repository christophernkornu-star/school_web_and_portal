'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Download, Save, RefreshCw } from 'lucide-react'
import signatureImg from '@/app/student/report-card/signature.png'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'

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
  
  let selectedRemark = remarks[Math.floor(Math.random() * remarks.length)]

  // Append attendance remark for attitude if attendance is poor (50% or less)
  if (remarkType === 'attitude' && attendancePercentage !== undefined && attendancePercentage <= 50) {
    const poorAttendancePhrases = [". Not regular in school", ". Truant"];
    const extraPhrase = poorAttendancePhrases[Math.floor(Math.random() * poorAttendancePhrases.length)];
    selectedRemark += extraPhrase;
  }
  
  return selectedRemark
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
  const [classScorePercentage, setClassScorePercentage] = useState(40)
  const [examScorePercentage, setExamScorePercentage] = useState(60)
  
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

      // 1. Initial Parallel Fetch (Authentication, Settings, Student Basic Info)
      const [
        teacherRes,
        settingsRes,
        studentRes,
        academicSettingsRes
      ] = await Promise.all([
        getTeacherData(user.id),
        supabase.from('system_settings').select('*').in('setting_key', ['class_score_percentage', 'exam_score_percentage']),
        supabase.from('students').select('*, profiles(id, full_name, email), classes(id, name, level, category)').eq('id', studentId).single(),
        supabase.from('academic_settings').select('*').single()
      ])

      // Validate & Set Basic Data
      if (!teacherRes.data) {
        router.push('/login?portal=teacher')
        return
      }
      setTeacher(teacherRes.data)

      if (studentRes.error || !studentRes.data) {
        console.error('Error loading student:', studentRes.error)
        toast.error('Student not found')
        router.push('/teacher/reports')
        return
      }
      setStudent(studentRes.data)
      const studentData = studentRes.data

      if (academicSettingsRes.data) {
        setAcademicSettings(academicSettingsRes.data)
      }

      // Configure Grading Percentages
      if (settingsRes.data) {
          settingsRes.data.forEach((setting: any) => {
            if (setting.setting_key === 'class_score_percentage') {
              setClassScorePercentage(Number(setting.setting_value))
            } else if (setting.setting_key === 'exam_score_percentage') {
              setExamScorePercentage(Number(setting.setting_value))
            }
          })
      }

      // 2. Secondary Parallel Fetch (Report Data dependent on IDs)
      const [
        classStudentsRes,
        scoresDataRes,
        attendanceRes,
        termDataRes,
        allTermScoresRes,
        classScoresDataRes,
        subjectsRes
      ] = await Promise.all([
        // Class Students (IDs for position calculation)
        supabase.from('students').select('id').eq('class_id', studentData.class_id),
        // Student Scores
        supabase.from('scores').select('*, subjects(id, name), academic_terms(name, academic_year)').eq('student_id', studentId).eq('term_id', termId).order('created_at'),
        // Attendance
        supabase.from('attendance').select('id', { count: 'exact' }).eq('student_id', studentId).in('status', ['present', 'late']),
        // Term Metadata
        fetch(`/api/term-data?termId=${termId}`).then(res => res.ok ? res.json() : null),
        // Subject Ranks (All students in term)
        supabase.from('scores').select('student_id, subject_id, total').eq('term_id', termId).not('total', 'is', null),
        // Class Position (All students in term)
        supabase.from('scores').select('student_id, total').eq('term_id', termId).not('total', 'is', null),
        // All Subjects for Level
        supabase.from('subjects').select('id, name').eq('level', studentData.classes?.level)
      ])

      const classStudents = classStudentsRes.data || []
      const classStudentIds = new Set(classStudents.map((s: any) => s.id))
      const classSize = classStudents.length
      
      const scoresData = scoresDataRes.data as any[] | null
      const daysPresent = attendanceRes.count
      const termData = termDataRes
      const allTermScores = allTermScoresRes.data as any[] | null
      const classScoresData = classScoresDataRes.data as any[] | null
      const allSubjects = subjectsRes.data || []

      // Calculate average (Using all subjects available at level)
      const validScores = scoresData?.filter(s => s.total !== null) || []
      const totalScore = Math.round(validScores.reduce((sum, s) => sum + (s.total || 0), 0) * 10) / 10
      const totalSubjectsCount = allSubjects.length > 0 ? allSubjects.length : (validScores.length || 1)
      const averageScore = Math.round((totalScore / totalSubjectsCount) * 10) / 10

      // Calculate subject ranks (Filtered by class)
      const subjectRanks: { [subjectId: string]: { [studentId: string]: number } } = {}
      if (allTermScores) {
        // Group scores by subject
        const subjectScores: { [subjectId: string]: { studentId: string, total: number }[] } = {}
        allTermScores.forEach(score => {
          // Only rank against class members
          if (classStudentIds.has(score.student_id)) {
            if (!subjectScores[score.subject_id]) {
              subjectScores[score.subject_id] = []
            }
            subjectScores[score.subject_id].push({ studentId: score.student_id, total: score.total })
          }
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

      // Group by student and calculate averages (Filtered by class, using fixed subject count)
      const studentAverages: any = {}
      
      // Initialize all class students with 0
      classStudentIds.forEach((sid: any) => {
          studentAverages[sid] = 0
      })

      classScoresData?.forEach((score: any) => {
        if (classStudentIds.has(score.student_id)) {
           studentAverages[score.student_id] += (score.total || 0)
        }
      })

      const averages = Object.entries(studentAverages).map(([sid, total]: any) => ({
        student_id: sid,
        average: totalSubjectsCount > 0 ? (total as number) / totalSubjectsCount : 0
      }))

      averages.sort((a: any, b: any) => b.average - a.average)
      const position = averages.findIndex((a: any) => a.student_id === studentId) + 1

      // Map all subjects to grades, filling in missing ones
      const grades = allSubjects.length > 0 
        ? allSubjects.map((subject: any) => {
            const score = scoresData?.find(s => s.subject_id === subject.id || s.subjects?.id === subject.id)
            return {
                subject_name: score?.subjects?.name || subject.name,
                subject_id: subject.id,
                class_score: score?.class_score || '-',
                exam_score: score?.exam_score || '-',
                total: score?.total || null,
                grade: score?.total !== null && score?.total !== undefined ? getGradeValue(score.total).toString() : '-',
                remarks: score?.remarks || '-',
                rank: score ? (subjectRanks[subject.id]?.[studentId] || '-') : '-'
            }
        })
        : (scoresData?.map(s => ({
            subject_name: s.subjects?.name || 'Unknown',
            subject_id: s.subjects?.id || s.subject_id,
            class_score: s.class_score,
            exam_score: s.exam_score,
            total: s.total,
            // Recalculate grade to ensure consistency with aggregate (BECE 1-9 Scale)
            grade: s.total !== null ? getGradeValue(s.total).toString() : '-',
            remarks: s.remarks,
            rank: subjectRanks[s.subject_id]?.[studentId] || null
          })) || [])

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

      // Get promotion status if Third Term
      let promotionStatus = null;
      let teacherRemarks = null;
      const isThirdTerm = termData?.name?.toLowerCase().includes('third') || 
                          termData?.name?.toLowerCase().includes('term 3') || 
                          termData?.name?.toLowerCase().includes('3rd') ||
                          termData?.name?.toLowerCase().includes('final');
      
      if (isThirdTerm && termData?.academic_year) {
         try {
             // Use RPC to get or create status
             const { data: promoData } = await supabase.rpc('get_or_create_promotion_status', {
                 p_student_id: studentId,
                 p_academic_year: termData.academic_year
             });
             
             if (promoData && promoData.length > 0) {
                 promotionStatus = promoData[0].promotion_status;
                 teacherRemarks = promoData[0].teacher_remarks;
             }
         } catch(e) {
             console.error('Error fetching promotion status', e);
         }
      }

      setReportData({
        grades,
        termName: termData?.name || '',
        year: termData?.academic_year || '',
        daysPresent: daysPresent || 0,
        totalDays: termData?.total_days || 0,
        averageScore: Math.round(averageScore * 10) / 10,
        position: position > 0 ? position : null,
        totalClassSize: classSize || averages.length,
        aggregate,
        promotionStatus,
        promotionTeacherRemarks: teacherRemarks
      })

      // Generate auto remarks
      const attendancePercentage = (termData?.total_days && daysPresent !== null) 
        ? (daysPresent / termData.total_days) * 100 
        : undefined

      const autoRemarks = {
        attitude: getAutoRemark('attitude', averageScore, attendancePercentage),
        interest: getAutoRemark('interest', averageScore, attendancePercentage),
        conduct: getAutoRemark('conduct', averageScore, attendancePercentage),
        classTeacher: getAutoRemark('classTeacher', averageScore, attendancePercentage),
        headTeacher: getAutoRemark('headTeacher', averageScore, attendancePercentage)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="container mx-auto px-4 py-4">
             <div className="flex gap-4 items-center">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div>
                   <Skeleton className="h-6 w-48 mb-2" />
                   <Skeleton className="h-4 w-32" />
                </div>
             </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-5xl">
             <div className="grid md:grid-cols-3 gap-6 mb-8">
                 <Skeleton className="h-32 rounded-xl" />
                 <Skeleton className="h-32 rounded-xl" />
                 <Skeleton className="h-32 rounded-xl" />
             </div>
             <div className="space-y-6">
                <Skeleton className="h-64 rounded-xl" />
                <Skeleton className="h-96 rounded-xl" />
             </div>
        </main>
      </div>
    )
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
        toast('Please allow popups to download report card', { icon: 'ℹ️' })
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
      toast.error('Failed to generate report card')
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
    // Format: Lastname, Middlename, Firstname
    const nameParts = [student.last_name, student.middle_name, student.first_name].filter(part => part && part.trim() !== '')
    const studentName = nameParts.join(', ')
    const className = student.classes?.name || student.classes?.class_name || ''

    // Determine promotion status
    const getPromotionStatusText = (): string => {
      // Use database status if available
      if (reportData.promotionStatus) {
         const status = reportData.promotionStatus.toLowerCase();
         if (status === 'promoted') return 'PROMOTED';
         if (status === 'promoted_probation') return 'PROMOTED ON PROBATION';
         if (status === 'repeated') return 'REPEATED';
         if (status === 'graduated') return 'GRADUATED';
         return status.toUpperCase();
      }

      const isThirdTerm = reportData.termName?.toLowerCase().includes('third') || 
                          reportData.termName?.toLowerCase().includes('term 3') ||
                          reportData.termName?.toLowerCase().includes('3rd') ||
                          reportData.termName?.toLowerCase().includes('final')
      
      if (!isThirdTerm) return ''
      
      // If we have explicit promotion status from DB, use it
      const avg = reportData.averageScore || 0
      if (avg >= 30) return 'PROMOTED'
      return 'REPEATED'
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
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            gap: 10px;
          }
          .close-btn {
            background-color: #ef4444;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .close-btn:hover {
            background-color: #dc2626;
          }
          .print-btn {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-family: sans-serif;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .print-btn:hover {
            background-color: #2563eb;
          }
        </style>
      </head>
      <body>
        <div class="print-controls no-print">
          <button onclick="window.print()" class="print-btn">Print Report</button>
          <button onclick="window.close()" class="close-btn">Close</button>
        </div>
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
              <div class="info-cell"><span class="info-label">STD ID:</span><span class="info-value">${student.student_id || 'N/A'} | ACAD. YR.: ${reportData.year || ''}</span></div>
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
                <th class="score-col">CLASS SCORE<br/>${classScorePercentage}%</th>
                <th class="score-col">EXAM SCORE<br/>${examScorePercentage}%</th>
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
            © Biriwa Methodist School. All rights reserved. This document is official only when presented in its original color format with the blue textured watermark. Generated on: 28/01/2026.
          </div>
          <div class="copyright-footer">@2025 FortSoft. All rights reserved.</div>
        </div>
      </body>
      </html>
    `
  }

  const getClassName = () => (student?.classes?.name || student?.classes?.class_name || '').toLowerCase()
  const isJHSClass = () => {
    const name = getClassName()
    return name.includes('jhs') || name.includes('basic 7') || name.includes('basic 8') || name.includes('basic 9') || name.includes('form 1') || name.includes('form 2') || name.includes('form 3')
  }

  const getGradeLabel = (score: number) => {
    if (isJHSClass()) {
      if (score >= 80) return 'HP'
      if (score >= 60) return 'P' // 70-79 and 60-69 match P based on logic, or distinct?
      // Based on request: 70-79 Proficient, 60-69 Proficient. So >= 60 is P.
      if (score >= 50) return 'AP'
      if (score >= 40) return 'D'
      return 'E'
    } else {
      // Primary
      if (score >= 80) return 'A'
      if (score >= 70) return 'P'
      if (score >= 60) return 'AP'
      if (score >= 50) return 'D'
      return 'B'
    }
  }

  const getGradeColorClass = (score: number, type: 'text' | 'bg') => {
    // Shared color logic roughly based on performance
    let color = 'red'
    if (score >= 80) color = 'green'
    else if (score >= 70) color = 'blue'
    else if (score >= 60) color = 'cyan' // or some other color?
    else if (score >= 50) color = 'yellow'
    
    // Adjust for specific schemes
    if (isJHSClass()) {
        if (score >= 80) color = 'green' // HP
        else if (score >= 60) color = 'blue' // P
        else if (score >= 50) color = 'yellow' // AP
        else if (score >= 40) color = 'orange' // D
        else color = 'red' // E
    } else {
        if (score >= 80) color = 'green' // A
        else if (score >= 70) color = 'blue' // P
        else if (score >= 60) color = 'cyan' // AP
        else if (score >= 50) color = 'yellow' // D
        else color = 'red' // B
    }

    if (type === 'text') {
        if (color === 'cyan') return 'text-cyan-600'
        return `text-${color}-600`
    }
    // bg
    if (color === 'cyan') return 'bg-cyan-100'
    return `bg-${color}-100`
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
              <Link 
                href="/teacher/reports" 
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" />
              </Link>
              <div className="min-w-0">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">
                  {[student?.last_name, student?.middle_name, student?.first_name].filter(Boolean).join(', ')}
                </h1>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {student?.student_id} • {reportData?.termName}
                </p>
              </div>
            </div>
            
            <button
              onClick={downloadPDF}
              disabled={downloading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-ghana-green text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm md:text-base font-medium shadow-sm active:scale-95"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 md:w-5 md:h-5" />
                  <span>Generate Report Card</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 md:py-8 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 dark:border-gray-700">
             <div className="flex items-center justify-between">
                <div>
                   <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Average Score</p>
                   <p className={`text-2xl md:text-3xl font-bold mt-1 ${getGradeColorClass(reportData?.averageScore || 0, 'text')}`}>{reportData?.averageScore}%</p>
                </div>
                {/* Visual Indicator */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getGradeColorClass(reportData?.averageScore || 0, 'bg')} ${getGradeColorClass(reportData?.averageScore || 0, 'text')}`}>
                   <span className="font-bold text-lg">
                      {getGradeLabel(reportData?.averageScore || 0)}
                   </span>
                </div>
             </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 dark:border-gray-700">
             <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Position</p>
                <div className="flex items-baseline gap-1 mt-1">
                   <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                      {reportData?.position || '-'}
                      <span className="text-base md:text-lg font-normal text-gray-500 ml-0.5">
                        {reportData?.position ? getOrdinalSuffix(reportData.position) : ''}
                      </span>
                   </p>
                   <span className="text-sm md:text-base text-gray-500 dark:text-gray-400">/ {reportData?.totalClassSize}</span>
                </div>
             </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 border border-gray-100 dark:border-gray-700">
             <div>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium">Performance Status</p>
                <p className={`text-lg md:text-xl font-bold mt-2 inline-block px-3 py-1 rounded-lg ${
                   getPerformanceLevel(reportData?.averageScore || 0) === 'excellent' ? 'bg-green-100 text-green-700' :
                   getPerformanceLevel(reportData?.averageScore || 0) === 'good' ? 'bg-blue-100 text-blue-700' :
                   getPerformanceLevel(reportData?.averageScore || 0) === 'average' ? 'bg-yellow-100 text-yellow-700' :
                   'bg-red-100 text-red-700'
                }`}>
                   {getPerformanceLevel(reportData?.averageScore || 0).toUpperCase()}
                </p>
             </div>
          </div>
        </div>

        {/* Subjects Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-8">
           <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg">Academic Performance</h3>
           </div>
           <div className="overflow-x-auto">
              <table className="w-full">
                 <thead className="bg-gray-50 dark:bg-gray-700/50 text-left">
                    <tr>
                       <th className="px-4 md:px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                       <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Class ({classScorePercentage}%)</th>
                       <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam ({examScorePercentage}%)</th>
                       <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                       <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                       <th className="px-4 md:px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Pos</th>
                       <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Remarks</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {reportData?.grades.map((grade: any, index: number) => (
                       <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-4 md:px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{grade.subject_name}</td>
                          <td className="px-4 md:px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">{grade.class_score || '-'}</td>
                          <td className="px-4 md:px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300">{grade.exam_score || '-'}</td>
                          <td className="px-4 md:px-6 py-4 text-center text-sm font-bold text-gray-900 dark:text-white">{grade.total || '-'}</td>
                          <td className="px-4 md:px-6 py-4 text-center">
                             <span className={`inline-block w-8 h-8 leading-8 text-xs font-bold rounded-full ${
                                 (grade.total || 0) >= 80 ? 'bg-green-100 text-green-700' :
                                 (grade.total || 0) >= 60 ? 'bg-blue-100 text-blue-700' :
                                 (grade.total || 0) >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                             }`}>
                                {getGradeValue(grade.total || 0)}
                             </span>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-300 hidden sm:table-cell">
                             {grade.rank ? `${grade.rank}${getOrdinalSuffix(grade.rank)}` : '-'}
                          </td>
                          <td className="px-4 md:px-6 py-4 text-sm text-gray-600 dark:text-gray-300 hidden md:table-cell min-w-[200px]">
                             {grade.remarks && grade.remarks !== '-' ? grade.remarks : (
                                grade.total !== null && grade.total !== undefined ? (
                                    grade.total >= 80 ? 'Excellent performance' : 
                                    grade.total >= 60 ? 'Good work' : 
                                    grade.total >= 50 ? 'Credit' : 
                                    grade.total >= 40 ? 'Pass' : 'Fail'
                                ) : '-'
                             )}
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        {/* Remarks Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg">Teacher's Remarks</h3>
              <button
                onClick={applyAutoRemarks}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                 <RefreshCw className="w-4 h-4" />
                 Regenerate Suggestions
              </button>
           </div>
           
           <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Conduct</label>
                    <div className="relative">
                       <input
                          type="text"
                          value={remarks.conduct}
                          onChange={(e) => handleRemarkChange('conduct', e.target.value)}
                          list="conduct-list"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Student's behavior..."
                       />
                       <datalist id="conduct-list">
                          {getAllRemarks('conduct').map((r, i) => <option key={i} value={r} />)}
                       </datalist>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attitude</label>
                    <div className="relative">
                       <input
                          type="text"
                          value={remarks.attitude}
                          onChange={(e) => handleRemarkChange('attitude', e.target.value)}
                          list="attitude-list"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Attitude towards learning..."
                       />
                       <datalist id="attitude-list">
                          {getAllRemarks('attitude').map((r, i) => <option key={i} value={r} />)}
                       </datalist>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interest</label>
                    <div className="relative">
                       <input
                          type="text"
                          value={remarks.interest}
                          onChange={(e) => handleRemarkChange('interest', e.target.value)}
                          list="interest-list"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="Special interests..."
                       />
                       <datalist id="interest-list">
                          {getAllRemarks('interest').map((r, i) => <option key={i} value={r} />)}
                       </datalist>
                    </div>
                 </div>

                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Class Teacher's Remark</label>
                    <div className="relative">
                       <input
                          type="text"
                          value={remarks.classTeacher}
                          onChange={(e) => handleRemarkChange('classTeacher', e.target.value)}
                          list="teacher-list"
                          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                          placeholder="General performance remark..."
                       />
                       <datalist id="teacher-list">
                          {getAllRemarks('classTeacher').map((r, i) => <option key={i} value={r} />)}
                       </datalist>
                    </div>
                 </div>
              </div>

               <div>
                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Head Teacher's Remark (Suggestion)</label>
                 <div className="relative">
                    <input
                       type="text"
                       value={remarks.headTeacher}
                       onChange={(e) => handleRemarkChange('headTeacher', e.target.value)}
                       list="headteacher-list"
                       className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-ghana-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                       placeholder="Remark for Head Teacher's approval..."
                    />
                    <datalist id="headteacher-list">
                       {getAllRemarks('headTeacher').map((r, i) => <option key={i} value={r} />)}
                    </datalist>
                 </div>
              </div>
           </div>
        </div>

      </main>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
