'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  Download, 
  RefreshCw, 
  FileText, 
  ChevronDown, 
  Calendar, 
  Award, 
  CheckCircle2, 
  BookOpen, 
  TrendingUp, 
  User, 
  ShieldAlert,
  Percent
} from 'lucide-react'
import signatureImg from './signature.png'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { useReportCardData } from '@/lib/reports/hooks'
import { generateReportHTML } from '@/lib/reports/generator'
import { ReportCardTheme, ReportRemarks } from '@/lib/reports/types'
import { getAutoRemark } from '@/lib/remark-utils'
import { resolveActiveAcademicYear, filterTermsByActiveYear } from '@/lib/academic-year'
import { PortalFooter } from '@/components/PortalFooter'

export default function ReportCardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  // State
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedTermId, setSelectedTermId] = useState<string | undefined>(undefined)
  const [availableTerms, setAvailableTerms] = useState<{ id: string; name: string; year: string }[]>([])
  const [initLoading, setInitLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [theme, setTheme] = useState<ReportCardTheme>({})

  // Fetch logged in student ID and available terms
  useEffect(() => {
    async function loadStudentAndTerms() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login?portal=student')
          return
        }

        const { data: student } = await supabase
          .from('students')
          .select('id, class_id')
          .eq('profile_id', user.id)
          .single()

        if (!student) {
          toast.error('Student profile not found')
          router.push('/')
          return
        }

        setStudentId(student.id)

        // Fetch terms that have recorded scores
        const { data: termsData } = await supabase
          .from('scores')
          .select('term_id, academic_terms(id, name, academic_year)')
          .eq('student_id', student.id)
          .order('academic_terms(academic_year)', { ascending: false })
          .order('academic_terms(name)', { ascending: false })

        const termsMap = new Map()
        termsData?.forEach((t: any) => {
          if (t.academic_terms) {
            const term = t.academic_terms
            if (!termsMap.has(term.id)) {
              termsMap.set(term.id, { id: term.id, name: term.name, year: term.academic_year })
            }
          }
        })

        // Also fetch active current term
        const { data: currentTerm } = await supabase
          .from('academic_terms')
          .select('id, name, academic_year')
          .eq('is_current', true)
          .single()

        if (currentTerm && !termsMap.has(currentTerm.id)) {
          termsMap.set(currentTerm.id, { id: currentTerm.id, name: currentTerm.name, year: currentTerm.academic_year })
        }

        let terms = Array.from(termsMap.values())

        try {
          const activeAcademicYear = await resolveActiveAcademicYear(supabase)
          let showHist = false
          try {
            const resp = await fetch('/api/student-portal/history-setting', { cache: 'no-store' })
            if (resp.ok) {
              const data = await resp.json()
              showHist = data?.showHistory === true
            }
          } catch (fetchErr) {
            console.error('Error fetching student portal history setting:', fetchErr)
          }

          if (!showHist) {
            const adapted = terms.map((t: any) => ({ ...t, academic_year: t.year }))
            const activeOnly = filterTermsByActiveYear(adapted, activeAcademicYear)
            terms = activeOnly.map((t: any) => ({ id: t.id, name: t.name, year: t.academic_year }))
          }
        } catch (yearErr) {
          console.error('Error resolving active year for student portal:', yearErr)
        }

        setAvailableTerms(terms)
        if (terms.length > 0) {
          if (currentTerm && terms.some((t: any) => t.id === currentTerm.id)) {
            setSelectedTermId(currentTerm.id)
          } else {
            setSelectedTermId(terms[0].id)
          }
        }
      } catch (error) {
        console.error('Error init:', error)
      } finally {
        setInitLoading(false)
      }
    }
    loadStudentAndTerms()
  }, [router, supabase])

  // Load theme images
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

      const sigUrl = typeof signatureImg === 'string' ? signatureImg : signatureImg.src

      const [watermark, logo, methodist, signature] = await Promise.all([
        loadBase64('/school_crest-removebg-preview (2).png'),
        loadBase64('/school_crest.png'),
        loadBase64('/Methodist_logo.png'),
        loadBase64(sigUrl)
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

  const { 
    loading: reportLoading, 
    error: reportError,
    refresh: refreshReport,
    reportData, 
    student, 
    academicSettings, 
    scoreSettings 
  } = useReportCardData(studentId || '', selectedTermId)

  const handleDownload = () => {
    if (!reportData || !student || !academicSettings) return
    setDownloading(true)

    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast('Please allow popups to preview or print report cards', { icon: 'ℹ️' })
        setDownloading(false)
        return
      }

      const storedRemarks = reportData.remarks || {}
      const avgScore = reportData.averageScore || 0
      const attendance = reportData.attendance
      const attendancePercent = attendance && attendance.total > 0
        ? (attendance.present / attendance.total) * 100
        : undefined
      const seed = student.id

      const remarks: ReportRemarks = {
        attitude: storedRemarks.attitude || getAutoRemark('attitude', avgScore, attendancePercent, seed),
        interest: storedRemarks.interest || getAutoRemark('interest', avgScore, attendancePercent, seed),
        conduct: storedRemarks.conduct || getAutoRemark('conduct', avgScore, attendancePercent, seed),
        classTeacher: storedRemarks.classTeacher || getAutoRemark('classTeacher', avgScore, attendancePercent, seed),
        headTeacher: storedRemarks.headTeacher || getAutoRemark('headTeacher', avgScore, attendancePercent, seed)
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
    } catch (e) {
      console.error(e)
      toast.error('Failed to generate PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (initLoading || (reportLoading && studentId)) {
    return <ReportCardSkeleton />
  }

  if (reportError && !reportData) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700 p-6 sm:p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-500/10">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Could not load report card</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              We encountered a network delay loading this term&apos;s grades. Please check your connection and retry.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refreshReport()}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white text-xs sm:text-sm font-bold rounded-xl transition active:scale-95 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <p className="text-xs sm:text-sm font-medium text-slate-500">Student record unavailable.</p>
      </div>
    )
  }

  const studentFullName = student.profiles?.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Student'
  const attendanceRate = reportData?.attendance && reportData.attendance.total > 0
    ? Math.round((reportData.attendance.present / reportData.attendance.total) * 100)
    : null

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Title & Back Button */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Terminal Report Card
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Academic transcript, continuous assessment marks, and teacher remarks
                </p>
              </div>
            </div>

            {/* Controls (Term Selector & PDF Download) */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
              <div className="relative flex-1 sm:flex-none sm:w-52">
                <select 
                  value={selectedTermId || ''}
                  onChange={(e) => setSelectedTermId(e.target.value)}
                  className="w-full appearance-none bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold py-2 sm:py-2.5 pl-3 pr-8 rounded-xl outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  {availableTerms.map(term => (
                    <option key={term.id} value={term.id}>
                      {term.name} ({term.year})
                    </option>
                  ))}
                  {availableTerms.length === 0 && <option value="">No terms available</option>}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading || !reportData}
                className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
                title="Print or export report card to PDF"
              >
                {downloading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span className="hidden xs:inline">Print / PDF</span>
                <span className="xs:hidden">PDF</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8 space-y-5 sm:space-y-6">
        {reportData ? (
          <div className="space-y-5 sm:space-y-6">
            
            {/* Student Bio & Term Performance Summary Card */}
            <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                
                {/* Bio Details */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                        {studentFullName}
                      </h2>
                      <p className="text-[11px] sm:text-xs text-slate-400 font-mono">
                        Student ID: {student.student_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                    <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700">
                      Class: {student.classes?.name || 'Cohort'}{student.section_name ? ` • Section: ${student.section_name}` : ''}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-300 text-[11px] font-bold border border-blue-200/70 dark:border-blue-900/40">
                      {reportData.termName}
                    </span>
                  </div>
                </div>

                {/* Academic KPI Badges */}
                <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                  {reportData.position && (
                    <div className="text-center px-3.5 sm:px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-2xs min-w-[105px]">
                      <span className="text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
                        Rank Position
                      </span>
                      <div className="text-base sm:text-xl md:text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5">
                        {reportData.position}
                        <span className="text-xs font-normal text-amber-500/80 ml-1">
                          / {reportData.totalClassSize || '--'}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="text-center px-3.5 sm:px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-200/80 dark:border-blue-900/40 shadow-2xs min-w-[105px]">
                    <span className="text-[10px] sm:text-[11px] font-bold text-[#003B5C] dark:text-blue-300 uppercase tracking-wider block">
                      Term Average
                    </span>
                    <div className="text-base sm:text-xl md:text-2xl font-black font-mono text-[#003B5C] dark:text-blue-400 mt-0.5">
                      {reportData.averageScore}%
                    </div>
                  </div>
                </div>

              </div>
            </section>

            {/* Academic Grades Table */}
            <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <span>Curriculum Performance Ledger</span>
                </h3>
                <span className="text-[11px] sm:text-xs text-blue-200/80 font-mono hidden sm:inline">
                  {scoreSettings.classScorePercentage}% SBA / {scoreSettings.examScorePercentage}% Exam
                </span>
              </div>

              {/* Table with horizontal scroll on mobile */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left min-w-[620px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3">Subject Name</th>
                      <th className="px-3 sm:px-4 py-3 text-center font-mono">SBA ({scoreSettings.classScorePercentage}%)</th>
                      <th className="px-3 sm:px-4 py-3 text-center font-mono">Exam ({scoreSettings.examScorePercentage}%)</th>
                      <th className="px-3 sm:px-4 py-3 text-center font-mono">Total</th>
                      <th className="px-3 sm:px-4 py-3 text-center font-mono">Grade</th>
                      <th className="px-4 sm:px-6 py-3">Subject Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {reportData.grades.map((grade, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 sm:px-6 py-3 sm:py-3.5 font-bold text-slate-900 dark:text-white">
                          {grade.subject_name}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-center font-mono text-slate-600 dark:text-slate-300">
                          {grade.class_score != null ? Number(grade.class_score).toFixed(1) : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-center font-mono text-slate-600 dark:text-slate-300">
                          {grade.exam_score != null ? Number(grade.exam_score).toFixed(1) : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-center font-mono font-black text-slate-900 dark:text-white">
                          {grade.total != null ? Number(grade.total).toFixed(1) : '-'}
                        </td>
                        <td className="px-3 sm:px-4 py-3 sm:py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-[#003B5C] dark:text-blue-300 font-mono font-black text-xs border border-blue-200/70 dark:border-blue-900/40">
                            {grade.grade ?? '-'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={grade.remarks || ''}>
                          {grade.remarks || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200/80 dark:border-slate-700 font-mono">
                    <tr>
                      <td className="px-4 sm:px-6 py-3 text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-slate-200 font-sans">
                        Composite Total
                      </td>
                      <td colSpan={2} />
                      <td className="px-3 sm:px-4 py-3 text-center font-black text-sm sm:text-base text-[#003B5C] dark:text-blue-400">
                        {reportData.totalScore}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            {/* Attendance & Character Reflections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              
              {/* Attendance Card */}
              <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-emerald-500 rounded-full shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Term Attendance Record
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Official roll call attendance recorded for this academic period
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/30">
                  <div className="space-y-0.5">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                      Days Present
                    </span>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 dark:text-emerald-400">
                      {reportData.attendance?.present ?? 0}
                    </div>
                  </div>
                  <div className="space-y-0.5 text-right">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      School Days
                    </span>
                    <div className="text-2xl sm:text-3xl font-black font-mono text-slate-800 dark:text-slate-200">
                      {reportData.attendance?.total ?? 0}
                    </div>
                  </div>
                </div>

                {attendanceRate !== null && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500 dark:text-slate-400">Term Attendance Ratio</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{attendanceRate}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(attendanceRate, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Character Reflections Card */}
              <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Conduct &amp; Remarks
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Faculty assessments of classroom attitude, interest, and leadership
                  </p>
                </div>

                <div className="space-y-2.5">
                  <RemarkBlock 
                    label="Attitude" 
                    text={reportData.remarks?.attitude || getAutoRemark('attitude', reportData.averageScore || 0, reportData.attendance?.total ? (reportData.attendance.present / reportData.attendance.total) * 100 : undefined, student.id)} 
                  />
                  <RemarkBlock 
                    label="Interest" 
                    text={reportData.remarks?.interest || getAutoRemark('interest', reportData.averageScore || 0, reportData.attendance?.total ? (reportData.attendance.present / reportData.attendance.total) * 100 : undefined, student.id)} 
                  />
                  <RemarkBlock 
                    label="Conduct" 
                    text={reportData.remarks?.conduct || getAutoRemark('conduct', reportData.averageScore || 0, reportData.attendance?.total ? (reportData.attendance.present / reportData.attendance.total) * 100 : undefined, student.id)} 
                  />
                  <RemarkBlock 
                    label="Class Teacher" 
                    text={reportData.remarks?.classTeacher || getAutoRemark('classTeacher', reportData.averageScore || 0, reportData.attendance?.total ? (reportData.attendance.present / reportData.attendance.total) * 100 : undefined, student.id)} 
                  />
                  <RemarkBlock 
                    label="Head Teacher" 
                    text={reportData.remarks?.headTeacher || getAutoRemark('headTeacher', reportData.averageScore || 0, reportData.attendance?.total ? (reportData.attendance.present / reportData.attendance.total) * 100 : undefined, student.id)} 
                  />
                </div>
              </section>

            </div>

          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-16 text-center space-y-3 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-7 h-7 opacity-30" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                No Report Card Available for this Term
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                Examination results have not been finalized or published for the selected term yet.
              </p>
            </div>
          </div>
        )}
      </main>

      <PortalFooter />
    </div>
  )
}

function RemarkBlock({ label, text }: { label: string; text: string }) {
  return (
    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
        {label}
      </span>
      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
        &ldquo;{text}&rdquo;
      </p>
    </div>
  )
}

function ReportCardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <div className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800" />
      <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <Skeleton className="h-28 sm:h-32 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-80 sm:h-96 w-full rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-48 rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-48 rounded-2xl sm:rounded-3xl" />
        </div>
      </div>
    </div>
  )
}