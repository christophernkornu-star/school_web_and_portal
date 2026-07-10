'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Printer, Filter } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'

interface Subject {
  id: string
  name: string
  code: string
}

interface SubjectScore {
  classScore: number | string
  examScore: number | string
  total: number | string
  position: number | string
}

interface ProcessedStudent {
  id: string
  first_name: string
  last_name: string
  middle_name?: string
  gender: string
  student_id: string
  scores: Record<string, SubjectScore>
  grandTotal: number
  average: number
  position: number
}

const scoreSubHeaders = ['CS', 'ES', 'TOT', 'POS']

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

export default function BroadsheetsPage() {
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
    async function loadOptions() {
      try {
        const [classesRes, termsRes] = await Promise.all([
          supabase.from('classes').select('id, name').order('name'),
          supabase.from('academic_terms').select('id, name, academic_year, is_current').order('start_date', { ascending: false })
        ])
        
        if (classesRes.data) setClasses(classesRes.data)
        if (termsRes.data) {
          setTerms(termsRes.data)
          const active = termsRes.data.find((t: any) => t.is_current)
          if (active) setSelectedTerm(active.id)
        }
        setLoading(false)
      } catch (error) {
        console.error('Error loading options:', error)
        setLoading(false)
      }
    }
    loadOptions()
  }, [supabase])

  async function generateReport() {
    if (!selectedClass || !selectedTerm) {
      toast.error('Please select both a class and a term.')
      return
    }
    
    setGenerating(true)
    try {
      // 1. Get Class Details
      const selectedClassData = classes.find((c: any) => c.id === selectedClass)
      const className = selectedClassData?.name || ''
      const selectedTermData = terms.find((t: any) => t.id === selectedTerm)
      const termName = selectedTermData ? `${selectedTermData.name} (${selectedTermData.academic_year})` : ''

      // 2. Get Students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, first_name, last_name, middle_name, gender, student_id')
        .eq('class_id', selectedClass)
        .eq('status', 'active')
        .order('first_name')

      if (studentsError || !studentsData || studentsData.length === 0) {
        toast.error('No students found in this class.')
        setGenerating(false)
        return
      }

      // 3. Get All Scores for this class and term
      const { data: scoresData } = await supabase
        .from('scores')
        .select('student_id, subject_id, class_score, exam_score, total')
        .in('student_id', studentsData.map((s: any) => s.id))
        .eq('term_id', selectedTerm)

      // 4. Assemble ALL Subjects assigned to this class
      const subjectsMap = new Map<string, Subject>()
      
      // 4a. Get explicitly assigned subjects from class_subjects
      const { data: classSubjectsData } = await supabase
        .from('class_subjects')
        .select('subject_id, subjects(id, name, code)')
        .eq('class_id', selectedClass)

      if (classSubjectsData) {
        classSubjectsData.forEach((cs: any) => {
          const subject = cs.subjects as Subject | null
          if (subject?.id) subjectsMap.set(subject.id, subject)
        })
      }

      // 4b. Get subjects matching the class level (as fallback)
      const classNameLower = className.toLowerCase()
      let category = ''

      if (classNameLower.includes('kg')) {
        category = 'kindergarten'
      } else if (classNameLower.includes('basic 1') || classNameLower.includes('basic 2') || classNameLower.includes('basic 3') ||
                 classNameLower.includes('primary 1') || classNameLower.includes('primary 2') || classNameLower.includes('primary 3')) {
        category = 'lower_primary'
      } else if (classNameLower.includes('basic 4') || classNameLower.includes('basic 5') || classNameLower.includes('basic 6') ||
                 classNameLower.includes('primary 4') || classNameLower.includes('primary 5') || classNameLower.includes('primary 6')) {
        category = 'upper_primary'
      } else if (classNameLower.includes('basic 7') || classNameLower.includes('basic 8') || classNameLower.includes('basic 9') ||
                 classNameLower.includes('jhs 1') || classNameLower.includes('jhs 2') || classNameLower.includes('jhs 3')) {
        category = 'jhs'
      }

      const { data: allSubjectsData } = await supabase
        .from('subjects')
        .select('id, name, code, level')
        
      // Find existing score subject IDs to always include them
      const subjectsWithScores = new Set(scoresData?.map((s: any) => s.subject_id) || [])

      if (allSubjectsData) {
        allSubjectsData.forEach((s: any) => {
          if (s.level === category || subjectsWithScores.has(s.id)) {
            if (!subjectsMap.has(s.id)) {
              subjectsMap.set(s.id, { id: s.id, name: s.name, code: s.code })   
            }
          }
        })
      }

      // Deduplicate subjects sharing the same base name
      const cleanNameMap = new Map<string, any>()
      Array.from(subjectsMap.values()).forEach((subject: any) => {
        const cleanName = subject.name.replace(/\s*\(\s*(LP|UP|JHS|KG|Nursery|Creche)\s*\)\s*$/i, '').trim().toUpperCase()
        
        if (cleanNameMap.has(cleanName)) {
          const existing = cleanNameMap.get(cleanName)
          const newHasScores = subjectsWithScores.has(subject.id)
          const existingHasScores = subjectsWithScores.has(existing.id)

          if (newHasScores && !existingHasScores) {
            cleanNameMap.set(cleanName, subject)
          } else if (newHasScores && existingHasScores) {
            cleanNameMap.set(`${cleanName}_${subject.id}`, subject)
          }
        } else {
          cleanNameMap.set(cleanName, subject)
        }
      })

      const subjects = Array.from(cleanNameMap.values()).sort((a, b) => a.name.localeCompare(b.name))

      if (subjects.length === 0) {
        toast.error('No subjects found for this class.')
        setGenerating(false)
        return
      }

      // 5. Process Data with subject-specific scores and positions
      const processedStudents: ProcessedStudent[] = studentsData.map((student: any) => {
        const studentScores: Record<string, SubjectScore> = {}
        let totalScoreSum = 0

        subjects.forEach((subject: any) => {
          const score = scoresData?.find((s: any) => s.student_id === student.id && s.subject_id === subject.id)
          if (score && score.total !== null) {
            studentScores[subject.id] = {
              classScore: score.class_score || '-',
              examScore: score.exam_score || '-',
              total: score.total,
              position: 0
            }
            if (!isNaN(score.total)) {
              totalScoreSum += score.total
            }
          } else {
            studentScores[subject.id] = {
              classScore: '-',
              examScore: '-',
              total: '-',
              position: '-'
            }
          }
        })

        const average = subjects.length > 0 ? totalScoreSum / subjects.length : 0

        return {
          id: student.id,
          first_name: student.first_name,
          last_name: student.last_name,
          middle_name: student.middle_name,
          gender: student.gender,
          student_id: student.student_id,
          scores: studentScores,
          grandTotal: parseFloat(totalScoreSum.toFixed(1)),
          average: parseFloat(average.toFixed(2)),
          position: 0
        }
      })

      // 6. Calculate subject-specific positions
      subjects.forEach((subject: any) => {
        const studentsWithGrades = processedStudents
          .filter(s => typeof s.scores[subject.id].total === 'number')
          .sort((a, b) => (b.scores[subject.id].total as number) - (a.scores[subject.id].total as number))

        studentsWithGrades.forEach((student, index) => {
          student.scores[subject.id].position = index + 1
        })
      })

      // 7. Calculate Overall Positions
      processedStudents.sort((a, b) => b.average - a.average)
      processedStudents.forEach((student, index) => {
        student.position = index + 1
      })
      
      setSheetData({
        students: processedStudents,
        subjects,
        className,
        termName
      })

    } catch (error: any) {
      console.error('Error generating report:', error)
      toast.error('Failed to generate broadsheet: ' + error.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white shadow">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-40" />
                </div>
                <Skeleton className="h-10 w-32 rounded" />
            </div>
        </header>
        <main className="flex-1 container mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                 <div className="grid grid-cols-2 gap-4">
                     <Skeleton className="h-10 w-full rounded" />
                     <Skeleton className="h-10 w-full rounded" />
                 </div>
            </div>
        </main>
      </div>
    )
  }

  return (
    <div id="broadsheet-print-root" className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 print:p-0 print:bg-white transition-colors duration-200">
      {/* No Print Section: Controls */}
      <div className="max-w-[1400px] mx-auto mb-6 md:mb-8 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <BackButton href="/admin/results" />
            <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Results Broadsheet</h1>
          </div>
          {sheetData && (
            <button 
              onClick={() => {
                // Set print-wrapper to overflow visible for full print capture
                const wrapper = document.querySelector('.print-wrapper') as HTMLElement
                const mainContainer = document.querySelector('.min-h-screen') as HTMLElement
                
                if (wrapper) wrapper.style.overflow = 'visible'
                if (mainContainer) mainContainer.style.minHeight = 'auto'
                
                setTimeout(() => {
                  window.print()
                  setTimeout(() => {
                    if (wrapper) wrapper.style.overflow = ''
                    if (mainContainer) mainContainer.style.minHeight = ''
                  }, 1000)
                }, 300)
              }}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
            >
              <Printer className="w-5 h-5" />
              Download / Print
            </button>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-end transition-colors">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Term</label>
            <select 
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 min-w-[200px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors"
            >
              <option value="">Select Term</option>
              {terms.map((t: any) => (
                <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Class</label>
            <select 
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 min-w-[200px] bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none transition-colors"
            >
              <option value="">Select Class</option>
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={generateReport}
            disabled={!selectedClass || !selectedTerm || generating}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Generating...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Generate Broadsheet
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Print Section: The Sheet */}
      {sheetData && (
        <div className="print-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div className="bg-white dark:bg-gray-800 shadow-lg print:shadow-none mx-auto transition-colors duration-200" id="broadsheet-print-area">
            <div className="assessment-sheet p-4 w-full print:max-w-none print:w-full mx-auto relative text-blue-900 dark:text-blue-100">
              
              {/* Watermark */}
              <div className="watermark fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.05] dark:opacity-[0.1]">
                 <Image 
                   src="/school_crest.png" 
                   alt="" 
                   width={500}
                   height={500}
                   className="w-[90%] h-[90%] object-contain" 
                 />
              </div>

              <div className="relative z-10">
                {/* Header */}
                <div className="text-center mb-3 border-b-2 border-blue-900 dark:border-blue-400 pb-2">
                  <h1 className="text-lg font-bold uppercase font-serif mb-1">BIRIWA METHODIST &apos;C&apos; BASIC SCHOOL</h1>
                  <h2 className="text-sm font-bold uppercase mb-1">END OF {sheetData.termName} CLASS REPORT SHEET</h2>
                  <h3 className="text-xs font-bold uppercase">{sheetData.className}</h3>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-blue-900 dark:border-blue-400 text-[10px]">
                  <thead>
                    {/* Subject Names Header */}
                    <tr className="bg-blue-50 dark:bg-blue-900/30">
                      <th rowSpan={2} className="border border-blue-900 dark:border-blue-400 p-0.5 w-6 text-center align-middle">SN</th>
                      <th rowSpan={2} className="border border-blue-900 dark:border-blue-400 p-0.5 text-left align-middle max-w-[100px] break-words w-24 print:w-[80px]">STUDENT NAME</th>
                      {sheetData.subjects.map(subject => (
                        <th key={subject.id} colSpan={4} className="border border-blue-900 dark:border-blue-400 p-0.5 text-center align-middle bg-blue-100 dark:bg-blue-800">
                          {getShortSubjectName(subject.name)}
                        </th>
                      ))}
                      <th rowSpan={2} className="border border-blue-900 dark:border-blue-400 p-0.5 align-middle bg-green-100 dark:bg-green-900/30 font-bold">
                         <div className="[writing-mode:vertical-rl] [transform:rotate(180deg)] mx-auto h-12 flex items-center justify-center">G.TOT</div>
                      </th>
                      <th rowSpan={2} className="border border-blue-900 dark:border-blue-400 p-0.5 align-middle bg-green-100 dark:bg-green-900/30 font-bold">
                         <div className="[writing-mode:vertical-rl] [transform:rotate(180deg)] mx-auto h-12 flex items-center justify-center">AVG</div>
                      </th>
                      <th rowSpan={2} className="border border-blue-900 dark:border-blue-400 p-0.5 align-middle bg-green-100 dark:bg-green-900/30 font-bold">
                         <div className="[writing-mode:vertical-rl] [transform:rotate(180deg)] mx-auto h-12 flex items-center justify-center">RANK</div>
                      </th>
                    </tr>
                    {/* Sub-headers: CS, ES, TOT, POS */}
                    <tr className="bg-blue-100 dark:bg-blue-900/50">
                      {sheetData.subjects.map(subject => (
                        <Fragment key={subject.id}>
                          {scoreSubHeaders.map((header, headerIndex) => {
                            const isSubjectBoundary = headerIndex === scoreSubHeaders.length - 1
                            return (
                              <th
                                key={`${subject.id}-${header}`}
                                className={`border border-blue-900 dark:border-blue-400 p-0 text-center align-middle ${
                                  isSubjectBoundary ? 'subject-divider-right' : ''
                                }`}
                              >
                                <div className="[writing-mode:vertical-rl] [transform:rotate(180deg)] mx-auto h-8 lg:h-10 flex items-center justify-center text-[min(9px,0.75vw)] print:text-[8px] font-semibold py-1">
                                  {header}
                                </div>
                              </th>
                            )
                          })}
                        </Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sheetData.students.map((student, index) => (
                        <tr key={student.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors [content-visibility:auto] print:[content-visibility:visible] [contain-intrinsic-size:32px]">
                        <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center">{index + 1}</td>
                        <td className="border border-blue-900 dark:border-blue-400 p-0.5 font-medium text-left break-words w-24 max-w-[100px] leading-tight print:w-[80px]">
                          {student.last_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.first_name}
                        </td>
                        {sheetData.subjects.map(subject => {
                          const score = student.scores[subject.id]
                          return (
                            <Fragment key={`${student.id}-${subject.id}`}>
                                <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center">{typeof score.classScore === 'number' ? Math.round(score.classScore) : score.classScore}</td>
                                <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center">{typeof score.examScore === 'number' ? Math.round(score.examScore) : score.examScore}</td>
                                <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-semibold">{typeof score.total === 'number' ? Math.round(score.total) : score.total}</td>
                                <td className="subject-divider-right border border-blue-900 dark:border-blue-400 p-0.5 text-center">{score.position}</td>
                              </Fragment>
                            )
                          })}
                          <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-bold bg-green-50 dark:bg-green-900/20">{typeof student.grandTotal === 'number' ? Math.round(student.grandTotal) : student.grandTotal}</td>
                        <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-bold bg-green-50 dark:bg-green-900/20">{Math.round(student.average)}</td>
                        <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-bold bg-green-50 dark:bg-green-900/20">{student.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Footer */}
                <div className="mt-3 flex justify-end">
                  <div className="text-[8px] text-gray-500 dark:text-gray-400">
                    Generated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, '-').toUpperCase()}
                  </div>
                </div>

                <div className="mt-2 border-t border-blue-900 dark:border-blue-400 pt-1 text-[8px] text-blue-900 dark:text-blue-200">
                  <span className="font-semibold">KEY:</span>{' '}
                  CS = Class Score, ES = Exam Score, TOT = Total, POS = Subject Position, G.TOT = Grand Total, AVG = Average, RANK = Overall Position
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
            margin: 0;
            padding: 0;
          }
          /* Hide admin header, sidebar, and footer during print */
          header, footer, aside, nav {
            display: none !important;
          }
          /* Make the main area flow naturally for print */
          main {
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          /* The layout container should not constrain height during print */
          [class*="fixed"][class*="inset-0"] {
            position: absolute !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Make the broadsheet root fill the page */
          #broadsheet-print-root {
            display: block !important;
            width: 100% !important;
            min-height: auto !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-wrapper {
            overflow: visible !important;
            width: 100% !important;
          }
          .assessment-sheet {
            padding: 0 !important;
            max-width: none !important;
            width: 100% !important;
          }
          #broadsheet-print-area {
            max-width: 100% !important;
            width: 100% !important;
            box-shadow: none !important;
          }
          table {
            font-size: 9px !important;
            width: 100% !important;
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tbody {
            display: table-row-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th, td {
            padding: 2px !important;
          }
          h1 { font-size: 14px !important; }
          h2 { font-size: 12px !important; }
          h3 { font-size: 10px !important; }
          .min-h-screen {
            min-height: auto !important;
            padding: 0 !important;
          }
          .watermark {
            display: block !important;
            opacity: 0.05 !important;
          }
          /* Remove any scrollbars during print */
          ::-webkit-scrollbar {
            display: none !important;
          }
        }
        .subject-divider-right {
          border-right-width: 2px !important;
        }
      `}</style>
    </div>
  )
}
