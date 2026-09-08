'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { List, Download, RefreshCw, Save, Wand2, ChevronDown } from 'lucide-react'
import signatureImg from '@/app/student/report-card/signature.png'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getAutoRemark, ATTITUDE_REMARKS, INTEREST_REMARKS, CONDUCT_REMARKS, CLASS_TEACHER_REMARKS } from '@/lib/remark-utils'
import { useReportCardData } from '@/lib/reports/hooks'
import { generateReportHTML } from '@/lib/reports/generator'
import { ReportCardTheme, ReportRemarks, Grade } from '@/lib/reports/types'
import { isClassTeacher } from '@/lib/teacher-permissions'

const attitudeOptions = Object.values(ATTITUDE_REMARKS).flat();
const interestOptions = Object.values(INTEREST_REMARKS).flat();
const conductOptions = Object.values(CONDUCT_REMARKS).flat();
const classTeacherOptions = Object.values(CLASS_TEACHER_REMARKS).flat();

function RemarkDropdown({ options, onSelect }: { options: string[], onSelect: (val: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center" onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
            setOpen(false)
        }
    }}>
      <button 
        type="button" 
        onClick={() => setOpen(!open)}
        className="ml-2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#003B5C]"
        aria-label="Quick Select Remark"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-2xl z-50 max-h-60 overflow-y-auto p-1.5">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl cursor-pointer transition-colors"
              onClick={() => {
                onSelect(opt);
                setOpen(false);
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function TeacherStudentReportPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const params = useParams()
  const searchParams = useSearchParams()
  const studentId = params.id as string
  const termId = searchParams.get('term')
  const classParam = searchParams.get('class')
  const backHref = classParam ? '/teacher/reports/historical' : '/teacher/reports'
  
  const [downloading, setDownloading] = useState(false)
  const [remarks, setRemarks] = useState<ReportRemarks>({
    attitude: '',
    interest: '',
    conduct: '',
    classTeacher: '',
    headTeacher: ''
  })
  const [theme, setTheme] = useState<ReportCardTheme>({})
  const [teacher, setTeacher] = useState<any>(null)
  const [isTeacherClassTeacher, setIsTeacherClassTeacher] = useState(false)
  
  // Auth Check
  useEffect(() => {
    const checkAuth = async () => {
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
    }
    checkAuth()
  }, [router])

  // Use shared hook
  const { 
      loading, 
      error, 
      student, 
      reportData, 
      academicSettings, 
      scoreSettings,
      refresh 
  } = useReportCardData(
    studentId,
    termId || undefined,
    { restrictCurrentClassOnly: !classParam }
  )

  // Check if current teacher is the class teacher
  useEffect(() => {
    const checkClassTeacher = async () => {
      if (teacher?.profile_id && student?.class_id) {
        const isClass = await isClassTeacher(teacher.profile_id, student.class_id)
        setIsTeacherClassTeacher(isClass)
      }
    }
    checkClassTeacher()
  }, [teacher, student])

  // Sync remarks when report data loads
  useEffect(() => {
    if (reportData) {
      const avgScore = reportData.averageScore || 0
      const attendance = reportData.attendance
      const attendancePercent = attendance && attendance.total > 0 
        ? (attendance.present / attendance.total) * 100 
        : undefined
      
      const seed = studentId

      setRemarks({
          attitude: reportData.remarks?.attitude || getAutoRemark('attitude', avgScore, attendancePercent, seed),
          interest: reportData.remarks?.interest || getAutoRemark('interest', avgScore, attendancePercent, seed),
          conduct: reportData.remarks?.conduct || getAutoRemark('conduct', avgScore, attendancePercent, seed),
          classTeacher: reportData.remarks?.classTeacher || getAutoRemark('classTeacher', avgScore, attendancePercent, seed),
          headTeacher: reportData.remarks?.headTeacher || getAutoRemark('headTeacher', avgScore, attendancePercent, seed)
      })
    }
  }, [reportData, studentId])

  // Load Theme Images
  useEffect(() => {
    const loadTheme = async () => {
      const loadBase64 = async (url: string) => {
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          console.error('Failed to load image', url, e)
          return ''
        }
      }

      const [watermark, logo, methodist, signature] = await Promise.all([
        loadBase64('/school_crest-removebg-preview (2).png'),
        loadBase64('/school_crest.png'),
        loadBase64('/Methodist_logo.png'),
        loadBase64(signatureImg.src)
      ])

      setTheme({
        watermarkImage: watermark,
        logoImage: logo,
        methodistLogoImage: methodist,
        signatureImage: signature
      })
    }
    loadTheme()
  }, [])

  const handleRemarkChange = (type: keyof ReportRemarks, value: string) => {
    setRemarks(prev => ({ ...prev, [type]: value }))
  }

  const handleSaveRemarks = async () => {
    try {
      if (!reportData?.termId) return

      const { error } = await supabase
        .from('student_remarks')
        .upsert({
          student_id: studentId,
          term_id: reportData.termId,
          attitude: remarks.attitude,
          interest: remarks.interest,
          conduct: remarks.conduct,
          class_teacher_remark: remarks.classTeacher,
          head_teacher_remark: remarks.headTeacher
        }, { onConflict: 'student_id,term_id' })

      if (error) throw error
      toast.success('Remarks saved successfully')
      refresh()
    } catch (error) {
      console.error('Error saving remarks:', error)
      toast.error('Failed to save remarks')
    }
  }

  const applyAutoRemarks = async () => {
    if (!reportData) return
    
    let attendancePercentage: number | undefined = undefined;
    if (reportData.attendance?.total && reportData.attendance.total > 0) {
      attendancePercentage = (reportData.attendance.present / reportData.attendance.total) * 100;
    }

    const autoRemarks = {
      attitude: getAutoRemark('attitude', reportData.averageScore, attendancePercentage),
      interest: getAutoRemark('interest', reportData.averageScore, attendancePercentage),
      conduct: getAutoRemark('conduct', reportData.averageScore, attendancePercentage),
      classTeacher: getAutoRemark('classTeacher', reportData.averageScore, attendancePercentage),
      headTeacher: getAutoRemark('headTeacher', reportData.averageScore, attendancePercentage)
    }
    setRemarks(autoRemarks)
    toast.success('Generated auto remarks')

    if (!reportData?.termId) return
    try {
      const { error } = await supabase
        .from('student_remarks')
        .upsert({
          student_id: studentId,
          term_id: reportData.termId,
          attitude: autoRemarks.attitude,
          interest: autoRemarks.interest,
          conduct: autoRemarks.conduct,
          class_teacher_remark: autoRemarks.classTeacher,
          head_teacher_remark: autoRemarks.headTeacher
        }, { onConflict: 'student_id,term_id' })
      if (error) throw error
      toast.success('Remarks auto-saved successfully')
    } catch (e) {
      console.error('Auto save error:', e)
      toast.error('Could not auto-save remarks. Please click Save Changes.')
    }
  }

  const handleDownload = async () => {
    if (!student || !reportData || !academicSettings) return

    setDownloading(true)
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast('Please allow popups to download report card', { icon: '⚠️' })
        return
      }

      const html = generateReportHTML(
        student,
        reportData,
        remarks,
        academicSettings,
        theme,
        scoreSettings.classScorePercentage,
        scoreSettings.examScorePercentage
      )

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

  if (loading || !teacher) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (error || !student || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8 flex flex-col justify-center items-center">
        <div className="max-w-md w-full space-y-4">
          <BackButton href={backHref} />
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 text-center space-y-4">
            <p className="text-rose-500 font-bold">Error loading report card</p>
          </div>
        </div>
      </div>
    )
  }

  if (reportData.termHasStarted === false) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <BackButton href={backHref} />
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-6 sm:p-10 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold text-lg">
              !
            </div>
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">No Record Found for This Term</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-md mx-auto">
              There is no report record available for <strong>{[student?.last_name, student?.middle_name, student?.first_name].filter(Boolean).join(' ')}</strong> for <strong>{reportData.termName} ({reportData.year})</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href={backHref} className="shrink-0 mt-0.5 sm:mt-0 shadow-sm">
                <span className="flex items-center gap-1.5"><List className="w-4 h-4" /> Back</span>
              </BackButton>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white truncate">
                  {student.profiles?.full_name}
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                  {reportData.termName} • {reportData.year} • {reportData.termClassName || student.classes?.name || student.classes?.class_name}{student.section_name ? ` (${student.section_name})` : ''}
                </p>
              </div>
            </div>

            <button
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 disabled:opacity-50 shrink-0"
            >
              {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        
        {/* KPI Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Average Score</span>
            <p className="text-xl sm:text-2xl font-black text-[#003B5C] dark:text-blue-400 mt-1">
              {reportData.averageScore?.toFixed(1)}%
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Position</span>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              {reportData.position ? `${reportData.position} / ${reportData.totalClassSize}` : '—'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Attendance</span>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
              {reportData.attendance?.present ?? '—'} / {reportData.attendance?.total ?? '—'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200/80 dark:border-gray-700 shadow-sm">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">JHS Aggregate</span>
            <p className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
              {reportData.aggregate !== undefined && reportData.aggregate !== null ? reportData.aggregate : '—'}
            </p>
          </div>
        </div>

        {/* Grades Table Container */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-750 bg-gray-50/50 dark:bg-gray-850">
            <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
              Terminal Subject Performance Breakdown
            </h2>
          </div>

          {/* Mobile Card Grades View (< md) */}
          <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
            {reportData.grades.map((grade: Grade, idx: number) => (
              <div key={idx} className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                    {grade.subject_name}
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60">
                    Grade {grade.grade ?? '—'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1 font-mono">
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Class ({scoreSettings.classScorePercentage}%)</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{grade.class_score != null ? Number(grade.class_score).toFixed(1) : '—'}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Exam ({scoreSettings.examScorePercentage}%)</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{grade.exam_score != null ? Number(grade.exam_score).toFixed(1) : '—'}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 p-2 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block font-sans">Total</span>
                    <span className="font-bold text-[#003B5C] dark:text-blue-400">{grade.total != null ? Number(grade.total).toFixed(1) : '—'}</span>
                  </div>
                </div>

                {grade.remarks && (
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 italic pt-1">
                    Remark: {grade.remarks}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Tablet & Desktop Table View (≥ md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                  <th className="p-4">Subject</th>
                  <th className="p-4 text-center w-32">Class ({scoreSettings.classScorePercentage}%)</th>
                  <th className="p-4 text-center w-32">Exam ({scoreSettings.examScorePercentage}%)</th>
                  <th className="p-4 text-center w-28">Total</th>
                  <th className="p-4 text-center w-24">Grade</th>
                  <th className="p-4">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                {reportData.grades.map((grade: Grade, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                    <td className="p-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {grade.subject_name}
                    </td>
                    <td className="p-4 text-center font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {grade.class_score != null ? Number(grade.class_score).toFixed(1) : '—'}
                    </td>
                    <td className="p-4 text-center font-mono text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {grade.exam_score != null ? Number(grade.exam_score).toFixed(1) : '—'}
                    </td>
                    <td className="p-4 text-center font-mono font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {grade.total != null ? Number(grade.total).toFixed(1) : '—'}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60">
                        {grade.grade ?? '—'}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">
                      {grade.remarks ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks Editor Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-750 pb-3 sm:pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Teacher & Administrative Remarks
              </h2>
              {!isTeacherClassTeacher && (
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 rounded-full border border-amber-200/60">
                  Read Only (Class Teacher Restricted)
                </span>
              )}
            </div>

            {isTeacherClassTeacher && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={applyAutoRemarks}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Auto Generate</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveRemarks}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-95"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Remarks</span>
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Attitude</label>
                  {isTeacherClassTeacher && (
                    <RemarkDropdown 
                      options={attitudeOptions} 
                      onSelect={(val) => handleRemarkChange('attitude', val)} 
                    />
                  )}
                </div>
                <textarea 
                  className="w-full p-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none disabled:opacity-50"
                  disabled={!isTeacherClassTeacher}
                  rows={3}
                  value={remarks.attitude}
                  onChange={(e) => handleRemarkChange('attitude', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Interest</label>
                  {isTeacherClassTeacher && (
                    <RemarkDropdown 
                      options={interestOptions} 
                      onSelect={(val) => handleRemarkChange('interest', val)} 
                    />
                  )}
                </div>
                <textarea 
                  className="w-full p-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none disabled:opacity-50"
                  disabled={!isTeacherClassTeacher}
                  rows={3}
                  value={remarks.interest}
                  onChange={(e) => handleRemarkChange('interest', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Conduct</label>
                  {isTeacherClassTeacher && (
                    <RemarkDropdown 
                      options={conductOptions} 
                      onSelect={(val) => handleRemarkChange('conduct', val)} 
                    />
                  )}
                </div>
                <textarea 
                  className="w-full p-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none disabled:opacity-50"
                  disabled={!isTeacherClassTeacher}
                  rows={3}
                  value={remarks.conduct}
                  onChange={(e) => handleRemarkChange('conduct', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Class Teacher's Remark</label>
                  {isTeacherClassTeacher && (
                    <RemarkDropdown 
                      options={classTeacherOptions} 
                      onSelect={(val) => handleRemarkChange('classTeacher', val)} 
                    />
                  )}
                </div>
                <textarea 
                  className="w-full p-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none disabled:opacity-50"
                  disabled={!isTeacherClassTeacher}
                  rows={3}
                  value={remarks.classTeacher}
                  onChange={(e) => handleRemarkChange('classTeacher', e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Head Teacher's Remark</label>
                </div>
                <textarea 
                  className="w-full p-3 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none disabled:opacity-50"
                  disabled={!isTeacherClassTeacher}
                  rows={3}
                  value={remarks.headTeacher}
                  onChange={(e) => handleRemarkChange('headTeacher', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}