'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, Search, Download, FileText, CheckSquare, Square } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import Image from 'next/image'
import { generateBatchReportHTML } from '@/lib/reports/generator'
import { ReportCardData, ReportCardTheme, ReportRemarks, Grade } from '@/lib/reports/types'
import { toast } from 'react-hot-toast'

// Types
type Student = {
  id: string
  first_name: string
  last_name: string
  student_id: string
  gender: string
  class_name?: string
  photo_url?: string
  status?: string
}

interface ExtendedReport {
    student: any
    reportData: ReportCardData
    remarks: ReportRemarks
}

// Removed ReportCard component - using shared generator


export default function ReportsPage() {
  const supabase = getSupabaseBrowserClient()

  // State
  const [loading, setLoading] = useState(true)
  const [fetchingResults, setFetchingResults] = useState(false)
  
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [academicSettings, setAcademicSettings] = useState<any>(null)
  const [scoreSettings, setScoreSettings] = useState({ classScorePercentage: 30, examScorePercentage: 70 })
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [reportData, setReportData] = useState<ExtendedReport[]>([])
  
  const [theme, setTheme] = useState<ReportCardTheme>({})

  useEffect(() => {
    loadInitialData()
    loadThemeImages()
  }, [])
  
  // Effect to load students when selection changes
  useEffect(() => {
    if (selectedClass) {
        loadStudents()
    } else {
        setStudents([])
        setReportData([])
    }
  }, [selectedClass])

  async function loadThemeImages() {
      // Helper to fetch base64
      const loadBase64 = async (url: string) => {
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error('Failed to fetch')
          const blob = await response.blob()
          return new Promise<string>((resolve) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          console.error('Failed to load image', url)
          return ''
        }
      }

      const [watermark, logo, methodist, signature] = await Promise.all([
        loadBase64('/school_crest-removebg-preview (2).png'),
        loadBase64('/school_crest.png'),
        loadBase64('/Methodist_logo.png'),
        loadBase64('/signature.png') 
      ])

      setTheme({
        watermarkImage: watermark,
        logoImage: logo,
        methodistLogoImage: methodist,
        signatureImage: signature
      })
  }

  async function loadInitialData() {
    try {
      const [classesRes, termsRes, settingsRes, systemSettingsRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('academic_terms').select('id, name, academic_year, is_current').order('start_date', { ascending: false }),
        supabase.from('academic_settings').select('*').single(),
        supabase.from('system_settings').select('class_score_percentage, exam_score_percentage').single()
      ])
      
      if (classesRes.data) setClasses(classesRes.data)
      if (termsRes.data) {
          setTerms(termsRes.data)
          // Default to active term
          const active = termsRes.data.find((t: any) => t.is_current)
          if (active) setSelectedTerm(active.id)
          else if (termsRes.data.length > 0) setSelectedTerm(termsRes.data[0].id)
      }
      if (settingsRes.data) setAcademicSettings(settingsRes.data)
      if (systemSettingsRes.data) {
          setScoreSettings({
            classScorePercentage: systemSettingsRes.data.class_score_percentage || 30,
            examScorePercentage: systemSettingsRes.data.exam_score_percentage || 70
          })
      }
    } catch (error) {
      console.error('Error loading options:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadStudents() {
      if (!selectedClass) return
      setLoading(true)
      try {
          // Fetch students
          const { data: classData } = await supabase.from('classes').select('name').eq('id', selectedClass).single()
          const { data: stdData } = await supabase
            .from('students')
            .select('id, first_name, last_name, student_id, gender, status, photo_url')
            .eq('class_id', selectedClass)
            .eq('status', 'active')
            .order('last_name')
            
          if (stdData) {
              const studentsWithClass = stdData.map((s: any) => ({ ...s, class_name: classData?.name }))
              setStudents(studentsWithClass)
              // Select all by default
              setSelectedStudentIds(new Set(stdData.map((s: any) => s.id)))
          }
      } catch(err) {
          console.error(err)
      } finally {
          setLoading(false)
      }
  }
  
  async function prepareReports() {
     if (!selectedTerm || selectedStudentIds.size === 0) return
     setFetchingResults(true)
     
     try {
         // Get selected term and class details
         const term = terms.find(t => t.id === selectedTerm)
         const classData = classes.find(c => c.id === selectedClass)
         
         // 1. Fetch ALL students scores in the class to calculate positions
         const allStudentIds = students.map(s => s.id)

         // Fetch all scores AND class subjects
         const [scoresRes, classSubjectsRes] = await Promise.all([
             supabase
                .from('scores')
                .select(`
                    student_id,
                    subject_id,
                    subjects(name),
                    class_score,
                    exam_score,
                    total,
                    grade,
                    remarks
                `)
                .in('student_id', allStudentIds)
                .eq('term_id', selectedTerm),
             
             supabase
                .from('class_subjects')
                .select('subject_id, subjects(name)')
                .eq('class_id', selectedClass)
                .eq('academic_year', term?.academic_year)
         ])
         
         if (scoresRes.error) throw scoresRes.error
         const allScores = scoresRes.data
         const classSubjects = classSubjectsRes.data
             
         // 2. Calculate aggregates for ranking
         const studentAggregates = new Map<string, { total: number, average: number }>()

         // Group scores by student
         const scoresByStudent = new Map<string, any[]>()
         if (allScores) {
             allScores.forEach((s: any) => {
                 const list = scoresByStudent.get(s.student_id) || []
                 list.push(s)
                 scoresByStudent.set(s.student_id, list)
             })
         }
         
         allStudentIds.forEach(id => {
             const sScores = scoresByStudent.get(id) || []
             const total = sScores.reduce((sum, s) => sum + (s.total || 0), 0)
             const average = sScores.length > 0 ? total / sScores.length : 0
             studentAggregates.set(id, { total, average })
         })
         
         // Sort IDs by average descending to determine rank
         const sortedIds = [...allStudentIds].sort((a, b) => {
             return (studentAggregates.get(b)?.average || 0) - (studentAggregates.get(a)?.average || 0)
         })
         
         // 3. Build data for SELECTED students
         const reports: ExtendedReport[] = []
         
         for (const studentId of Array.from(selectedStudentIds)) {
             const student = students.find(s => s.id === studentId)
             if (!student) continue
             
             const sScores = scoresByStudent.get(studentId) || []
             const aggs = studentAggregates.get(studentId) || { total: 0, average: 0 }
             const position = sortedIds.indexOf(studentId) + 1
             
             // Map scores to Grade objects matching shared type
             const grades: Grade[] = sScores.map((s: any) => ({
                 subject_name: s.subjects?.name || 'Unknown',
                 class_score: s.class_score || 0,
                 exam_score: s.exam_score || 0,
                 total: s.total || 0,
                 grade: s.grade || '-',
                 remarks: s.remarks || '',
                 rank: 0,
                 position: 0
             }))
             
             // Add missing subjects from classSubjects
             if (classSubjects) {
                 const currentSubjectIds = new Set(sScores.map((s: any) => s.subject_id))
                 classSubjects.forEach((cs: any) => {
                     if (!currentSubjectIds.has(cs.subject_id)) {
                         grades.push({
                             subject_name: cs.subjects?.name || 'Unknown',
                             class_score: null,
                             exam_score: null,
                             total: null,
                             grade: null,
                             remarks: null,
                             rank: 0,
                             position: 0
                         })
                     }
                 })
                 // Sort alphabetically
                 grades.sort((a, b) => a.subject_name.localeCompare(b.subject_name))
             }
             
             // Construct ReportCardData strict type
             const reportDataObj: ReportCardData = {
                 termId: selectedTerm,
                 termName: term?.name || '',
                 year: term?.academic_year || '',
                 grades: grades,
                 totalScore: aggs.total,
                 averageScore: Number(aggs.average.toFixed(2)),
                 position: position,
                 totalClassSize: students.length,
                 attendance: { present: 0, total: 0 },
                 remarks: {
                     attitude: '',
                     interest: '',
                     conduct: '',
                     classTeacher: '',
                     headTeacher: ''
                 }
             }

             // Enhance student object for generator compatibility
             // The generator expects: student.profiles.full_name, student.classes.name
             const enhancedStudent = {
                 ...student,
                 classes: { name: classData?.name },
                 profiles: { full_name: `${student.last_name}, ${student.first_name}` }
             }
             
             reports.push({
                 student: enhancedStudent,
                 reportData: reportDataObj,
                 remarks: reportDataObj.remarks as ReportRemarks
             })
         }
         
         setReportData(reports)
         toast.success(`Prepared ${reports.length} reports`)
         
     } catch (err) {
         console.error(err)
         toast.error('Failed to prepare reports')
     } finally {
         setFetchingResults(false)
     }
  }

  const handlePrint = () => {
      if (reportData.length === 0) return
      
      try {
        const htmlContent = generateBatchReportHTML(
            reportData, 
            academicSettings, 
            theme,
            scoreSettings.classScorePercentage,
            scoreSettings.examScorePercentage
        )
        
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(htmlContent)
            printWindow.document.close()
        } else {
            toast.error('Pop-up blocked. Please allow pop-ups for this site to print.')
        }
      } catch (err: any) {
        console.error('Print error:', err)
        toast.error('Failed to initiate print: ' + err.message)
      }
  }

  // Toggle selection
  const toggleStudent = (id: string) => {
      const newSet = new Set(selectedStudentIds)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      setSelectedStudentIds(newSet)
  }

  const toggleAll = () => {
      if (selectedStudentIds.size === students.length) {
          setSelectedStudentIds(new Set())
      } else {
          setSelectedStudentIds(new Set(students.map(s => s.id)))
      }
  }

  const printReady = reportData.length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
         <div className="text-center w-full max-w-7xl px-4">
             <div className="space-y-4">
                <Skeleton className="h-8 w-64 mx-auto" />
                <Skeleton className="h-4 w-48 mx-auto" />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 mb-8">
                     <Skeleton className="h-24 rounded-lg" />
                     <Skeleton className="h-24 rounded-lg" />
                     <Skeleton className="h-24 rounded-lg" />
                     <Skeleton className="h-24 rounded-lg" />
                </div>

                <div className="grid grid-cols-1 gap-8">
                    <Skeleton className="h-96 rounded-lg" />
                </div>
             </div>
         </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 pb-20">
      <div className="max-w-[95%] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/results" />
            <h1 className="text-2xl font-bold text-gray-800">Student Report Cards</h1>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Academic Term</label>
                 <select 
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 >
                     <option value="">Select Term</option>
                     {terms.map(t => (
                         <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                     ))}
                 </select>
             </div>
             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                 <select 
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                 >
                     <option value="">Select Class</option>
                     {classes.map(c => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                 </select>
             </div>
        </div>
        
        {/* Student List */}
        {selectedClass && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-gray-500" />
                        Students in Class ({students.length})
                    </h2>
                    <div className="space-x-2">
                        <button 
                             onClick={prepareReports}
                             disabled={selectedStudentIds.size === 0 || fetchingResults}
                             className={`px-4 py-2 rounded text-sm font-medium flex items-center gap-2 ${
                                 printReady 
                                 ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                 : 'bg-blue-600 text-white hover:bg-blue-700'
                             } disabled:opacity-50`}
                        >
                            {fetchingResults ? 'Preparing...' : printReady ? 'Ready to Print' : 'Prepare Reports'}
                        </button>
                        {printReady && (
                             <button 
                                onClick={handlePrint}
                                className="px-4 py-2 bg-gray-800 text-white rounded text-sm font-medium hover:bg-gray-900 flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print Now
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="max-h-[400px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left w-10">
                                    <button onClick={toggleAll} className="text-gray-500 hover:text-gray-700">
                                        {selectedStudentIds.size === students.length && students.length > 0 ? (
                                            <CheckSquare className="w-5 h-5 text-blue-600" />
                                        ) : (
                                            <Square className="w-5 h-5" />
                                        )}
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">Loading students...</td>
                                </tr>
                            ) : students.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No students found.</td>
                                </tr>
                            ) : (
                                students.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <button onClick={() => toggleStudent(student.id)}>
                                                {selectedStudentIds.has(student.id) ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-gray-400" />
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            {student.last_name}, {student.first_name}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{student.student_id}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                                {student.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

      </div>
      

    </div>
  )
}

function UsersIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
