'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Search, Download, Printer, FileText, Users, User } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getUserProfile } from '@/lib/auth'

export default function CumulativeReportPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<'individual' | 'class'>('individual')
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null)
  const [reportData, setReportData] = useState<any | null>(null)
  const [bulkReportData, setBulkReportData] = useState<any[] | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }
      
      const { data: profile } = await getUserProfile(user.id)
      if (profile?.role !== 'admin') {
        router.push('/login?portal=admin')
        return
      }
      
      loadClasses()
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/login?portal=admin')
    } finally {
      setLoading(false)
    }
  }

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name')
      .order('name')
    if (data) setClasses(data)
  }

  // Search for students
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTerm.trim()) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          student_id,
          gender,
          classes (name)
        `)
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,student_id.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) throw error
      setStudents(data || [])
      setSelectedStudent(null)
      setReportData(null)
    } catch (error) {
      console.error('Error searching students:', error)
    } finally {
      setLoading(false)
    }
  }

  // Helper to fetch data for a single student
  const fetchStudentReportData = async (student: any) => {
    try {
      // 1. Get all scores for the student
      const { data: scores, error: scoresError } = await supabase
        .from('scores')
        .select(`
          *,
          subjects (id, name, code),
          academic_terms (id, name, academic_year, start_date)
        `)
        .eq('student_id', student.id)
        .order('academic_terms(academic_year)', { ascending: true })
        .order('academic_terms(start_date)', { ascending: true })

      if (scoresError) throw scoresError

      // 1b. Get attendance records
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('student_attendance')
        .select('term_id, days_present')
        .eq('student_id', student.id)

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

        // Track unique terms
        if (!termMap[termId]) {
          termMap[termId] = score.academic_terms
        }

        // Group terms by year
        if (!yearMap[year]) {
          yearMap[year] = []
        }
        if (!yearMap[year].find((t: any) => t.id === termId)) {
          yearMap[year].push(score.academic_terms)
        }

        // Track subjects and scores
        if (!subjectMap[subjectId]) {
          subjectMap[subjectId] = {
            info: score.subjects,
            scores: {}
          }
        }
        subjectMap[subjectId].scores[termId] = score
      })

      // Sort years and terms
      const sortedYears = Object.keys(yearMap).sort()
      sortedYears.forEach(year => {
        yearMap[year].sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
      })

      return {
        years: sortedYears,
        yearTerms: yearMap,
        subjects: Object.values(subjectMap).sort((a: any, b: any) => a.info.name.localeCompare(b.info.name)),
        attendance: attendanceMap
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
      // Return empty structure instead of null so student is not filtered out
      return {
        years: [],
        yearTerms: {},
        subjects: [],
        attendance: {}
      }
    }
  }

  // Load cumulative data for a student
  const loadCumulativeData = async (student: any) => {
    setSelectedStudent(student)
    setLoading(true)
    const data = await fetchStudentReportData(student)
    setReportData(data)
    setLoading(false)
  }

  // Load data for entire class
  const handleClassGenerate = async () => {
    if (!selectedClassId) return
    setLoading(true)
    setBulkReportData(null)
    setSelectedStudent(null)
    setReportData(null)

    try {
      // 1. Get all students in class
      const { data: classStudents, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          student_id,
          gender,
          classes (name)
        `)
        .eq('class_id', selectedClassId)
        .order('last_name')

      if (error) throw error
      if (!classStudents?.length) {
        toast.error('No students found in this class')
        setLoading(false)
        return
      }

      // 2. Fetch data for all students
      const reports = await Promise.all(
        classStudents.map(async (student: any) => {
          const data = await fetchStudentReportData(student)
          return { student, data }
        })
      )

      setBulkReportData(reports.filter(r => r.data)) // Filter out failed fetches
    } catch (error) {
      console.error('Error generating class reports:', error)
      toast.error('Failed to generate reports')
    } finally {
      setLoading(false)
    }
  }

  const generatePDF = async () => {
    const reportsToPrint = bulkReportData || (selectedStudent && reportData ? [{ student: selectedStudent, data: reportData }] : [])
    if (!reportsToPrint.length) return

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

    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).toUpperCase()
    
    const backgroundImage = watermarkBase64 ? `url('${watermarkBase64}')` : 'none'

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Cumulative Reports</title>
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
              page-break-after: always;
            }
            .report-card:last-child {
              page-break-after: auto;
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
            padding-bottom: 35px;
            width: 287mm; /* A4 Landscape width minus margins */
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
            font-family: 'Courier New', Courier, monospace;
            font-weight: normal;
            text-transform: uppercase;
            text-align: center;
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
          td:not(.subject-col) {
            font-family: 'Courier New', Courier, monospace;
            font-weight: normal;
            text-transform: uppercase;
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
            margin-top: 20px;
            height: 120px;
          }
          .signature-box {
            text-align: center;
            width: 200px;
            position: relative;
          }
          .signature-line {
            border-top: 1px solid #00008B;
            margin-top: 80px;
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
            height: 140px;
            z-index: 1;
            mix-blend-mode: multiply;
          }
          .footer-note {
            position: absolute;
            bottom: 0;
            left: 10px;
            right: 10px;
            font-size: 8pt;
            text-align: center;
            font-style: italic;
            border-top: 1px solid #00008B;
            padding-top: 5px;
            padding-bottom: 2px;
            color: #00008B;
          }
        </style>
      </head>
      <body>
        ${reportsToPrint.map(({ student, data }) => `
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
                ${data?.years.map((year: string) => `
                  <th colspan="${data.yearTerms[year].length}">${year}</th>
                `).join('')}
              </tr>
              <tr>
                ${data?.years.map((year: string) => 
                  data.yearTerms[year].map((term: any) => `
                    <th>${term.name.replace('Term', 'T')}</th>
                  `).join('')
                ).join('')}
              </tr>
            </thead>
            <tbody>
              ${data?.subjects.map((subj: any) => `
                <tr>
                  <td class="subject-col">${subj.info.name}</td>
                  ${data.years.map((year: string) => 
                    data.yearTerms[year].map((term: any) => {
                      const score = subj.scores[term.id];
                      return `<td>${score ? (score.total ? Number(score.total).toFixed(1) : '-') : '-'}</td>`
                    }).join('')
                  ).join('')}
                </tr>
              `).join('')}
              <tr style="background-color: #f9f9f9; font-weight: bold;">
                <td class="subject-col">Attendance</td>
                ${data?.years.map((year: string) => 
                  data.yearTerms[year].map((term: any) => 
                    `<td>${data.attendance[term.id] ?? '-'}</td>`
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
        `).join('')}
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="text-center w-full max-w-4xl px-4">
             <div className="space-y-4">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                     <Skeleton className="h-32 rounded-lg" />
                </div>
             </div>
         </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 print:bg-white print:pb-0">
      <header className="bg-white shadow print:hidden">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/reports" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Cumulative Report</h1>
              <p className="text-sm text-gray-600">Generate cumulative academic records</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Mode Selection */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1 rounded-lg shadow-sm border inline-flex">
            <button
              onClick={() => {
                setMode('individual')
                setBulkReportData(null)
                setReportData(null)
                setSelectedStudent(null)
              }}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                mode === 'individual' 
                  ? 'bg-purple-100 text-purple-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User className="w-4 h-4" />
              Individual Student
            </button>
            <button
              onClick={() => {
                setMode('class')
                setReportData(null)
                setSelectedStudent(null)
                setStudents([])
              }}
              className={`px-4 py-2 rounded-md flex items-center gap-2 transition-colors ${
                mode === 'class' 
                  ? 'bg-purple-100 text-purple-700 font-medium' 
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Class / Group
            </button>
          </div>
        </div>

        {/* Search / Filter Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {mode === 'individual' ? (
            <>
              <form onSubmit={handleSearch} className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search by name or student ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {/* Search Results */}
              {students.length > 0 && !selectedStudent && (
                <div className="mt-6 border-t pt-4">
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">Select a student:</h3>
                  <div className="grid gap-2">
                    {students.map((student) => (
                      <button
                        key={student.id}
                        onClick={() => loadCumulativeData(student)}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-transparent hover:border-gray-200 transition-colors text-left"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{student.last_name} {student.first_name}</p>
                          <p className="text-sm text-gray-500">{student.student_id} • {student.classes?.name}</p>
                        </div>
                        <ArrowLeft className="w-4 h-4 rotate-180 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Select a Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleClassGenerate}
                disabled={loading || !selectedClassId}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 h-[42px]"
              >
                {loading ? 'Generating...' : 'Generate Reports'}
              </button>
            </div>
          )}
        </div>

        {/* Bulk Report Summary */}
        {mode === 'class' && bulkReportData && (
          <div className="bg-white rounded-lg shadow p-6 mb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Reports Generated Successfully</h2>
            <p className="text-gray-600 mb-6">
              Ready to print cumulative records for {bulkReportData.length} students.
            </p>
            <button
              onClick={generatePDF}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Printer className="w-5 h-5" />
              Print All Reports
            </button>
          </div>
        )}

        {/* Individual Report Preview */}
        {mode === 'individual' && selectedStudent && reportData && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {selectedStudent.last_name} {selectedStudent.first_name}
                </h2>
                <p className="text-sm text-gray-600">Cumulative Academic Record</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generatePDF}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Printer className="w-4 h-4" />
                  Print / PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto p-6">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    <th rowSpan={2} className="border border-gray-300 bg-gray-50 p-3 text-left text-sm font-semibold text-gray-900 sticky left-0 z-10">
                      Subjects
                    </th>
                    {reportData.years.map((year: string) => (
                      <th
                        key={year}
                        colSpan={reportData.yearTerms[year].length}
                        className="border border-gray-300 bg-gray-50 p-3 text-center text-sm font-semibold text-gray-900"
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
                      <td className="border border-gray-300 p-3 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                        {subj.info.name}
                      </td>
                      {reportData.years.map((year: string) => 
                        reportData.yearTerms[year].map((term: any) => {
                          const score = subj.scores[term.id]
                          return (
                            <td key={term.id} className="border border-gray-300 p-2 text-center text-sm text-gray-700">
                              {score ? (
                                <div className="flex flex-col items-center">
                                  <span className="font-bold">{score.total ? Number(score.total).toFixed(1) : '-'}</span>
                                  <span className="text-xs text-gray-500">{score.grade}</span>
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
        )}
      </main>
    </div>
  )
}
