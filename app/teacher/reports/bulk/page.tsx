'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Printer, ArrowLeft } from 'lucide-react'
import signatureImg from '@/app/student/report-card/signature.png'
import { toast } from 'react-hot-toast'
import { fetchReportCardData } from '@/lib/reports/fetcher'
import { generateBatchReportHTML } from '@/lib/reports/generator'
import { ReportCardTheme } from '@/lib/reports/types'

function BulkReportCardsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState(0)
  const [reportDataList, setReportDataList] = useState<any[]>([])
  const [academicSettings, setAcademicSettings] = useState<any>(null)
  const [printing, setPrinting] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [scoreSettings, setScoreSettings] = useState<{classScorePercentage: number, examScorePercentage: number}>({classScorePercentage: 30, examScorePercentage: 70})

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
      
      // Get settings (we'll also get them from fetchReportCardData, but good to have base)
      const { data: settingsData } = await supabase
        .from('academic_settings')
        .select('*')
        .single()
      setAcademicSettings(settingsData)

      const results = []
      let errors = 0
      
      // Process in chunks to avoid overwhelming the browser/API but keep UI responsive
      // Sequential is safer for reliability
      const total = studentIds.length
      for (let i = 0; i < total; i++) {
          try {
              const res = await fetchReportCardData(studentIds[i], termId)
              
              if (res.scoreSettings && i === 0) {
                 setScoreSettings(res.scoreSettings)
              }

              if (res.student && res.reportData) {
                  results.push({
                      student: res.student,
                      reportData: res.reportData,
                      remarks: res.reportData.remarks || {
                          attitude: '-',
                          interest: '-',
                          conduct: '-',
                          classTeacher: '-',
                          headTeacher: '-'
                      }
                  })
              }
          } catch (e) {
              console.error(`Error fetching for student ${studentIds[i]}`, e)
              errors++
          }
          setProgress(Math.round(((i + 1) / total) * 100))
      }

      setReportDataList(results)
      setErrorCount(errors)
      setLoading(false)
      
      if (errors > 0) {
          toast.error(`${errors} reports failed to load. Printed batch will be incomplete.`)
      }

    } catch (error) {
      console.error('Error loading bulk report data:', error)
      setLoading(false)
      toast.error('Failed to initialize bulk report loading')
    }
  }

  const handlePrint = async () => {
    setPrinting(true)
    const toastId = toast.loading('Preparing print job...');
    
    try {
      const loadImage = async (url: string) => {
          try {
            const response = await fetch(url)
            const blob = await response.blob()
            return await new Promise<string>((resolve) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.readAsDataURL(blob)
            })
          } catch (err) {
            console.warn(`Could not load image ${url}:`, err)
            return ''
          }
      }

      // Load images in parallel
      const [watermark, logo, methodist, signature] = await Promise.all([
          loadImage('/school_crest-removebg-preview (2).png'),
          loadImage('/school_crest.png'),
          loadImage('/Methodist_logo.png'),
          loadImage(signatureImg.src)
      ])

      const theme: ReportCardTheme = {
          primaryColor: '#00008B', // Default from CSS
          secondaryColor: '#ffffff',
          watermarkImage: watermark,
          logoImage: logo,
          methodistLogoImage: methodist,
          signatureImage: signature
      }

      const html = generateBatchReportHTML(
          reportDataList,
          academicSettings,
          theme,
          scoreSettings.classScorePercentage,
          scoreSettings.examScorePercentage
      )

      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        toast.error('Popups blocked. Please allow popups for this site.', { id: toastId })
        return
      }

      printWindow.document.write(html)
      printWindow.document.close()

      // Give images time to render in new window
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        toast.success('Print dialog opened', { id: toastId })
      }, 1000)

    } catch (error) {
      console.error('Error printing report cards:', error)
      toast.error('Failed to generate print view', { id: toastId })
    } finally {
      setPrinting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-lg shadow-md flex flex-col items-center max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Generating Reports</h2>
            <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2">
                <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-slate-600 text-sm">{progress}% Complete</p>
            <p className="text-xs text-slate-400 mt-2">Please wait while we fetch data for all selected students...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button
                onClick={() => router.back()}
                className="p-2 bg-white hover:bg-slate-100 rounded-full border shadow-sm transition-colors"
                >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
                </button>
                <h1 className="text-2xl font-bold text-slate-900">Bulk Report Cards</h1>
            </div>

            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Ready to Print</h2>
                            <p className="text-slate-500 text-sm mt-1">
                                Generated {reportDataList.length} report cards successfully.
                                {errorCount > 0 && <span className="text-red-600 ml-1 font-medium">({errorCount} failed)</span>}
                            </p>
                        </div>
                        
                        <button
                            onClick={handlePrint}
                            disabled={printing || reportDataList.length === 0}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
                        >
                            <Printer className="w-4 h-4" />
                            {printing ? 'Preparing Print Job...' : 'Print All Reports'}
                        </button>
                    </div>
                </div>

                <div className="p-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex gap-3">
                            <div className="text-blue-600 mt-0.5">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                            </div>
                            <div>
                                <h3 className="font-medium text-blue-900">Important Note</h3>
                                <p className="text-sm text-blue-800 mt-1 leading-relaxed">
                                    Report cards are generated using the most up-to-date data available. 
                                    When you click "Print All Reports", a new window will open with all report cards combined into a single document ready for printing.
                                    Please verify the preview before confirming the print job.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default function BulkReportCards() {
  return (
    <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    }>
      <BulkReportCardsContent />
    </Suspense>
  )
}
