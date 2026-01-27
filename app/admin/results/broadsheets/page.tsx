'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Search, Filter } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useReactToPrint } from 'react-to-print'

export default function BroadsheetsPage() {
  const supabase = getSupabaseBrowserClient()
  const componentRef = useRef<HTMLDivElement>(null)
  
  // Filters
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  const [selectedClassName, setSelectedClassName] = useState('')
  const [selectedTermName, setSelectedTermName] = useState('')
  
  // Data
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [broadsheetData, setBroadsheetData] = useState<{
      subjects: any[],
      students: any[]
  }>({ subjects: [], students: [] })

  useEffect(() => {
    loadOptions()
  }, [])

  async function loadOptions() {
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
      }
    } catch (error) {
      console.error('Error loading options:', error)
    }
  }

  async function generateBroadsheet() {
      if (!selectedClass || !selectedTerm) {
          alert('Please select both a class and a term.')
          return
      }
      
      setLoading(true)
      try {
          // Get names for header
          const cls = classes.find(c => c.id === selectedClass)
          const trm = terms.find(t => t.id === selectedTerm)
          setSelectedClassName(cls?.name || '')
          setSelectedTermName(`${trm?.name} - ${trm?.academic_year}` || '')

          // 1. Fetch Students
          const { data: students } = await supabase
            .from('students')
            .select('id, first_name, last_name, student_id, gender')
            .eq('class_id', selectedClass)
            .eq('status', 'active')
            .order('last_name')
          
          if (!students || students.length === 0) {
              setBroadsheetData({ subjects: [], students: [] })
              setGenerated(true)
              setLoading(false)
              return
          }

          // 2. Fetch Scores for these students
          const studentIds = students.map(s => s.id)
          const { data: scores } = await supabase
            .from('scores')
            .select(`
                student_id,
                subject_id,
                total,
                grade
            `)
            .in('student_id', studentIds)
            .eq('term_id', selectedTerm)
            
          // 3. Identify Subjects
          const subjectIds = Array.from(new Set(scores?.map((s: any) => s.subject_id)))
          const { data: subjects } = await supabase
            .from('subjects')
            .select('id, name, code')
            .in('id', subjectIds)
            .order('name')
            
          // 4. Build Data Structure
          if (subjects) {
              const processedStudents = students.map(student => {
                  const studentScores = scores?.filter((s: any) => s.student_id === student.id) || []
                  const subjectScores: {[key: string]: any} = {}
                  let totalScore = 0
                  
                  studentScores.forEach((s: any) => {
                      subjectScores[s.subject_id] = {
                          score: s.total,
                          grade: s.grade
                      }
                      totalScore += (s.total || 0)
                  })
                  
                  return {
                      ...student,
                      scores: subjectScores,
                      total: totalScore,
                      average: subjects.length > 0 ? (totalScore / subjects.length).toFixed(1) : 0,
                      position: 0 // To be calculated
                  }
              })

              // Calculate positions
              processedStudents.sort((a, b) => b.total - a.total)
              processedStudents.forEach((s, idx) => {
                  s.position = idx + 1
              })
              
              // Re-sort alphabetically if needed, but usually broadsheets are position or name based.
              // Let's keep position based for now, or add toggle later.
              
              setBroadsheetData({
                  subjects: subjects,
                  students: processedStudents
              })
              setGenerated(true)
          }

      } catch (err) {
          console.error(err)
      } finally {
          setLoading(false)
      }
  }

  const handlePrint = useReactToPrint({
      content: () => componentRef.current,
      documentTitle: `Broadsheet - ${selectedClassName} - ${selectedTermName}`
  })

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 flex flex-col">
      <div className="max-w-full mx-auto w-full flex-1">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Link href="/admin/results" className="text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">Results Broadsheets</h1>
          </div>
          {generated && (
              <button 
                onClick={handlePrint}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                  <Download className="w-4 h-4" />
                  <span>Download / Print</span>
              </button>
          )}
        </div>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             <div className="md:col-span-1">
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
             <div className="md:col-span-1">
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
             <div className="md:col-span-1">
                 <button 
                    onClick={generateBroadsheet}
                    disabled={loading || !selectedClass || !selectedTerm}
                    className="w-full bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                 >
                     {loading ? (
                         <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Loading...
                         </>
                     ) : (
                         <>
                            <Filter className="w-4 h-4 mr-2" />
                            Generate View
                         </>
                     )}
                 </button>
             </div>
        </div>

        {/* Broadsheet Table */}
        {generated && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto p-4" ref={componentRef}>
                    <div className="min-w-max">
                        {/* Print Header */}
                        <div className="hidden print:block text-center mb-6">
                            <h1 className="text-2xl font-bold uppercase">Biriwa Methodist 'C' Basic School</h1>
                            <h2 className="text-xl font-bold mt-2">Class Broadsheet</h2>
                            <div className="flex justify-center gap-4 mt-2 text-sm font-medium">
                                <span>Class: {selectedClassName}</span>
                                <span>Term: {selectedTermName}</span>
                            </div>
                        </div>

                        <table className="w-full border-collapse border border-gray-300 text-xs md:text-sm">
                            <thead>
                                <tr className="bg-gray-100 print:bg-gray-100">
                                    <th className="border border-gray-300 p-2 text-left w-10 sticky left-0 bg-gray-100 z-10">Pos</th>
                                    <th className="border border-gray-300 p-2 text-left min-w-[150px] sticky left-[40px] bg-gray-100 z-10">Student Name</th>
                                    
                                    {/* Subject Headers */}
                                    {broadsheetData.subjects.map(subject => (
                                        <th key={subject.id} className="border border-gray-300 p-2 text-center min-w-[60px] cursor-help" title={subject.name}>
                                            <div className="truncate max-w-[80px] mx-auto">{subject.code || subject.name.substring(0, 3)}</div>
                                        </th>
                                    ))}

                                    <th className="border border-gray-300 p-2 text-center font-bold bg-blue-50">Total</th>
                                    <th className="border border-gray-300 p-2 text-center font-bold bg-blue-50">Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                {broadsheetData.students.length > 0 ? (
                                    broadsheetData.students.map((student) => (
                                        <tr key={student.id} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 p-2 text-center sticky left-0 bg-white hover:bg-gray-50 z-10">{student.position}</td>
                                            <td className="border border-gray-300 p-2 font-medium sticky left-[40px] bg-white hover:bg-gray-50 z-10 whitespace-nowrap">
                                                {student.last_name}, {student.first_name}
                                            </td>
                                            
                                            {/* Subject Scores */}
                                            {broadsheetData.subjects.map(subject => {
                                                const scoreData = student.scores[subject.id]
                                                return (
                                                    <td key={subject.id} className="border border-gray-300 p-2 text-center">
                                                        {scoreData ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="font-semibold">{scoreData.score}</span>
                                                                {/* <span className="text-[10px] text-gray-500">{scoreData.grade}</span> */}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                            
                                            <td className="border border-gray-300 p-2 text-center font-bold bg-blue-50">{student.total}</td>
                                            <td className="border border-gray-300 p-2 text-center font-bold bg-blue-50">{student.average}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={broadsheetData.subjects.length + 4} className="p-8 text-center text-gray-500">
                                            No students found in this class.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}
