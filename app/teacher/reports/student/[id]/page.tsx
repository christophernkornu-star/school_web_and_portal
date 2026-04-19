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
// If TS keeps complaining about the alias, we can use relative path, but let's stick to alias for consistency first.
// The issue might be a caching one. I'll force a refresh by re-saving.
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
        className="ml-2 p-0.5 hover:bg-gray-200 rounded-md transition-colors flex items-center justify-center cursor-pointer text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Quick Select Remark"
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-72 bg-white border border-gray-200 shadow-xl rounded-md z-50 max-h-60 overflow-y-auto">
          {options.map((opt, idx) => (
            <button
              key={idx}
              type="button"
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 focus:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors"
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
  } = useReportCardData(studentId, termId || undefined)

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
      
      const seed = studentId // Use student ID for consistent auto-remarks

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
      refresh() // Reload data to confirm save
    } catch (error) {
      console.error('Error saving remarks:', error)
      toast.error('Failed to save remarks')
    }
  }

  const applyAutoRemarks = async () => {
    if (!reportData) return
    
    // Calculate attendance percentage safely
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

    // Automatically save right away
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
        toast('Please allow popups to download report card', { icon: '??' })
        return
      }

      const html = generateReportHTML(
        student,
        reportData,
        remarks, // Use current edited remarks
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
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8 transition-colors">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      </div>
    )
  }

  if (error || !student || !reportData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading report card</p>
          <BackButton href="/teacher/reports" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 p-4 md:p-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl border border-gray-100 dark:border-gray-700/50 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center gap-4">
            <BackButton href="/teacher/reports">
              <span className="flex items-center gap-2"><List className="w-4 h-4" /> Back to List</span>
            </BackButton>
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white">{student.profiles?.full_name}</h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                {reportData.termName} - {reportData.year} | {student.classes?.name || student.classes?.class_name}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {downloading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Score</div>
                <div className="text-2xl md:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{reportData.averageScore?.toFixed(1)}%</div>
            </div>
            <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Position</div>
                <div className="text-2xl md:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {reportData.position ? `${reportData.position} / ${reportData.totalClassSize}` : '-'}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Attendance</div>
                <div className="text-2xl font-bold text-orange-600">
                    {reportData.attendance?.present ?? '-'} / {reportData.attendance?.total ?? '-'}
                </div>
            </div>
             <div className="bg-white dark:bg-gray-800/90 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">JHS Aggregate</div>
                <div className="text-2xl font-bold text-purple-600">
                    {reportData.aggregate !== undefined && reportData.aggregate !== null ? reportData.aggregate : '-'}
                </div>
            </div>
        </div>

        {/* Grades Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Class ({scoreSettings.classScorePercentage}%)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Exam ({scoreSettings.examScorePercentage}%)</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.grades.map((grade: Grade, idx: number) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{grade.subject_name}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">{grade.class_score != null ? Number(grade.class_score).toFixed(1) : '-'}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-500">{grade.exam_score != null ? Number(grade.exam_score).toFixed(1) : '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{grade.total != null ? Number(grade.total).toFixed(1) : '-'}</td>
                    <td className="px-6 py-4 text-center text-sm font-bold text-blue-600">{grade.grade ?? '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{grade.remarks ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      {/* Remarks Editor */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-gray-800">Edit Remarks</h3>
            {!isTeacherClassTeacher && (
              <span className="text-xs px-2 py-1 bg-amber-100 text-amber-800 rounded-md font-medium">
                Read Only (Class Teacher Only)
              </span>
            )}
          </div>
          {isTeacherClassTeacher && (
            <div className="flex gap-2">
              <button
                onClick={applyAutoRemarks}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transaction-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Auto Generate
              </button>
              <button
                onClick={handleSaveRemarks}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transaction-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Changes
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 mr-2">Attitude</label>
                {isTeacherClassTeacher && (
                  <RemarkDropdown 
                    options={attitudeOptions} 
                    onSelect={(val) => handleRemarkChange('attitude', val)} 
                  />
                )}
              </div>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={!isTeacherClassTeacher}
                rows={3}
                value={remarks.attitude}
                onChange={(e) => handleRemarkChange('attitude', e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 mr-2">Interest</label>
                {isTeacherClassTeacher && (
                  <RemarkDropdown 
                    options={interestOptions} 
                    onSelect={(val) => handleRemarkChange('interest', val)} 
                  />
                )}
              </div>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={!isTeacherClassTeacher}
                rows={3}
                value={remarks.interest}
                onChange={(e) => handleRemarkChange('interest', e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 mr-2">Conduct</label>
                {isTeacherClassTeacher && (
                  <RemarkDropdown 
                    options={conductOptions} 
                    onSelect={(val) => handleRemarkChange('conduct', val)} 
                  />
                )}
              </div>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={!isTeacherClassTeacher}
                rows={3}
                value={remarks.conduct}
                onChange={(e) => handleRemarkChange('conduct', e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 mr-2">Class Teacher's Remark</label>
                {isTeacherClassTeacher && (
                  <RemarkDropdown 
                    options={classTeacherOptions} 
                    onSelect={(val) => handleRemarkChange('classTeacher', val)} 
                  />
                )}
              </div>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={!isTeacherClassTeacher}
                rows={4}
                value={remarks.classTeacher}
                onChange={(e) => handleRemarkChange('classTeacher', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Head Teacher's Remark</label>
              <textarea 
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                disabled={!isTeacherClassTeacher}
                rows={4}
                value={remarks.headTeacher}
                onChange={(e) => handleRemarkChange('headTeacher', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
