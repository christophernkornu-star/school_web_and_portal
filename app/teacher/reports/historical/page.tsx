'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, FileText, Loader2, Archive, Users, Printer } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { resolveActiveAcademicYear, isPastYear } from '@/lib/academic-year'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import ClassReportSheet, { ClassReportPrintStyles } from '@/components/teacher/ClassReportSheet'

interface TeacherClass { class_id: string; class_name: string }
interface TermItem { id: string; name: string; academic_year: string }

export default function TeacherHistoricalReportsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  // Class ids where this teacher is the CLASS TEACHER (only those can generate
  // a class broadsheet).
  const [classTeacherClasses, setClassTeacherClasses] = useState<string[]>([])

  // Active tab: 'reportcards' lists per-student report cards; 'broadsheet'
  // shows the whole-class class report sheet for the selected past class + term.
  const [activeTab, setActiveTab] = useState<'reportcards' | 'broadsheet'>('reportcards')

  // Grouped terms by academic year for a clean "Year > Term" drill-down
  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [terms, setTerms] = useState<TermItem[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')

  const [roster, setRoster] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  // Ref to the class broadsheet so we can print ONLY the sheet in a dedicated
  // window (the portal's sidebar/header/filters should not appear in print).
  const broadsheetRef = useRef<HTMLDivElement>(null)

  // Load the teacher's assigned classes + academic years
  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser()
        if (!user) { router.push('/login?portal=teacher'); return }

        const { data: teacherData } = await getTeacherData(user.id)
        if (!teacherData) { router.push('/login?portal=teacher'); return }

        // Only the classes this teacher has been assigned to
        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        const assignedClasses: TeacherClass[] = classAccess.map(c => ({
          class_id: c.class_id,
          class_name: c.class_name
        }))
        setClasses(assignedClasses)
        setClassTeacherClasses(
          classAccess.filter(c => c.is_class_teacher === true).map(c => c.class_id)
        )

        // Load all academic years (for the drill-down) — PAST years only.
        // The current/active academic year is intentionally excluded because this
        // page is for browsing historical data, not the live session.
        const activeYear = await resolveActiveAcademicYear(supabase)

        const { data: termRes } = await supabase
          .from('academic_terms')
          .select('academic_year')
          .order('academic_year', { ascending: false })

        const yearSet: string[] = Array.from(
          new Set<string>((termRes || []).map((t: any) => String(t.academic_year)))
        ).filter((y) => isPastYear(y, activeYear))

        setYears(yearSet)

        if (assignedClasses.length) setSelectedClass(assignedClasses[0].class_id)
        if (yearSet.length) setSelectedYear(yearSet[0])
      } catch (err) {
        console.error('Error initializing historical reports:', err)
        toast.error('Failed to load historical reports')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [supabase, router])

  // Load terms for the selected year
  useEffect(() => {
    async function loadTermsForYear() {
      if (!selectedYear) { setTerms([]); setSelectedTerm(''); return }
      const { data } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year')
        .eq('academic_year', selectedYear)
        .order('name')
      setTerms(data || [])
      const current = data?.find((t: any) => t.is_current)
      setSelectedTerm(current?.id || data?.[0]?.id || '')
    }
    loadTermsForYear()
  }, [supabase, selectedYear])

  // Load the roster based on class + term. We find students who actually have
  // scores for this class + term (via scored class_id) so we capture everyone who
  // was in that class that term — including graduated & transferred students.
  useEffect(() => {
    async function loadRoster() {
      if (!selectedClass || !selectedTerm) { setRoster([]); return }
      setLoadingRoster(true)
      try {
        const { data, error } = await supabase
          .from('scores')
          .select('student_id, students(first_name, middle_name, last_name, student_id, gender, status, graduated_at)')
          .eq('class_id', selectedClass)
          .eq('term_id', selectedTerm)

        if (error) throw error

        // De-duplicate by student_id
        const map = new Map()
        ;(data || []).forEach((row: any) => {
          const s = row.students
          if (!s) return
          if (!map.has(row.student_id)) {
            map.set(row.student_id, {
              id: row.student_id,
              first_name: s.first_name,
              middle_name: s.middle_name,
              last_name: s.last_name,
              student_id: s.student_id,
              gender: s.gender,
              status: s.status,
              graduated_at: s.graduated_at,
            })
          }
        })

        const list = Array.from(map.values())
          .sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || ''))

        setRoster(list)
      } catch (e: any) {
        console.error('Error loading historical roster:', e)
        toast.error('Failed to load roster')
        setRoster([])
      } finally {
        setLoadingRoster(false)
      }
    }
    loadRoster()
  }, [supabase, selectedClass, selectedTerm])

  const selectedTermInfo = terms.find(t => t.id === selectedTerm)
  const selectedClassName = classes.find(c => c.class_id === selectedClass)?.class_name || 'class'

  const filteredRoster = roster.filter((st: any) => {
    const q = searchTerm.toLowerCase()
    return (st.last_name || '').toLowerCase().includes(q) ||
           (st.first_name || '').toLowerCase().includes(q) ||
           (st.student_id || '').toLowerCase().includes(q)
  })

  // Print ONLY the class broadsheet in a fresh window, carrying over the current
  // document's styles (Tailwind + print rules) so the sheet renders exactly as on
  // screen while the portal's sidebar/header/filters are excluded.
  function handlePrintBroadsheet() {
    const el = broadsheetRef.current
    if (!el) return

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      toast.error('Popup blocked — please allow popups to print.')
      return
    }

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    ).map(node => node.outerHTML).join('\n')

    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Class Broadsheet</title>
${styles}
<style>
  body { margin: 0; }
</style>
</head>
<body>${el.outerHTML}
<script>
  window.onload = function() { setTimeout(function(){ window.print(); }, 300); };
</` + `script>
</body></html>`)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-10 w-48 rounded-lg" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-2xl mx-auto text-center">
          <BackButton href="/teacher/reports" />
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-methodist-blue/10 flex items-center justify-center">
              <Archive className="w-7 h-7 text-methodist-blue" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">No Assigned Classes</h2>
            <p className="text-gray-500 text-sm">
              You have not been assigned to any classes yet, so there are no historical reports to browse.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start sm:items-center mb-6">
          <BackButton href="/teacher/reports" className="mt-1 sm:mt-0" />
          <div className="ml-3 sm:ml-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-methodist-blue" />
              Historical Reports
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">Browse past term reports for your assigned class(es)</p>
          </div>
        </div>

        {/* Filters: Class + Academic Year + Term */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}

                  className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-methodist-blue outline-none"
                >
                  <option value="">Select class</option>
                  {classes.map(cls => (
                    <option key={cls.class_id} value={cls.class_id}>{cls.class_name}</option>
                  ))}
                </select>
                <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Academic Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}

                className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-methodist-blue outline-none"
              >
                <option value="">Select year</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}

                className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-methodist-blue outline-none"
              >
                <option value="">Select term</option>
                {terms.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.academic_year})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search student name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}

                className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-methodist-blue outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs: Report Cards | Class Broadsheet */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('reportcards')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reportcards'
                ? 'bg-methodist-blue text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Report Cards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('broadsheet')}
            disabled={!classTeacherClasses.includes(selectedClass)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'broadsheet'
                ? 'bg-methodist-blue text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            } ${!classTeacherClasses.includes(selectedClass) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Users className="w-4 h-4" />
            Class Broadsheet
          </button>
        </div>
        {activeTab === 'broadsheet' && !classTeacherClasses.includes(selectedClass) && (
          <p className="text-xs text-gray-500 -mt-3 mb-4">
            You must be the class teacher of the selected class to view its broadsheet.
          </p>
        )}

        {/* Roster */}
        {activeTab === 'reportcards' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800 text-sm sm:text-base">
              Students in {selectedClassName}
              {selectedTermInfo ? ` — ${selectedTermInfo.name} ${selectedYear}` : ''}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{roster.length} student{roster.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          {loadingRoster ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="px-6 py-12 text-center">
              {selectedClass && selectedTerm
                ? <p className="text-gray-500">No students have scores recorded for this class &amp; term yet.</p>
                : <p className="text-gray-500">Select a class, year, and term to view the historical roster.</p>}
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredRoster.map((st: any) => (
                  <div key={st.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 text-sm break-words">
                          {[st.last_name, st.middle_name, st.first_name].filter(Boolean).join(', ')}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{st.student_id} · {st.gender || '—'}</div>
                      </div>
                      <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${
                        st.status === 'graduated' ? 'bg-purple-100 text-purple-800'
                        : st.status === 'transferred' ? 'bg-yellow-100 text-yellow-800'
                        : st.status === 'inactive' ? 'bg-gray-100 text-gray-700'
                        : 'bg-green-100 text-green-800'
                      }`}>
                        {st.status === 'graduated' ? 'Graduated' : st.status}
                      </span>
                    </div>
                    <Link
                      href={`/teacher/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                      className="inline-flex items-center w-full justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-methodist-blue bg-methodist-blue/10 hover:bg-methodist-blue/20"
                    >
                      <FileText className="w-3.5 h-3.5 mr-1.5" />
                      View Report
                    </Link>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredRoster.map((st: any) => (
                      <tr key={st.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {[st.last_name, st.middle_name, st.first_name].filter(Boolean).join(', ')}
                          </div>
                          <div className="text-sm text-gray-500">{st.student_id}</div>
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-500">{st.gender}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            st.status === 'graduated' ? 'bg-purple-100 text-purple-800'
                            : st.status === 'transferred' ? 'bg-yellow-100 text-yellow-800'
                            : st.status === 'inactive' ? 'bg-gray-100 text-gray-700'
                            : 'bg-green-100 text-green-800'
                          }`}>
                            {st.status === 'graduated' ? 'Graduated' : st.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Link
                            href={`/teacher/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-methodist-blue bg-methodist-blue/10 hover:bg-methodist-blue/20"
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            View Report
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        ) : (
          /* Class Broadsheet tab: the whole-class report sheet for the past class + term */
          <div>
            {selectedClass && selectedTerm && classTeacherClasses.includes(selectedClass) ? (
              <>
                <div className="mb-4 flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                  <div className="text-sm font-semibold text-gray-800">
                    Class Broadsheet — {selectedClassName}
                    {selectedTermInfo ? ` — ${selectedTermInfo.name} ${selectedYear}` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintBroadsheet}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-methodist-blue text-white text-sm font-medium rounded-lg hover:bg-methodist-blue/90 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Print / Download
                  </button>
                </div>
                <div ref={broadsheetRef}>
                  <ClassReportSheet
                    classId={selectedClass}
                    termId={selectedTerm}
                    historical
                  />
                </div>
                <ClassReportPrintStyles />
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 text-sm">
                {!classTeacherClasses.includes(selectedClass)
                  ? 'You must be the class teacher of the selected class to view its broadsheet.'
                  : 'Select a class and term to generate the class report sheet.'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
