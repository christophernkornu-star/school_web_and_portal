'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Download, RefreshCw, FileText, ChevronDown } from 'lucide-react'
import signatureImg from './signature.png'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { useReportCardData } from '@/lib/reports/hooks'
import { generateReportHTML } from '@/lib/reports/generator'
import { ReportCardTheme, ReportRemarks } from '@/lib/reports/types'

export default function ReportCardPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  // State
  const [studentId, setStudentId] = useState<string | null>(null)
  const [selectedTermId, setSelectedTermId] = useState<string | undefined>(undefined)
  const [availableTerms, setAvailableTerms] = useState<{id: string, name: string, year: string}[]>([])
  const [initLoading, setInitLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [theme, setTheme] = useState<ReportCardTheme>({})

  // Fetch logged in student ID and available terms first
  useEffect(() => {
    async function loadStudentAndTerms() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login?portal=student')
          return
        }

        // Get student info
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

        // Fetch terms that might have grades
        // We can fetch terms this student has scores for
        const { data: termsData } = await supabase
           .from('scores')
           .select('term_id, academic_terms(id, name, academic_year)')
           .eq('student_id', student.id)
           .order('academic_terms(academic_year)', { ascending: false })
           .order('academic_terms(name)', { ascending: false })

        // Extract unique terms
        const termsMap = new Map()
        termsData?.forEach((t: any) => {
            if (t.academic_terms) {
                const term = t.academic_terms
                if (!termsMap.has(term.id)) {
                    termsMap.set(term.id, { id: term.id, name: term.name, year: term.academic_year })
                }
            }
        })
        
        // Also fetch current term if not in the list (so they can see empty report)
        const { data: currentTerm } = await supabase
            .from('academic_terms')
            .select('id, name, academic_year')
            .eq('is_current', true)
            .single()
            
        if (currentTerm && !termsMap.has(currentTerm.id)) {
             termsMap.set(currentTerm.id, { id: currentTerm.id, name: currentTerm.name, year: currentTerm.academic_year })
        }
        
        let terms = Array.from(termsMap.values())
        
        // Sort terms: Current term first or by year/name
        // For simplicity, just use what we have or sort manually if needed
        
        setAvailableTerms(terms)
        if (terms.length > 0) {
            // Default to current term or first available
            if (currentTerm) setSelectedTermId(currentTerm.id)
            else setSelectedTermId(terms[0].id)
        }

      } catch (error) {
        console.error('Error init:', error)
      } finally {
        setInitLoading(false)
      }
    }
    loadStudentAndTerms()
  }, [])

   // Load Theme Images (Reusable logic)
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


  // Now use the shared hook!
  // We pass studentId and selectedTermId.
  // The hook returns { reportData, ... }
  const { 
    loading: reportLoading, 
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
            toast('Please allow popups', { icon: 'ℹ️' })
            return
        }
        
        // Use remarks from reportData directly since students can't edit them
        const remarks: ReportRemarks = {
            attitude: reportData.remarks?.attitude || '',
            interest: reportData.remarks?.interest || '',
            conduct: reportData.remarks?.conduct || '',
            classTeacher: reportData.remarks?.classTeacher || '',
            headTeacher: reportData.remarks?.headTeacher || ''
        }
        
        // Pass aggregate if available (for JHS)
        // Ensure student object has everything needed
        
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
      return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
                 <Skeleton className="h-10 w-48 mb-6" />
                 <div className="grid md:grid-cols-2 gap-6">
                    <Skeleton className="h-40 w-full rounded-lg" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                 </div>
                 <Skeleton className="h-96 w-full rounded-lg" />
            </div>
        </div>
      )
  }
  
  if (!student) {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center">
               {initLoading ? <Skeleton className="h-10 w-48" /> : <p>Student data not available.</p>}
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BackButton href="/student/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">My Report Card</h1>
                <p className="text-sm text-gray-500">View and download your academic reports</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-3">
               {/* Term Selector */}
               <div className="relative">
                   <select 
                     value={selectedTermId || ''}
                     onChange={(e) => setSelectedTermId(e.target.value)}
                     className="appearance-none bg-gray-100 border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent cursor-pointer"
                   >
                       {availableTerms.map(term => (
                           <option key={term.id} value={term.id}>
                               {term.name} - {term.year}
                           </option>
                       ))}
                       {availableTerms.length === 0 && <option>No terms available</option>}
                   </select>
                   <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-gray-500 pointer-events-none" />
               </div>

               <button
                  onClick={handleDownload}
                  disabled={downloading || !reportData}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
               >
                  {downloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Download PDF</span>
               </button>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 md:px-6 py-8">
         {reportData ? (
             <div className="max-w-4xl mx-auto">
                 {/* Student Bio Card */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                     <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                         <div>
                             <h2 className="text-2xl font-bold text-gray-800">{student.profiles?.full_name}</h2>
                             <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                                 <span className="flex items-center gap-1">
                                     <span className="font-semibold">ID:</span> {student.student_id}
                                 </span>
                                 <span className="flex items-center gap-1">
                                     <span className="font-semibold">Class:</span> {student.classes?.name}
                                 </span>
                                 <span className="flex items-center gap-1">
                                     <span className="font-semibold">Term:</span> {reportData.termName}
                                 </span>
                             </div>
                         </div>
                         <div className="flex gap-3">
                             {/* Position Badge if available */}
                            {reportData.position && (
                                <div className="text-center px-4 py-2 bg-purple-50 rounded-lg border border-purple-100">
                                    <div className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Position</div>
                                    <div className="text-xl font-bold text-purple-700">
                                        {reportData.position} <span className="text-sm text-purple-400 font-normal">/ {reportData.totalClassSize}</span>
                                    </div>
                                </div>
                            )}
                             <div className="text-center px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                                 <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Average</div>
                                 <div className="text-xl font-bold text-blue-700">{reportData.averageScore}%</div>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* Grades Table */}
                 <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
                     <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                         <h3 className="font-semibold text-gray-800">Academic Performance</h3>
                     </div>
                     <div className="overflow-x-auto">
                         <table className="w-full">
                             <thead>
                                 <tr className="bg-gray-50/50 border-b border-gray-100 text-left">
                                     <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subject</th>
                                     <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Class ({scoreSettings.classScorePercentage}%)</th>
                                     <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Exam ({scoreSettings.examScorePercentage}%)</th>
                                     <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                                     <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Grade</th>
                                     <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Remarks</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {reportData.grades.map((grade, idx) => (
                                     <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                         <td className="px-6 py-4 text-sm font-medium text-gray-900">{grade.subject_name}</td>
                                         <td className="px-6 py-4 text-center text-sm text-gray-600">{grade.class_score != null ? Number(grade.class_score).toFixed(1) : '-'}</td>
                                         <td className="px-6 py-4 text-center text-sm text-gray-600">{grade.exam_score != null ? Number(grade.exam_score).toFixed(1) : '-'}</td>
                                         <td className="px-6 py-4 text-center text-sm font-bold text-gray-900">{grade.total != null ? Number(grade.total).toFixed(1) : '-'}</td>
                                         <td className="px-6 py-4 text-center text-sm font-bold text-purple-600">{grade.grade ?? '-'}</td>
                                         <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={grade.remarks || ''}>
                                             {grade.remarks || '-'}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                             <tfoot className="bg-gray-50 border-t border-gray-200">
                                 <tr>
                                     <td className="px-6 py-3 text-sm font-bold text-gray-900">Overalls</td>
                                     <td colSpan={2}></td>
                                     <td className="px-6 py-3 text-center text-sm font-bold text-gray-900">{reportData.totalScore}</td>
                                     <td colSpan={2}></td>
                                 </tr>
                             </tfoot>
                         </table>
                     </div>
                 </div>
                 
                 {/* Attendance & Remarks */}
                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-400 rounded-full"></span>
                            Attendance
                        </h3>
                        <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-100">
                             <div>
                                 <div className="text-sm text-orange-600 mb-1">Days Present</div>
                                 <div className="text-2xl font-bold text-orange-700">{reportData.attendance?.present ?? 0}</div>
                             </div>
                             <div className="text-right">
                                 <div className="text-sm text-orange-600 mb-1">Total Days</div>
                                 <div className="text-2xl font-bold text-orange-700">{reportData.attendance?.total ?? 0}</div>
                             </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                         <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <span className="w-1 h-4 bg-green-400 rounded-full"></span>
                            Reflections
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-lg p-3">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Class Teacher</span>
                                <p className="text-sm text-gray-700 italic">"{reportData.remarks?.classTeacher || 'No remark yet'}"</p>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">Head Teacher</span>
                                <p className="text-sm text-gray-700 italic">"{reportData.remarks?.headTeacher || 'No remark yet'}"</p>
                            </div>
                        </div>
                    </div>
                 </div>

             </div>
         ) : (
             <div className="text-center py-12">
                 <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                 <h3 className="text-lg font-medium text-gray-900">No report card available</h3>
                 <p className="text-gray-500 mt-2">Select a different term or contact your administrator.</p>
             </div>
         )}
      </main>
    </div>
  )
}
