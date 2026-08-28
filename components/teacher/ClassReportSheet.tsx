'use client'

import { useState, useEffect, Fragment } from 'react'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface SheetStudent {
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

interface SubjectScore {
  classScore: number | string
  examScore: number | string
  total: number | string
  position: number | string
}

interface ProcessedStudent {
  student: SheetStudent
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

interface ClassReportSheetProps {
  classId: string
  termId: string
  // When TRUE the sheet is built from the students who actually hold scores for the
  // class + term (so graduated / transferred students still appear), which is the
  // correct behaviour for past academic years.
  historical?: boolean
  className?: string
  termLabel?: string
}

/**
 * Renders the class report sheet (broadsheet) for a given class + term.
 * Reused across:
 *   - the live Class Report page (app/teacher/class-report)
 *   - the Historical Reports "Class Broadsheet" tab (app/teacher/reports/historical)
 */
export default function ClassReportSheet({
  classId,
  termId,
  historical = false,
  className: presetClassName = '',
  termLabel = 'REPORT',
}: ClassReportSheetProps) {
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sheetData, setSheetData] = useState<{
    students: ProcessedStudent[]
    subjects: Subject[]
    className: string
    termName: string
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    async function generateReport() {
      if (!classId || !termId) { setSheetData(null); return }

      setLoading(true)
      setError(null)
      try {
        // 1. Resolve the class + term display names.
        const [{ data: classData }, { data: termData }] = await Promise.all([
          supabase.from('classes').select('name').eq('id', classId).maybeSingle(),
          supabase.from('academic_terms').select('name, academic_year').eq('id', termId).maybeSingle(),
        ])
        const className = classData?.name || presetClassName
        const termName = termData ? `${termData.name} (${termData.academic_year})` : termLabel

        // 2. Load all scores recorded for this term, carrying each score's recorded
        //    class (classes joined via the student for the roster + a raw class_id so
        //    we can scope a promoted student's scores back to their correct class).
        //    CRITICAL: Supabase/PostgREST caps a single query at 1000 rows by default,
        //    but a whole term holds ~2900+ score rows across all classes. An unpaginated
        //    fetch would silently drop everything past row 1000 — most of the later
        //    classes/students — so the broadsheet would only show a fraction of a class
        //    (e.g. ~22 of 56 Basic 6 students) while the report cards (which query per
        //    class) still ranked the full cohort. We therefore page through ALL rows so
        //    the broadsheet roster exactly matches the report cards.
        const PAGE = 1000
        let scoresAll: any[] = []
        for (let from = 0; ; from += PAGE) {
          const { data: page } = await supabase
            .from('scores')
            .select('student_id, subject_id, class_score, exam_score, total, class_id, students(id, first_name, middle_name, last_name, gender)')
            .eq('term_id', termId)
            .range(from, from + PAGE - 1)
          const rows = page || []
          scoresAll = scoresAll.concat(rows)
          if (rows.length < PAGE) break
        }

        // Scope to the term's conducting class. Prefer the explicitly selected class;
        // otherwise fall back to the first recorded class_id.
        const hasSelectedClassScores = scoresAll?.some(
          (s: any) => s.class_id && s.class_id === classId
        )
        const conductingClassId = hasSelectedClassScores
          ? classId
          : scoresAll?.find((s: any) => s.class_id)?.class_id || classId

        // Keep only scores recorded for the term's conducting class.
        const scoresData = (scoresAll || []).filter(
          (s: any) => !s.class_id || s.class_id === conductingClassId
        )

        // 3. Determine the roster of students on the sheet.
        let studentsData: any[] = []
        if (historical) {
          // Historical: derive from students who actually have scores that term.
          const map = new Map<string, any>()
          ;(scoresData || []).forEach((s: any) => {
            const st = s.students
            if (!st) return
            if (!map.has(st.id)) {
              map.set(st.id, {
                id: st.id,
                first_name: st.first_name,
                last_name: st.last_name,
                middle_name: st.middle_name,
                gender: st.gender
              })
            }
          })
          studentsData = Array.from(map.values())
            .sort((a: any, b: any) =>
              (a.last_name || '').localeCompare(b.last_name || '') ||
              (a.first_name || '').localeCompare(b.first_name || '')
            )
        } else {
          // Live: only the class's current active roster.
          const { data: currentStudents } = await supabase
            .from('students')
            .select('id, first_name, last_name, middle_name, gender')
            .eq('class_id', classId)
            .eq('status', 'active')
            .order('first_name')
          studentsData = currentStudents || []
        }

        const rosterIds = new Set(studentsData.map((st: any) => st.id))
        const activeScores = scoresData.filter((s: any) => rosterIds.has(s.student_id))

        if (studentsData.length === 0) {
          setError('No students found for this class and term.')
          setSheetData(null)
          return
        }

        // 4. Assemble the subject set.
        //    IMPORTANT: To keep the broadsheet EXACTLY in line with the individual
        //    report cards (which are the source of truth), we build the subject
        //    columns exactly the way lib/reports/fetcher.ts does:
        //      - subjects of the class's level category (including subjects with no
        //        level set), PLUS
        //      - any subject that actually holds recorded scores for this class+term.
        //    We intentionally do NOT pull from class_subjects and do NOT de-duplicate
        //    by root name here, because the report card does neither. Adding extra
        //    class_subjects-only subjects or merging duplicate roots would change the
        //    column set / average divisor and make the broadsheet differ from the
        //    report cards.
        const subjectsMap = new Map<string, Subject>()
        const subjectsWithScores = new Set(activeScores?.map((s: any) => s.subject_id) || [])

        const classNameLower = className.toLowerCase()
        let category = ''
        if (classNameLower.includes('kg')) category = 'kindergarten'
        else if (/basic [1-3]|primary [1-3]/.test(classNameLower)) category = 'lower_primary'
        else if (/basic [4-6]|primary [4-6]/.test(classNameLower)) category = 'upper_primary'
        else if (/basic [7-9]|jhs [1-3]/.test(classNameLower)) category = 'jhs'

        const { data: allSubjectsData } = await supabase
          .from('subjects')
          .select('id, name, code, level')
        if (allSubjectsData) {
          allSubjectsData.forEach((s: any) => {
            const matchesCategory = !s.level || String(s.level).toLowerCase() === category
            if (matchesCategory || subjectsWithScores.has(s.id)) {
              if (!subjectsMap.has(s.id)) subjectsMap.set(s.id, { id: s.id, name: s.name, code: s.code })
            }
          })
        }

        // Sort by subject name — the same ordering the report card applies.
        const subjects = Array.from(subjectsMap.values()).sort((a, b) => a.name.localeCompare(b.name))

        if (subjects.length === 0) {
          setError('No subjects found for this class.')
          setSheetData(null)
          return
        }

        // 5. Build per-student scores.
        const processedStudents: ProcessedStudent[] = studentsData.map((student: any) => {
          const studentScores: Record<string, SubjectScore> = {}
          let totalScoreSum = 0
          subjects.forEach((subject: any) => {
            const score = activeScores?.find((s: any) => s.student_id === student.id && s.subject_id === subject.id)
            if (score && score.total !== null) {
              studentScores[subject.id] = {
                classScore: score.class_score || '-',
                examScore: score.exam_score || '-',
                total: score.total,
                position: 0
              }
              if (!isNaN(score.total)) totalScoreSum += score.total
            } else {
              studentScores[subject.id] = { classScore: '-', examScore: '-', total: '-', position: '-' }
            }
          })
          const average = subjects.length > 0 ? totalScoreSum / subjects.length : 0
          return {
            student,
            scores: studentScores,
            grandTotal: parseFloat(totalScoreSum.toFixed(1)),
            average: parseFloat(average.toFixed(2)),
            position: 0
          }
        })

        // 6. Positions per subject + overall.
        subjects.forEach((subject: any) => {
          const ranked = processedStudents
            .filter(s => typeof s.scores[subject.id].total === 'number')
            .sort((a, b) => (b.scores[subject.id].total as number) - (a.scores[subject.id].total as number))
          ranked.forEach((student, index) => { student.scores[subject.id].position = index + 1 })
        })
        processedStudents.sort((a, b) => b.average - a.average)
        processedStudents.forEach((student, index) => { student.position = index + 1 })

        if (cancelled) return
        setSheetData({ students: processedStudents, subjects, className, termName })
      } catch (e: any) {
        console.error('Error generating class report:', e)
        if (cancelled) return
        setError('Failed to generate class report: ' + (e.message || 'Unknown error'))
        setSheetData(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    generateReport()
    return () => { cancelled = true }
  }, [supabase, classId, termId, historical, presetClassName, termLabel])

  // Loading
  if (loading) {
    return (
      <div className="grid place-items-center py-16 text-gray-500 text-sm">
        Loading broadsheet…
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="py-12 text-center text-gray-600 text-sm">
        {error}
      </div>
    )
  }

  // No data yet
  if (!sheetData) {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        Select a class and term to generate the class report sheet.
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg print:shadow-none mx-auto overflow-x-auto print:overflow-visible transition-colors duration-200">
      <div className="assessment-sheet p-4 w-full print:max-w-none print:w-full mx-auto relative text-blue-900 dark:text-blue-100">
        {/* Watermark */}
        <div className="watermark fixed inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.05] dark:opacity-[0.1]">
          <Image src="/school_crest.png" alt="" width={500} height={500} className="w-[90%] h-[90%] object-contain" />
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-3 border-b-2 border-blue-900 dark:border-blue-400 pb-2">
            <h1 className="text-lg font-bold uppercase font-serif mb-1">BIRIWA METHODIST 'C' BASIC SCHOOL</h1>
            <h2 className="text-sm font-bold uppercase mb-1">END OF {sheetData.termName} CLASS REPORT SHEET</h2>
            <h3 className="text-xs font-bold uppercase">{sheetData.className}</h3>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-blue-900 dark:border-blue-400 text-[10px]">
              <thead>
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
                  <tr key={student.student.id} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors [content-visibility:auto] print:[content-visibility:visible] [contain-intrinsic-size:32px]">
                    <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center">{index + 1}</td>
                    <td className="border border-blue-900 dark:border-blue-400 p-0.5 font-medium text-left break-words w-24 max-w-[100px] leading-tight print:w-[80px]">
                      {student.student.last_name} {student.student.middle_name ? student.student.middle_name + ' ' : ''}{student.student.first_name}
                    </td>
                    {sheetData.subjects.map(subject => {
                      const score = student.scores[subject.id]
                      return (
                        <Fragment key={`${student.student.id}-${subject.id}`}>
                          <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center">{typeof score.classScore === 'number' ? Number(score.classScore).toFixed(1) : score.classScore}</td>
                          <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center">{typeof score.examScore === 'number' ? Number(score.examScore).toFixed(1) : score.examScore}</td>
                          <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-semibold">{typeof score.total === 'number' ? Number(score.total).toFixed(1) : score.total}</td>
                          <td className="subject-divider-right border border-blue-900 dark:border-blue-400 p-0.5 text-center">{score.position}</td>
                        </Fragment>
                      )
                    })}
                    <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-bold bg-green-50 dark:bg-green-900/20">{typeof student.grandTotal === 'number' ? Number(student.grandTotal).toFixed(1) : student.grandTotal}</td>
                    <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-bold bg-green-50 dark:bg-green-900/20">{typeof student.average === 'number' ? Number(student.average).toFixed(1) : student.average}</td>
                    <td className="border border-blue-900 dark:border-blue-400 p-0.5 text-center font-bold bg-green-50 dark:bg-green-900/20">{student.position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
  )
}

// Re-export the print styles so they apply whenever the sheet is rendered.
export function ClassReportPrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        @page {
          size: landscape;
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
          font-size: 9px !important;
          width: 100%;
        }
        th, td {
          padding: 2px !important;
        }
        h1 { font-size: 14px !important; }
        h2 { font-size: 12px !important; }
        h3 { font-size: 10px !important; }
      }
      .subject-divider-right {
        border-right-width: 2px !important;
      }
    `}</style>
  )
}
