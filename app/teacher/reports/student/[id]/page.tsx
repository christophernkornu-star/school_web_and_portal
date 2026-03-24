'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { List, Download, RefreshCw, Save, Wand2 } from 'lucide-react'
import signatureImg from '@/app/student/report-card/signature.png'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getAutoRemark } from '@/lib/remark-utils'
import { useReportCardData } from '@/lib/reports/hooks'
// If TS keeps complaining about the alias, we can use relative path, but let's stick to alias for consistency first.
// The issue might be a caching one. I'll force a refresh by re-saving.
import { generateReportHTML } from '@/lib/reports/generator'
import { ReportCardTheme, ReportRemarks, Grade } from '@/lib/reports/types'


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
          academic_year: reportData.year,
          attitude: remarks.attitude,
          interest: remarks.interest,
          conduct: remarks.conduct,
          class_teacher_remark: remarks.classTeacher,
          head_teacher_remark: remarks.headTeacher
        })

      if (error) throw error
      toast.success('Remarks saved successfully')
      refresh() // Reload data to confirm save
    } catch (error) {
      console.error('Error saving remarks:', error)
      toast.error('Failed to save remarks')
    }
  }

  const applyAutoRemarks = () => {
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
  }

  const handleDownload = async () => {
    if (!student || !reportData || !academicSettings) return

    setDownloading(true)
    try {
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast('Please allow popups to download report card', { icon: 'ℹ️' })
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
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <BackButton href="/teacher/reports">
              <span className="flex items-center gap-2"><List className="w-4 h-4" /> Back to List</span>
            </BackButton>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{student.profiles?.full_name}</h1>
              <p className="text-sm text-gray-600">
                {reportData.termName} - {reportData.year} | {student.classes?.name || student.classes?.class_name}
              </p>
            </div>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
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
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500">Average Score</div>
                <div className="text-2xl font-bold text-blue-600">{reportData.averageScore?.toFixed(1)}%</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500">Position</div>
                <div className="text-2xl font-bold text-green-600">
                    {reportData.position ? `${reportData.position} / ${reportData.totalClassSize}` : '-'}
                </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500">Attendance</div>
                <div className="text-2xl font-bold text-orange-600">
                    {reportData.attendance?.present ?? '-'} / {reportData.attendance?.total ?? '-'}
                </div>
            </div>
             <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500">JHS Aggregate</div>
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
                    {/* ... rest of the row ... */}
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
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800">Edit Remarks</h3>
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
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Attitude</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={3}
                        value={remarks.attitude}
                        onChange={(e) => handleRemarkChange('attitude', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={3}
                        value={remarks.interest}
                        onChange={(e) => handleRemarkChange('interest', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conduct</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={3}
                        value={remarks.conduct}
                        onChange={(e) => handleRemarkChange('conduct', e.target.value)}
                    />
                </div>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class Teacher's Remark</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                        rows={4}
                        value={remarks.classTeacher}
                        onChange={(e) => handleRemarkChange('classTeacher', e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Head Teacher's Remark</label>
                    <textarea 
                        className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
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
