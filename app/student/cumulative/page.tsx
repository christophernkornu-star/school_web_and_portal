'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, FileText } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

export default function StudentCumulativePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [student, setStudent] = useState<any | null>(null)
  const [reportData, setReportData] = useState<any | null>(null)

  useEffect(() => {
    loadStudentData()
  }, [])

  const loadStudentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      // Check permission first
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'allow_cumulative_download')
        .maybeSingle()
      
      if (settingsData?.setting_value !== 'true') {
        toast.error('Cumulative records are not currently available for download.')
        router.push('/student/dashboard')
        return
      }

      // Get student profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!profile) return

      // Get student info
      const { data: studentData } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          student_id,
          classes (name)
        `)
        .eq('profile_id', profile.id)
        .single()

      if (studentData) {
        setStudent(studentData)
        await loadCumulativeData(studentData)
      }
    } catch (error) {
      console.error('Error loading student data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCumulativeData = async (studentData: any) => {
    try {
      // 1. Get all scores for the student
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          subjects (id, name, code),
          academic_terms (id, name, academic_year, start_date)
        `)
        .eq('student_id', studentData.id)
        .order('academic_terms(academic_year)', { ascending: true })
        .order('academic_terms(start_date)', { ascending: true })

      if (scoresError) throw scoresError

      // 1b. Get attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('term_id, days_present')
        .eq('student_id', studentData.id)

      if (attendanceError) console.warn('Error fetching attendance:', attendanceError)

      // 2. Process data into a grid
      const subjectMap: Record<string, any> = {}
      const termMap: Record<string, any> = {}
      const yearMap: Record<string, any[]> = {}
      const attendanceMap: Record<string, number> = {}

      if (attendanceData) {
        attendanceData.forEach((record: any) => {
          attendanceMap[record.term_id] = record.days_present
        })
      }

      scores?.forEach((score: any) => {
        const subjectId = score.subjects?.id
        const termId = score.academic_terms?.id
        const year = score.academic_terms?.academic_year

        if (!subjectId || !termId) return

        if (!termMap[termId]) {
          termMap[termId] = score.academic_terms
        }

        if (!yearMap[year]) {
          yearMap[year] = []
        }
        if (!yearMap[year].find((t: any) => t.id === termId)) {
          yearMap[year].push(score.academic_terms)
        }

        if (!subjectMap[subjectId]) {
          subjectMap[subjectId] = {
            info: score.subjects,
            scores: {}
          }
        }
        subjectMap[subjectId].scores[termId] = score
      })

      const sortedYears = Object.keys(yearMap).sort()
      sortedYears.forEach(year => {
        yearMap[year].sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      })

      setReportData({
        years: sortedYears,
        yearTerms: yearMap,
        subjects: Object.values(subjectMap).sort((a: any, b: any) => a.info.name.localeCompare(b.info.name)),
        attendance: attendanceMap
      })

    } catch (error) {
      console.error('Error loading report data:', error)
    }
  }

  const generatePDF = async () => {
    // Fetch images
    let watermarkBase64 = ''
    let logoBase64 = ''
    let methodistLogoBase64 = ''
    let signatureBase64 = ''

    try {
      const [watermarkRes, logoRes, methodistRes, signatureRes] = await Promise.all([
        fetch('/school_crest-removebg-preview (2).png'),
        fetch('/school_crest.png'),
        fetch('/Methodist_logo.png'),
        fetch('/signature.png')
      ])

      const blobs = await Promise.all([
        watermarkRes.blob(),
        logoRes.blob(),
        methodistRes.blob(),
        signatureRes.blob()
      ])

      const readers = blobs.map(blob => new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      }))

      const results = await Promise.all(readers)
      watermarkBase64 = results[0]
      logoBase64 = results[1]
      methodistLogoBase64 = results[2]
      signatureBase64 = results[3]
    } catch (error) {
      console.warn('Error loading images for PDF:', error)
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const currentDate = new Date().toLocaleDateString('en-GB')
    const backgroundImage = watermarkBase64 ? `url('${watermarkBase64}')` : 'none'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cumulative Record - ${student?.first_name} ${student?.last_name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Times+New+Roman&display=swap');
          
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          @media print {
            html, body {
              width: 297mm;
              height: 210mm;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            .report-card {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
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
            font-size: 10pt;
            line-height: 1.25;
            padding: 0;
            color: #00008B;
            background: white;
          }
          .report-card {
            border: 3px solid #00008B;
            padding: 10px;
            width: 100%;
            min-height: 200mm;
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
            background-size: 50%;
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
            width: 80px;
            height: 80px;
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
            font-size: 24pt;
            font-weight: bold;
            font-family: Impact, 'Arial Black', sans-serif;
            color: #00008B;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }
          .school-address {
            font-size: 11pt;
            margin: 1px 0;
            color: #00008B;
          }
          .school-address.box {
            font-size: 13pt;
          }
          .school-motto {
            font-size: 10pt;
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
            font-size: 18pt;
            margin: 10px 40px 15px 40px;
            color: #00008B;
            box-shadow: 3px 3px 5px rgba(0,0,0,0.2);
          }
          .student-info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            margin-bottom: 15px;
            border: 1px solid #00008B;
            padding: 10px;
          }
          .info-item {
            display: flex;
            gap: 5px;
          }
          .info-label {
            font-weight: bold;
            color: #00008B;
          }
          .info-value {
            color: #00008B;
            border-bottom: 1px dotted #00008B;
            flex: 1;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10pt;
            margin-bottom: 5px;
          }
          th, td {
            border: 1px solid #00008B;
            padding: 4px;
            text-align: center;
            color: #00008B;
          }
          th {
            background: #f0f0f0;
            font-weight: bold;
            text-transform: uppercase;
          }
          .subject-col {
            text-align: left;
            width: 200px;
            font-weight: bold;
          }
          .signature-section {
            display: flex;
            justify-content: flex-end;
            margin-top: 10px;
            height: 50px;
          }
          .signature-box {
            text-align: center;
            width: 200px;
            position: relative;
          }
          .signature-line {
            border-top: 1px solid #00008B;
            margin-top: 25px;
            padding-top: 5px;
            font-weight: bold;
            position: relative;
            z-index: 2;
          }
          .signature-overlay {
            position: absolute;
            bottom: 5px;
            left: 50%;
            transform: translateX(-50%);
            height: 80px;
            z-index: 1;
            mix-blend-mode: multiply;
          }
          .footer-note {
            margin-top: 5px;
            font-size: 8pt;
            text-align: center;
            font-style: italic;
            border-top: 1px solid #00008B;
            padding-top: 5px;
            color: #00008B;
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
                ${logoBase64 ? `<img src="${logoBase64}" alt="School Crest" />` : ''}
              </div>
              <div class="header-top">
                <div class="school-name">BIRIWA METHODIST 'C' BASIC SCHOOL</div>
                <div class="school-address box">POST OFFICE BOX 5</div>
                <div class="school-address">TEL: +233244930752</div>
                <div class="school-address">E-mail: biriwamethodistcschool@gmail.com</div>
                <div class="school-motto">MOTTO: DISCIPLINE WITH HARD WORK</div>
              </div>
              <div class="header-logo">
                ${methodistLogoBase64 ? `<img src="${methodistLogoBase64}" alt="Methodist Logo" />` : ''}
              </div>
            </div>
          </div>
          
          <div class="report-title">CUMULATIVE RECORDS SHEET</div>

          <!-- Student Info -->
          <div class="student-info-grid">
            <div class="info-item">
              <span class="info-label">NAME:</span>
              <span class="info-value">${student?.last_name} ${student?.first_name}</span>
            </div>
            <div class="info-item">
              <span class="info-label">STUDENT ID:</span>
              <span class="info-value">${student?.student_id}</span>
            </div>
            <div class="info-item">
              <span class="info-label">CLASS:</span>
              <span class="info-value">${student?.classes?.name || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">GENDER:</span>
              <span class="info-value">${student?.gender || 'N/A'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">DATE PRINTED:</span>
              <span class="info-value">${currentDate}</span>
            </div>
          </div>

          <!-- Cumulative Table -->
          <table>
            <thead>
              <tr>
                <th rowspan="2" class="subject-col">SUBJECTS</th>
                ${reportData?.years.map((year: string) => `
                  <th colspan="${reportData.yearTerms[year].length}">${year}</th>
                `).join('')}
              </tr>
              <tr>
                ${reportData?.years.map((year: string) => 
                  reportData.yearTerms[year].map((term: any) => `
                    <th>${term.name.replace('Term', 'T')}</th>
                  `).join('')
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${reportData?.subjects.map((subj: any) => `
                <tr>
                  <td class="subject-col">${subj.info.name}</td>
                  ${reportData.years.map((year: string) => 
                    reportData.yearTerms[year].map((term: any) => {
                      const score = subj.scores[term.id];
                      return `<td>${score ? (score.total || '-') : '-'}</td>`
                    }).join('')
                  ).join('')}
                </tr>
              `).join('')}
              <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td class="subject-col">Attendance</td>
                ${reportData?.years.map((year: string) => 
                  reportData.yearTerms[year].map((term: any) => 
                    `<td>${reportData.attendance[term.id] ?? '-'}</td>`
                  ).join('')
                ).join('')}
              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="signature-section">
            <div class="signature-box">
              ${signatureBase64 ? `<img src="${signatureBase64}" class="signature-overlay" alt="Signature" />` : ''}
              <div class="signature-line">HEADTEACHER'S SIGNATURE</div>
            </div>
          </div>

          <!-- Footer -->
          <div class="footer-note">
            This document is a cumulative record of the student's academic performance.
            Generated by School Management System on ${currentDate}.
          </div>
        </div>
      </body>
      </html>
    `
    
    printWindow.document.write(html)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
          <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4 py-4">
               <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-40 rounded" />
               </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
             <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 max-w-4xl mx-auto">
                <div className="flex flex-col items-center gap-4 mb-8">
                    <Skeleton className="h-20 w-20 rounded-full" />
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-6">
                    <div className="grid grid-cols-4 gap-4 mb-8">
                       <Skeleton className="h-10 w-full" />
                       <Skeleton className="h-10 w-full" />
                       <Skeleton className="h-10 w-full" />
                       <Skeleton className="h-10 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full rounded" />
                </div>
             </div>
          </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BackButton href="/student/dashboard" className="text-purple-600 hover:text-purple-700" />
              <div>
                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">Cumulative Record</h1>
                <p className="text-xs md:text-sm text-gray-600">Your academic performance history</p>
              </div>
            </div>
            {reportData && (
              <button
                onClick={generatePDF}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm md:text-base w-full sm:w-auto"
              >
                <Printer className="w-4 h-4" />
                <span className="sm:inline">Print Record</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {reportData ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto p-4 md:p-6">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-gray-300 bg-gray-50 p-3 text-left text-xs md:text-sm font-semibold text-gray-900 sticky left-0 z-10">
                      Subjects
                    </th>
                    {reportData.years.map((year: string) => (
                      <th
                        key={year}
                        colSpan={reportData.yearTerms[year].length}
                        className="border border-gray-300 bg-gray-50 p-3 text-center text-xs md:text-sm font-semibold text-gray-900"
                      >
                        {year}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {reportData.years.map((year: string) => 
                      reportData.yearTerms[year].map((term: any) => (
                        <th
                          key={term.id}
                          className="border border-gray-300 bg-gray-50 p-2 text-center text-xs font-medium text-gray-700 min-w-[80px]"
                        >
                          {term.name}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {reportData.subjects.map((subj: any) => (
                    <tr key={subj.info.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3 text-xs md:text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {subj.info.name}
                      </td>
                      {reportData.years.map((year: string) => 
                        reportData.yearTerms[year].map((term: any) => {
                          const score = subj.scores[term.id]
                          return (
                            <td key={term.id} className="border border-gray-300 p-2 text-center text-xs md:text-sm text-gray-700">
                              {score ? (
                                <div className="flex flex-col items-center">
                                  <span className="font-bold">{score.total ?? '-'}</span>
                                  <span className="text-[10px] md:text-xs text-gray-500">{score.grade}</span>
                                </div>
                              ) : '-'}
                            </td>
                          )
                        })
                      )}
                    </tr>
                  ))}
                  {/* Attendance Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td className="border border-gray-300 p-3 text-sm text-gray-900 sticky left-0 bg-gray-50">
                      Attendance (Days Present)
                    </td>
                    {reportData.years.map((year: string) => 
                      reportData.yearTerms[year].map((term: any) => (
                        <td key={term.id} className="border border-gray-300 p-2 text-center text-sm text-gray-900">
                          {reportData.attendance[term.id] ?? '-'}
                        </td>
                      ))
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900">No records found</h3>
            <p className="text-sm md:text-base text-gray-500">No academic records are available yet.</p>
          </div>
        )}
      </main>
    </div>
  )
}
