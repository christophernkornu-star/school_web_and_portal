'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer, Search, Download, FileText, CheckSquare, Square } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useReactToPrint } from 'react-to-print'
import BackButton from '@/components/ui/BackButton'
import { Skeleton } from '@/components/ui/skeleton'

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

type Score = {
  subject_id: string
  subject_name: string
  class_score: number
  exam_score: number
  total: number
  grade: string
  remarks: string
  position?: string
}

type ReportData = {
  student: Student
  scores: Score[]
  attendance?: { present: number, total: number }
  teacher_remarks?: string
  headteacher_remarks?: string
}

// Report Card Component (Hidden/Print Only)
const ReportCard = ({ data, termName, academicYear }: { data: ReportData, termName: string, academicYear: string }) => {
  const schoolName = "Biriwa Methodist 'C' Basic School"
  const schoolAddress = "P.O. Box 123, Biriwa" // Placeholder
  
  // Calculate aggregate stats
  const totalScore = data.scores.reduce((sum, s) => sum + (s.total || 0), 0)
  const average = data.scores.length > 0 ? (totalScore / data.scores.length).toFixed(1) : '0'

  return (
    <div className="bg-white p-8 max-w-[210mm] mx-auto min-h-[297mm] text-black print:text-black">
      {/* Header */}
      <div className="border-b-4 border-double border-gray-800 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
             {/* Logo Placeholder */}
             <span className="text-xs text-center p-2">School Logo</span>
          </div>
          <div className="text-center flex-1 px-4">
            <h1 className="text-2xl font-bold uppercase tracking-wide">{schoolName}</h1>
            <p className="text-sm font-medium">{schoolAddress}</p>
            <h2 className="text-xl font-bold mt-2 uppercase underline decoration-2 underline-offset-4">
              Student Term Report
            </h2>
          </div>
          <div className="w-24">
             {/* Photo Placeholder */}
             {data.student.photo_url ? (
                 <img src={data.student.photo_url} alt="Student" className="w-24 h-24 object-cover border border-gray-300" />
             ) : (
                <div className="w-24 h-24 border border-gray-300 flex items-center justify-center text-xs text-gray-400">
                    Photo
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Student Info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
        <div className="flex bg-gray-50 p-2 rounded">
          <span className="font-bold w-32">Name:</span>
          <span className="uppercase">{data.student.last_name}, {data.student.first_name}</span>
        </div>
        <div className="flex bg-gray-50 p-2 rounded">
          <span className="font-bold w-32">ID Number:</span>
          <span>{data.student.student_id}</span>
        </div>
        <div className="flex bg-gray-50 p-2 rounded">
          <span className="font-bold w-32">Class:</span>
          <span>{data.student.class_name}</span>
        </div>
        <div className="flex bg-gray-50 p-2 rounded">
          <span className="font-bold w-32">Term:</span>
          <span>{termName} ({academicYear})</span>
        </div>
        <div className="flex bg-gray-50 p-2 rounded">
          <span className="font-bold w-32">No. on Roll:</span>
          <span>--</span>
        </div>
        <div className="flex bg-gray-50 p-2 rounded">
            <span className="font-bold w-32">Position:</span>
            <span>--</span> 
        </div>
      </div>

      {/* Results Table */}
      <table className="w-full border-collapse border border-gray-800 mb-6 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-600 p-2 text-left">Subject</th>
            <th className="border border-gray-600 p-2 text-center w-16">Class (30%)</th>
            <th className="border border-gray-600 p-2 text-center w-16">Exam (70%)</th>
            <th className="border border-gray-600 p-2 text-center w-16">Total (100%)</th>
            <th className="border border-gray-600 p-2 text-center w-16">Grade</th>
            <th className="border border-gray-600 p-2 text-left w-32">Remarks</th>
          </tr>
        </thead>
        <tbody>
          {data.scores.map((score, idx) => (
            <tr key={idx}>
              <td className="border border-gray-600 p-2 font-medium">{score.subject_name}</td>
              <td className="border border-gray-600 p-2 text-center">{score.class_score}</td>
              <td className="border border-gray-600 p-2 text-center">{score.exam_score}</td>
              <td className="border border-gray-600 p-2 text-center font-bold">{score.total}</td>
              <td className="border border-gray-600 p-2 text-center">{score.grade}</td>
              <td className="border border-gray-600 p-2 text-left text-xs">{score.remarks}</td>
            </tr>
          ))}
          {/* Summary Row */}
          <tr className="bg-gray-50 font-bold">
            <td className="border border-gray-600 p-2 text-right">AVERAGE</td>
            <td className="border border-gray-600 p-2" colSpan={2}></td>
            <td className="border border-gray-600 p-2 text-center">{average}</td>
            <td className="border border-gray-600 p-2" colSpan={2}></td>
          </tr>
        </tbody>
      </table>

      {/* Remarks Section */}
      <div className="space-y-6 mt-8">
        <div className="border border-gray-300 p-4 rounded min-h-[80px]">
          <p className="font-bold text-sm mb-2 border-b border-gray-200 pb-1 w-full">Class Teacher's Remarks:</p>
          <p className="text-sm italic text-gray-600">Good performance...</p>
        </div>
        
        <div className="border border-gray-300 p-4 rounded min-h-[80px]">
           <p className="font-bold text-sm mb-2 border-b border-gray-200 pb-1 w-full">Head Teacher's Remarks:</p>
           <p className="text-sm italic text-gray-600">Promoted to next class.</p>
        </div>
      </div>

       {/* Signatures */}
       <div className="flex justify-between mt-12 pt-8">
          <div className="text-center w-48">
             <div className="border-b border-black mb-2"></div>
             <p className="text-xs uppercase font-bold">Class Teacher</p>
          </div>
          <div className="text-center w-48">
             <div className="border-b border-black mb-2"></div>
             <p className="text-xs uppercase font-bold">Head Teacher</p>
          </div>
       </div>
       
       <div className="mt-8 text-center text-[10px] text-gray-400">
          Generated via Biriwa Methodist SMS on {new Date().toLocaleDateString()}
       </div>
       
       {/* Page Break for Print */}
       <div className="break-after-page"></div>
    </div>
  )
}

export default function ReportsPage() {
  const supabase = getSupabaseBrowserClient()
  const componentRef = useRef<HTMLDivElement>(null)

  // State
  const [loading, setLoading] = useState(true)
  const [fetchingResults, setFetchingResults] = useState(false)
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [reportData, setReportData] = useState<ReportData[]>([])

  useEffect(() => {
    loadInitialData()
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

  async function loadInitialData() {
    try {
      const [classesRes, termsRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('academic_terms').select('id, name, academic_year, is_current').order('start_date', { ascending: false })
      ])
      
      if (classesRes.data) setClasses(classesRes.data)
      if (termsRes.data) {
          setTerms(termsRes.data)
          // Default to active term
          const active = termsRes.data.find((t: any) => t.is_current)
          if (active) setSelectedTerm(active.id)
          else if (termsRes.data.length > 0) setSelectedTerm(termsRes.data[0].id)
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
            .select('id, first_name, last_name, student_id, gender, status')
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
         // Get selected term details
         const term = terms.find(t => t.id === selectedTerm)
         
         const reportPromises = Array.from(selectedStudentIds).map(async (studentId) => {
             const student = students.find(s => s.id === studentId)
             if (!student) return null
             
             // Fetch scores
             const { data: scores } = await supabase
                .from('scores')
                .select(`
                    subject_id,
                    subjects(name),
                    class_score,
                    exam_score,
                    total,
                    grade,
                    remarks
                `)
                .eq('student_id', studentId)
                .eq('term_id', selectedTerm)
             
             const formattedScores: Score[] = scores?.map((s: any) => ({
                 subject_id: s.subject_id,
                 subject_name: s.subjects?.name || 'Unknown',
                 class_score: s.class_score,
                 exam_score: s.exam_score,
                 total: s.total,
                 grade: s.grade,
                 remarks: s.remarks
             })) || []
             
             return {
                 student,
                 scores: formattedScores
             }
         })
         
         const reports = (await Promise.all(reportPromises)).filter(Boolean) as ReportData[]
         setReportData(reports)
         
     } catch (err) {
         console.error(err)
     } finally {
         setFetchingResults(false)
     }
  }

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  } as any)

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

  const printReady = reportData.length > 0 && reportData.length === selectedStudentIds.size

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
      
      {/* Hidden Print Container */}
      <div style={{ display: 'none' }}>
        <div ref={componentRef}>
            {reportData.map((data, idx) => {
                const term = terms.find(t => t.id === selectedTerm)
                return (
                    <ReportCard 
                        key={idx} 
                        data={data} 
                        termName={term?.name || ''} 
                        academicYear={term?.academic_year || ''}
                    />
                )
            })}
        </div>
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
