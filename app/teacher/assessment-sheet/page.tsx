'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Printer, FileText, Filter } from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'

interface Student {
  id: string
  first_name: string
  last_name: string
  middle_name?: string
  gender: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface Score {
  student_id: string
  subject_id: string
  class_score: number
  exam_score: number
  total: number
}

interface ProcessedStudent {
  student: Student
  scores: Record<string, { class: number | string, exam: number | string, total: number | string }>
  totalScore: number
  average: number
  position: number
}

export default function AssessmentSheetPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [teacher, setTeacher] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  
  const [selectedClass, setSelectedClass] = useState('')
  const [selectedTerm, setSelectedTerm] = useState('')
  
  const [sheetData, setSheetData] = useState<{
    students: ProcessedStudent[]
    subjects: Subject[]
    className: string
    termName: string
    schoolInfo: any
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
        setTeacher(teacherData)

        // Get classes where the teacher is a CLASS TEACHER
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        // Filter for classes where is_class_teacher is true
        // Note: The RPC returns boolean true/false for is_class_teacher
        const classTeacherClasses = classAccess.filter(c => c.is_class_teacher === true)
        
        console.log('All Class Access:', classAccess)
        console.log('Filtered Class Teacher Classes:', classTeacherClasses)

        if (classTeacherClasses.length === 0) {
          // If not a class teacher, they can't access this page
          // But maybe we should just show empty or a message
        }
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

  async function generateSheet() {
    if (!selectedClass || !selectedTerm) return
    
    setGenerating(true)
    try {
      // 1. Get Class Details
      const selectedClassData = classes.find(c => c.class_id === selectedClass)
      const className = selectedClassData?.class_name || ''
      const termName = terms.find(t => t.id === selectedTerm)?.name || ''

      // 2. Get Students
      // Note: We need to be careful with the query. The error 400 suggests a bad request.
      // Let's try a simpler query first to debug.
      console.log('Fetching students for class:', selectedClass)
      
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, gender')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name')

      if (studentsError) {
        console.error('Error fetching students:', studentsError)
        alert('Error fetching students: ' + studentsError.message)
        setGenerating(false)
        return
      }

      console.log('Students found:', studentsData?.length)

      if (!studentsData || studentsData.length === 0) {
        alert('No students found in this class.')
        setGenerating(false)
        return
      }

      // 3. Get Subjects for this class level
      // Determine level from class name (simple logic for now, can be improved)
      let levelCategory = ''
      const lowerName = className.toLowerCase()
      
      if (lowerName.includes('kg')) {
        levelCategory = 'kindergarten'
      } else if (lowerName.includes('basic 1') || lowerName.includes('basic 2') || lowerName.includes('basic 3') || 
                 lowerName.includes('primary 1') || lowerName.includes('primary 2') || lowerName.includes('primary 3')) {
        levelCategory = 'lower_primary'
      } else if (lowerName.includes('basic 4') || lowerName.includes('basic 5') || lowerName.includes('basic 6') ||
                 lowerName.includes('primary 4') || lowerName.includes('primary 5') || lowerName.includes('primary 6')) {
        levelCategory = 'upper_primary'
      } else if (lowerName.includes('jhs') || lowerName.includes('basic 7') || lowerName.includes('basic 8') || lowerName.includes('basic 9')) {
        levelCategory = 'jhs'
      }

      console.log('Class Level Category:', levelCategory)

      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .eq('level', levelCategory)
        .order('name')

      if (!subjectsData) {
        alert('No subjects found for this class level.')
        setGenerating(false)
        return
      }

      // 4. Get Scores
      const { data: scoresData } = await supabase
        .from('scores')
        .select('student_id, subject_id, class_score, exam_score, total')
        .in('student_id', studentsData.map((s: any) => s.id))
        .eq('term_id', selectedTerm)

      // 5. Process Data
      const processedStudents: ProcessedStudent[] = studentsData.map((student: any) => {
        const studentScores: Record<string, any> = {}
        let totalScoreSum = 0
        let subjectCount = 0

        subjectsData.forEach((subject: any) => {
          const score = scoresData?.find((s: any) => s.student_id === student.id && s.subject_id === subject.id)
          if (score) {
            studentScores[subject.id] = {
              class: score.class_score,
              exam: score.exam_score,
              total: score.total
            }
            if (score.total !== null && !isNaN(score.total)) {
              totalScoreSum += score.total
              subjectCount++
            }
          } else {
            studentScores[subject.id] = { class: '-', exam: '-', total: '-' }
          }
        })

        const average = subjectCount > 0 ? totalScoreSum / subjectCount : 0

        return {
          student,
          scores: studentScores,
          totalScore: totalScoreSum,
          average: parseFloat(average.toFixed(2)),
          position: 0 // To be calculated
        }
      })

      // 6. Calculate Positions
      processedStudents.sort((a, b) => b.average - a.average)
      processedStudents.forEach((student, index) => {
        student.position = index + 1
      })
      
      // Keep sorted by position (average) as requested
      // processedStudents.sort((a, b) => a.student.first_name.localeCompare(b.student.first_name))

      // 7. Get School Info (Logo etc) - Mocking or fetching from settings
      // For now we'll use a placeholder or fetch if available
      
      setSheetData({
        students: processedStudents,
        subjects: subjectsData,
        className,
        termName,
        schoolInfo: {} 
      })

    } catch (error) {
      console.error('Error generating sheet:', error)
      alert('Failed to generate assessment sheet.')
    } finally {
      setGenerating(false)
    }
  }

  const getShortSubjectName = (name: string) => {
    const map: { [key: string]: string } = {
      'MATHEMATICS': 'MATHS',
      'ENGLISH LANGUAGE': 'ENGLISH',
      'INTEGRATED SCIENCE': 'SCIENCE',
      'SOCIAL STUDIES': 'SOCIAL',
      'RELIGIOUS & MORAL EDUCATION': 'R.M.E',
      'RELIGIOUS AND MORAL EDUCATION': 'R.M.E',
      'INFORMATION & COMMUNICATION TECHNOLOGY': 'I.C.T',
      'INFORMATION AND COMMUNICATION TECHNOLOGY': 'I.C.T',
      'BASIC DESIGN AND TECHNOLOGY': 'B.D.T',
      'GHANAIAN LANGUAGE': 'GH. LANG',
      'CAREER TECHNOLOGY': 'C. TECH',
      'CREATIVE ARTS': 'C.A.D',
      'OUR WORLD OUR PEOPLE': 'O.W.O.P',
      'PHYSICAL EDUCATION': 'P.E',
      'COMPUTING': 'COMPUTING',
      'HISTORY': 'HISTORY',
      'FRENCH': 'FRENCH'
    }
    
    const upperName = name.toUpperCase()
    // Check exact match first
    if (map[upperName]) return map[upperName]
    
    // Check partial matches
    if (upperName.includes('MATHEMATICS')) return 'MATHS'
    if (upperName.includes('ENGLISH')) return 'ENGLISH'
    if (upperName.includes('SCIENCE')) return 'SCIENCE'
    if (upperName.includes('SOCIAL')) return 'SOCIAL'
    if (upperName.includes('RELIGIOUS')) return 'R.M.E'
    if (upperName.includes('INFORMATION')) return 'I.C.T'
    if (upperName.includes('DESIGN')) return 'B.D.T'
    if (upperName.includes('GHANAIAN')) return 'GH. LANG'
    if (upperName.includes('CAREER')) return 'C. TECH'
    if (upperName.includes('CREATIVE')) return 'C.A.D'
    if (upperName.includes('WORLD')) return 'O.W.O.P'
    if (upperName.includes('PHYSICAL')) return 'P.E'
    
    // Default: return first word or abbreviation
    return name.split(' ')[0].substring(0, 8).toUpperCase()
  }

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You must be a Class Teacher to access the Assessment Sheet.</p>
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
            <h1 className="text-2xl font-bold text-gray-800">Class Assessment Sheet</h1>
          </div>
          {sheetData && (
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Printer className="w-5 h-5" />
              Print Sheet
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
            onClick={generateSheet}
            disabled={!selectedClass || !selectedTerm || generating}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? 'Generating...' : 'Generate Sheet'}
          </button>
        </div>
      </div>

      {/* Print Section: The Sheet */}
      {sheetData && (
        <div className="bg-white shadow-lg print:shadow-none mx-auto overflow-x-auto print:overflow-visible">
          <div className="assessment-sheet p-4 min-w-[1000px] relative">
            
            {/* Watermark */}
            <div className="watermark fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.03]">
               <img src="/school_crest.png" alt="" className="w-[500px] h-[500px] object-contain" />
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-4 border-b-2 border-black pb-2">
                <h1 className="text-xl font-bold uppercase font-serif mb-1">BIRIWA METHODIST SCHOOL</h1>
                <h2 className="text-lg font-bold uppercase mb-1">ASSESSMENT SHEET</h2>
                <div className="flex justify-center gap-8 text-sm font-semibold">
                  <span>CLASS: {sheetData.className}</span>
                  <span>TERM: {sheetData.termName}</span>
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-1 w-8 text-center" rowSpan={2}>SN</th>
                    <th className="border border-black p-1 text-left min-w-[150px]" rowSpan={2}>STUDENT NAME</th>
                    {sheetData.subjects.map(subject => (
                      <th key={subject.id} className="border border-black p-1 text-center" colSpan={3}>
                        {getShortSubjectName(subject.name)}
                      </th>
                    ))}
                    <th className="border border-black p-1 w-12 text-center" rowSpan={2}>AVG</th>
                    <th className="border border-black p-1 w-10 text-center" rowSpan={2}>POS</th>
                  </tr>
                  <tr className="bg-gray-50">
                    {sheetData.subjects.map(subject => (
                      <Fragment key={`sub-header-${subject.id}`}>
                        <th className="border border-black p-0.5 text-center w-8 text-[10px]">CLS</th>
                        <th className="border border-black p-0.5 text-center w-8 text-[10px]">EXM</th>
                        <th className="border border-black p-0.5 text-center w-8 text-[10px] bg-gray-100">TOT</th>
                      </Fragment>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetData.students.map((student, index) => (
                    <tr key={student.student.id} className="hover:bg-gray-50">
                      <td className="border border-black p-1 text-center">{index + 1}</td>
                      <td className="border border-black p-1 font-medium">
                        {student.student.last_name} {student.student.middle_name ? student.student.middle_name + ' ' : ''}{student.student.first_name}
                      </td>
                      {sheetData.subjects.map(subject => {
                        const score = student.scores[subject.id]
                        return (
                          <Fragment key={`${student.student.id}-${subject.id}`}>
                            <td className="border border-black p-1 text-center text-gray-600">{score.class}</td>
                            <td className="border border-black p-1 text-center font-medium">{score.exam}</td>
                            <td className="border border-black p-1 text-center font-bold bg-gray-50">{score.total}</td>
                          </Fragment>
                        )
                      })}
                      <td className="border border-black p-1 text-center font-bold bg-gray-50">{student.average}</td>
                      <td className="border border-black p-1 text-center font-bold">{student.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="mt-8 flex justify-between text-sm font-bold">
                <div>Class Teacher's Signature: _______________________</div>
                <div>Head Teacher's Signature: _______________________</div>
                <div>Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase()}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
