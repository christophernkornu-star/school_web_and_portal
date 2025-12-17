'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'

interface Student {
  id: string
  first_name: string
  last_name: string
  gender: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface ProcessedStudent {
  student: Student
  scores: Record<string, { total: number | string }>
  grandTotal: number
  average: number
  position: number
}

const getShortSubjectName = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('mathematics') || n.includes('maths')) return 'Math'
  if (n.includes('english')) return 'Eng'
  if (n.includes('science')) return 'Sci'
  if (n.includes('social')) return 'Soc'
  if (n.includes('religious') || n.includes('rme')) return 'RME'
  if (n.includes('creative') || n.includes('arts')) return 'C.A.D'
  if (n.includes('computing') || n.includes('ict')) return 'Comp'
  if (n.includes('world') || n.includes('people')) return 'OWOP'
  if (n.includes('history')) return 'Hist'
  if (n.includes('french')) return 'Fren'
  if (n.includes('ghanaian')) return 'G.Lang'
  if (n.includes('career')) return 'C.Tech'
  if (n.includes('physical')) return 'PE'
  
  return name.substring(0, 4)
}

export default function ClassReportPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  
  const [sheetData, setSheetData] = useState<{
    students: ProcessedStudent[]
    subjects: Subject[]
    className: string
    termName: string
  } | null>(null)

  useEffect(() => {
    async function loadInitialData() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          alert('Teacher profile not found.')
          return
        }

        // Get classes where the teacher is a CLASS TEACHER
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        const classTeacherClasses = classAccess.filter(c => c.is_class_teacher === true)
        
        setClasses(classTeacherClasses)

        // Load terms
        const { data: termsData } = await supabase
          .from('academic_terms')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (termsData) {
          setTerms(termsData)
          // Auto-select current term
          const { data: settings } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'current_term')
            .single()
            
          if (settings) {
            setSelectedTerm(settings.setting_value)
          }
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }

    loadInitialData()
  }, [router])

  async function generateReport() {
    if (!selectedClass || !selectedTerm) return
    
    setGenerating(true)
    try {
      // 1. Get Class Details
      const selectedClassData = classes.find(c => c.class_id === selectedClass)
      const className = selectedClassData?.class_name || ''
      const termName = terms.find(t => t.id === selectedTerm)?.name || ''

      // 2. Get Students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, gender')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name')

      if (studentsError || !studentsData || studentsData.length === 0) {
        alert('No students found in this class.')
        setGenerating(false)
        return
      }

      // 3. Get Scores first to determine relevant subjects
      const { data: scoresData } = await supabase
        .from('scores')
        .select('student_id, subject_id, total')
        .in('student_id', studentsData.map((s: any) => s.id))
        .eq('term_id', selectedTerm)

      if (!scoresData || scoresData.length === 0) {
        alert('No scores found for this class and term.')
        setGenerating(false)
        return
      }

      // 4. Get Subjects that have scores
      const subjectIds = Array.from(new Set(scoresData.map((s: any) => s.subject_id)))
      
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .in('id', subjectIds)
        .order('name')

      if (!subjectsData || subjectsData.length === 0) {
        alert('No subjects found.')
        setGenerating(false)
        return
      }

      // 5. Process Data
      const processedStudents: ProcessedStudent[] = studentsData.map((student: any) => {
        const studentScores: Record<string, any> = {}
        let totalScoreSum = 0
        let subjectCount = 0

        subjectsData.forEach((subject: any) => {
          const score = scoresData?.find((s: any) => s.student_id === student.id && s.subject_id === subject.id)
          if (score) {
            studentScores[subject.id] = {
              total: score.total
            }
            if (score.total !== null && !isNaN(score.total)) {
              totalScoreSum += score.total
              subjectCount++
            }
          } else {
            studentScores[subject.id] = { total: '-' }
          }
        })

        const average = subjectCount > 0 ? totalScoreSum / subjectCount : 0

        return {
          student,
          scores: studentScores,
          grandTotal: parseFloat(totalScoreSum.toFixed(1)),
          average: parseFloat(average.toFixed(2)),
          position: 0
        }
      })

      // 6. Calculate Positions
      processedStudents.sort((a, b) => b.average - a.average)
      processedStudents.forEach((student, index) => {
        student.position = index + 1
      })
      
      setSheetData({
        students: processedStudents,
        subjects: subjectsData,
        className,
        termName
      })

    } catch (error) {
      console.error('Error generating report:', error)
      alert('Failed to generate class report.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be a Class Teacher to access the Class Report.</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Go Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white">
      {/* No Print Section: Controls */}
      <div className="max-w-[1400px] mx-auto mb-8 print:hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-200 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Class Report Sheet</h1>
          </div>
          {sheetData && (
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-5 h-5" />
              Print Report
            </button>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Class</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 min-w-[200px]"
            >
              <option value="">-- Select Class --</option>
              {classes.map(c => (
                <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Term</label>
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 min-w-[200px]"
            >
              <option value="">-- Select Term --</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={generateReport}
            disabled={!selectedClass || !selectedTerm || generating}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {/* Print Section: The Sheet */}
      {sheetData && (
        <div className="bg-white shadow-lg print:shadow-none mx-auto overflow-x-auto print:overflow-visible">
          <div className="assessment-sheet p-4 w-full max-w-[210mm] mx-auto relative text-blue-900">
            
            {/* Watermark */}
            <div className="watermark fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.05]">
               <img src="/school_crest.png" alt="" className="w-[90%] h-[90%] object-contain" />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-4 border-b-2 border-blue-900 pb-2">
                <h1 className="text-xl font-bold uppercase font-serif mb-1">BIRIWA METHODIST 'C' BASIC SCHOOL</h1>
                <h2 className="text-lg font-bold uppercase mb-1">END OF {sheetData.termName} RESULTS</h2>
                <h3 className="text-base font-bold uppercase">{sheetData.className}</h3>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-blue-900 text-xs">
                <thead>
                  <tr className="bg-blue-50">
                    <th className="border border-blue-900 p-1 w-8 text-center">SN</th>
                    <th className="border border-blue-900 p-1 text-left w-auto whitespace-nowrap">STUDENT NAME</th>
                    {sheetData.subjects.map(subject => (
                      <th key={subject.id} className="border border-blue-900 p-1 text-center w-10">
                        {getShortSubjectName(subject.name)}
                      </th>
                    ))}
                    <th className="border border-blue-900 p-1 w-12 text-center bg-blue-100">TOT</th>
                    <th className="border border-blue-900 p-1 w-10 text-center">POS</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetData.students.map((student, index) => (
                    <tr key={student.student.id} className="hover:bg-blue-50">
                      <td className="border border-blue-900 p-1 text-center">{index + 1}</td>
                      <td className="border border-blue-900 p-1 font-medium whitespace-nowrap">
                        {student.student.last_name} {student.student.first_name}
                      </td>
                      {sheetData.subjects.map(subject => {
                        const score = student.scores[subject.id]
                        return (
                          <td key={`${student.student.id}-${subject.id}`} className="border border-blue-900 p-1 text-center">
                            {score.total}
                          </td>
                        )
                      })}
                      <td className="border border-blue-900 p-1 text-center font-bold bg-blue-50">{student.grandTotal}</td>
                      <td className="border border-blue-900 p-1 text-center font-bold">{student.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-4 flex justify-end">
                <div className="text-[10px] text-gray-500">
                  Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 5mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          .assessment-sheet {
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          table {
            font-size: 10px !important;
            width: 100%;
          }
          th, td {
            padding: 2px !important;
          }
          h1 { font-size: 16px !important; }
          h2 { font-size: 14px !important; }
          h3 { font-size: 12px !important; }
        }
      `}</style>
    </div>
  )
}
