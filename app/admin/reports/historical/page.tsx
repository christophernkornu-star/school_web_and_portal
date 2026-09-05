'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, FileText, Loader2, Archive, Users, RotateCcw, X, Printer, Calculator } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { resolveActiveAcademicYear, isPastYear } from '@/lib/academic-year'
import { calculateAggregate, normalizeAcademicYear, formatStudentName, getGradeValue } from '@/lib/academic-utils'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import ClassReportSheet, { ClassReportPrintStyles } from '@/components/teacher/ClassReportSheet'

interface ClassItem { id: string; name: string }
interface TermItem { id: string; name: string; academic_year: string }

const getShortSubjectName = (name: string) => {
  const n = name.toLowerCase()
  if (n.includes('mathematics') || n.includes('maths')) return 'Math'
  if (n.includes('english')) return 'Eng'
  if (n.includes('science')) return 'Sci'
  if (n.includes('social')) return 'Soc'
  if (n.includes('religious') || n.includes('rme')) return 'RME'
  if (n.includes('creative') || n.includes('arts')) return 'CAD'
  if (n.includes('computing') || n.includes('ict')) return 'Comp'
  if (n.includes('world') || n.includes('people')) return 'OWOP'
  if (n.includes('history')) return 'Hist'
  if (n.includes('french')) return 'Fren'
  if (n.includes('ghanaian')) return 'G.Lang'
  if (n.includes('career')) return 'C.Tech'
  return name.substring(0, 4)
}

export default function AdminHistoricalReportsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState('')

  // Active tab: 'reportcards' lists per-student report cards; 'broadsheet'
  // shows the whole-class class report sheet for the selected past class + term.
  const [activeTab, setActiveTab] = useState<'reportcards' | 'broadsheet' | 'mock'>('reportcards')

  // Grouped terms by academic year for a clean "Year > Term" drill-down
  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [terms, setTerms] = useState<TermItem[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')

  const [roster, setRoster] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [reactivateModal, setReactivateModal] = useState<{ show: boolean; student: any | null }>({ show: false, student: null })
  const [reactivating, setReactivating] = useState(false)

  // Mock Results tab — mock exams are recorded in their own tables
  // (mock_exams / mock_scores) via the standalone Mock Exams module, not the
  // regular `scores` table. Graduating classes often only have MOCK data for
  // Term 2/3, so this tab surfaces it separately.
  const [mockExams, setMockExams] = useState<{ id: string; name: string; academic_year: string; term_id: string }[]>([])
  const [selectedMockExam, setSelectedMockExam] = useState('')
  const [loadingMock, setLoadingMock] = useState(false)
  const [mockSubjects, setMockSubjects] = useState<{ id: string; name: string; code: string }[]>([])
  const [mockRoster, setMockRoster] = useState<any[]>([])
  const [sheetSortStrategy, setSheetSortStrategy] = useState<'alphabetical' | 'performance' | 'boys_first' | 'girls_first'>('alphabetical')

  // Ref to the class broadsheet so we can print ONLY the sheet in a dedicated
  // window (the admin page — sidebar, header, filters — should not appear in print).
  const broadsheetRef = useRef<HTMLDivElement>(null)

  // Load classes + academic years (from academic_terms)
  useEffect(() => {
    async function init() {
      const user = await supabase.auth.getUser()
      if (!user.data?.user) { router.push('/login?portal=admin'); return }

      const [clsRes, termRes] = await Promise.all([
        supabase.from('classes').select('id, name').order('name'),
        supabase.from('academic_terms').select('name, academic_year').order('academic_year', { ascending: false })
      ])
      setClasses(clsRes.data || [])

      // PAST years only — exclude the current/active academic year from the
      // historical drill-down (historical browsing should not show the live session).
      const activeYear = await resolveActiveAcademicYear(supabase)

      const yearSet: string[] = Array.from(
        new Set<string>((termRes.data || []).map((t: any) => String(t.academic_year)))
      ).filter((y) => isPastYear(y, activeYear))
      setYears(yearSet)

      if (clsRes.data?.length) setSelectedClass(clsRes.data[0].id)
      if (yearSet.length) setSelectedYear(yearSet[0])

      setLoading(false)
    }
    init()
  }, [supabase, router])

  // Lock the class to Basic 9 whenever the Mock tab is active
  useEffect(() => {
    if (activeTab !== 'mock' || classes.length === 0) return
    const basic9 = classes.find(c => c.name.trim().toLowerCase() === 'basic 9')
    if (basic9 && selectedClass !== basic9.id) setSelectedClass(basic9.id)
  }, [activeTab, classes, selectedClass])

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

  // Load mock exams recorded for this class across all years (not scoped by selectedYear)
  useEffect(() => {
    async function loadMockExams() {
      if (!selectedClass) { setMockExams([]); setSelectedMockExam(''); return }
      const { data, error } = await supabase
        .from('mock_exams')
        .select('id, name, academic_year, term_id')
        .eq('class_id', selectedClass)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading mock exams:', error)
        setMockExams([])
        setSelectedMockExam('')
        return
      }
      setMockExams(data || [])
      setSelectedMockExam(data?.[0]?.id || '')
    }
    loadMockExams()
  }, [supabase, selectedClass])

  // Load student scores for the selected mock exam. Roster is derived from
  // mock_scores directly (not filtered by student status), so graduated
  // students appear automatically — same pattern as the regular roster load.
  useEffect(() => {
    async function loadMockRoster() {
      if (!selectedMockExam) { setMockRoster([]); setMockSubjects([]); return }
      setLoadingMock(true)
      try {
        const { data, error } = await supabase
          .from('mock_scores')
          .select('student_id, subject_id, score, subjects(id, name, code), students(first_name, middle_name, last_name, student_id, gender, status, graduated_at)')
          .eq('mock_exam_id', selectedMockExam)

        if (error) throw error

        const subjectMap = new Map<string, { id: string; name: string; code: string }>()
        const studentMap = new Map<string, any>()

        ;(data || []).forEach((row: any) => {
          const subj = row.subjects
          const st = row.students
          if (!subj || !st) return

          if (!subjectMap.has(row.subject_id)) {
            subjectMap.set(row.subject_id, { id: row.subject_id, name: subj.name, code: subj.code })
          }

          if (!studentMap.has(row.student_id)) {
            studentMap.set(row.student_id, {
              id: row.student_id,
              first_name: st.first_name,
              middle_name: st.middle_name,
              last_name: st.last_name,
              student_id: st.student_id,
              gender: st.gender,
              status: st.status,
              graduated_at: st.graduated_at,
              scores: {} as Record<string, number>,
            })
          }
          studentMap.get(row.student_id).scores[row.subject_id] = Number(row.score)
        })

        // Same subject ordering convention as the teacher Mock Exams page:
        // English, Maths, Science, Social first, then A–Z.
        const subjPriority = (name: string) => {
          const n = (name || '').toLowerCase()
          if (n.includes('english')) return 1
          if (n.includes('mathematics') || n.includes('maths')) return 2
          if (n.includes('science') && !n.includes('computer')) return 3
          if (n.includes('social')) return 4
          return 100
        }
        const subjectsSorted = Array.from(subjectMap.values()).sort((a, b) => {
          const pa = subjPriority(a.name), pb = subjPriority(b.name)
          return pa !== pb ? pa - pb : a.name.localeCompare(b.name)
        })
        setMockSubjects(subjectsSorted)

        const roster = Array.from(studentMap.values()).map((st: any) => {
          const scoreInputs = subjectsSorted
            .filter(s => st.scores[s.id] !== undefined)
            .map(s => ({ subjectName: s.name, score: st.scores[s.id] }))
          const { total: aggregate } = calculateAggregate(scoreInputs)
          const totalScore = scoreInputs.reduce((sum, s) => sum + s.score, 0)
          const average = scoreInputs.length ? totalScore / scoreInputs.length : 0
          return { ...st, aggregate, totalScore, average }
        }).sort((a: any, b: any) => (a.last_name || '').localeCompare(b.last_name || ''))

        setMockRoster(roster)
      } catch (e: any) {
        console.error('Error loading mock roster:', e)
        toast.error('Failed to load mock results')
        setMockRoster([])
        setMockSubjects([])
      } finally {
        setLoadingMock(false)
      }
    }
    loadMockRoster()
  }, [supabase, selectedMockExam])

  // Load the roster based on class + term. We find students who actually have
  // scores for this class + term (via scored class_id) so we capture everyone who
  // was in that class that term — including graduated & transferred students.
  useEffect(() => {
    async function loadRoster() {
      if (!selectedClass || !selectedTerm) { setRoster([]); return }
      setLoadingRoster(true)
      try {
        // Distinct students who have scores in this class for this term
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
  const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'class'

  const filteredRoster = roster.filter((st: any) => {
    const q = searchTerm.toLowerCase()
    return (st.last_name || '').toLowerCase().includes(q) ||
           (st.first_name || '').toLowerCase().includes(q) ||
           (st.student_id || '').toLowerCase().includes(q)
  })

  const filteredMockRoster = mockRoster.filter((st: any) => {
    const q = searchTerm.toLowerCase()
    return (st.last_name || '').toLowerCase().includes(q) ||
           (st.first_name || '').toLowerCase().includes(q) ||
           (st.student_id || '').toLowerCase().includes(q)
  })

  // Re-activate a previously graduated/transferred/inactive student while keeping all
  // their historical records intact (soft re-enrolment, no data loss).
  async function handleReactivate() {
    if (!reactivateModal.student) return
    setReactivating(true)
    try {
      const updates: any = { status: 'active' }
      // If the student was marked graduated, clear the graduation timestamp on return.
      if (reactivateModal.student.status === 'graduated') {
        updates.graduated_at = null
      }
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', reactivateModal.student.id)
      if (error) throw error

      toast.success('Student re-activated with historical records intact')
      // Remove from current (historical) roster view
      setRoster(roster.filter((s: any) => s.id !== reactivateModal.student.id))
      setReactivateModal({ show: false, student: null })
    } catch (e: any) {
      console.error('Error reactivating student:', e)
      toast.error('Failed to re-activate student: ' + e.message)
    } finally {
      setReactivating(false)
    }
  }

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

    // Bring along the app's stylesheets so Tailwind classes are applied.
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

  function handlePrintMockSheet() {
    const mockData = mockExams.find(m => m.id === selectedMockExam)
    if (!mockData || mockRoster.length === 0) return

    const processed = mockRoster.map((st: any) => ({
      ...st,
      fullname: formatStudentName(st),
    })).sort((a: any, b: any) => {
      if (sheetSortStrategy === 'performance') {
        if (a.aggregate !== b.aggregate) return a.aggregate - b.aggregate
        return b.totalScore - a.totalScore
      } else if (sheetSortStrategy === 'boys_first') {
        if (a.gender === b.gender) return a.fullname.localeCompare(b.fullname)
        return a.gender === 'Male' ? -1 : 1
      } else if (sheetSortStrategy === 'girls_first') {
        if (a.gender === b.gender) return a.fullname.localeCompare(b.fullname)
        return a.gender === 'Female' ? -1 : 1
      }
      return a.fullname.localeCompare(b.fullname)
    })

    const FIRST_PAGE_COUNT = 22
    const OTHER_PAGE_COUNT = 26
    const pages: typeof processed[] = []
    if (processed.length > 0) {
      pages.push(processed.slice(0, FIRST_PAGE_COUNT))
      for (let i = FIRST_PAGE_COUNT; i < processed.length; i += OTHER_PAGE_COUNT) {
        pages.push(processed.slice(i, i + OTHER_PAGE_COUNT))
      }
    } else {
      pages.push([])
    }

    const pagesHtml = pages.map((pageStudents, pageIndex) => `
      <div class="max-w-[297mm] mx-auto mb-8 bg-white shadow-xl ring-1 ring-gray-900/5 print:shadow-none print:ring-0 rounded-2xl print:rounded-none p-6 md:p-10 print:p-0 print:mb-0 page-container flex flex-col justify-between print:h-[195mm]">
        <div class="flex-1">
          ${pageIndex === 0 ? `
          <div class="text-center mb-1.5 border-b-[2px] border-slate-800 pb-1">
            <h1 class="text-2xl md:text-3xl font-black tracking-tight text-slate-900 uppercase">Biriwa Methodist "C" Basic School</h1>
            <h2 class="text-sm md:text-base font-bold tracking-widest text-slate-600 uppercase mt-1">
              ${mockData.academic_year} • ${mockData.name.replace(/mock/i, '').trim()} Mock Results
            </h2>
          </div>` : ''}
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border border-slate-400 text-xs md:text-sm print:text-[12px] min-w-[800px] md:min-w-0">
              <thead>
                <tr class="bg-slate-100 text-slate-800 font-bold uppercase tracking-wider">
                  <th class="border border-slate-400 px-1.5 py-0.5 w-8 text-center">SN</th>
                  <th class="border border-slate-400 px-2 py-0.5 text-left min-w-[200px]">NAME OF STUDENT</th>
                  ${mockSubjects.map(s => `<th class="border border-slate-400 px-1 py-1 w-10 text-center text-slate-700">${getShortSubjectName(s.name)}</th>`).join('')}
                  <th class="border border-slate-400 px-1.5 py-0.5 w-10 text-center bg-slate-50 whitespace-nowrap truncate">TOT. SCO</th>
                  <th class="border border-slate-400 px-1.5 py-0.5 w-10 text-center bg-slate-50">AVG</th>
                  <th class="border border-slate-400 px-1.5 py-0.5 w-10 text-center bg-slate-200">AGG</th>
                </tr>
              </thead>
              <tbody class="text-slate-700 font-medium">
                ${pageStudents.map((student: any, idx: number) => {
                  const sn = pageIndex === 0 ? idx + 1 : FIRST_PAGE_COUNT + ((pageIndex - 1) * OTHER_PAGE_COUNT) + idx + 1
                  const cells = mockSubjects.map(s => {
                    const scoreVal = student.scores[s.id] !== undefined ? student.scores[s.id] : null
                    const grade = scoreVal !== null ? getGradeValue(scoreVal) : null
                    return `<td class="border border-slate-400 px-1 py-0.5 text-center">${
                      scoreVal !== null
                        ? `<span class="inline-flex items-baseline gap-0.5"><span class="${scoreVal < 30 ? 'text-red-700 font-bold' : ''}">${scoreVal}</span><sup class="text-[10px] font-bold text-slate-500">${grade}</sup></span>`
                        : '-'
                    }</td>`
                  }).join('')
                  return `
                  <tr class="even:bg-slate-50/50">
                    <td class="border border-slate-400 px-1.5 py-0.5 text-center">${sn}</td>
                    <td class="border border-slate-400 px-2 py-0.5 font-bold whitespace-nowrap truncate max-w-[200px] tracking-tight">${student.fullname}</td>
                    ${cells}
                    <td class="border border-slate-400 px-1.5 py-0.5 text-center font-bold bg-slate-50 text-slate-900">${student.totalScore}</td>
                    <td class="border border-slate-400 px-1.5 py-0.5 text-center font-bold text-slate-900">${student.average.toFixed(1)}</td>
                    <td class="border border-slate-400 px-1.5 py-0.5 text-center font-black bg-slate-100 text-slate-900">${student.aggregate}</td>
                  </tr>`
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="mt-2 pt-2 border-t-2 border-gray-100 print:border-gray-300 flex justify-between items-center text-[10px] md:text-xs text-gray-500 font-medium shrink-0">
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-800 tracking-wider">BIRIWA SMS</span>
            <span class="w-1.5 h-1.5 rounded-full bg-indigo-200 print:bg-gray-300"></span>
            <span>Generated on ${new Date().toLocaleDateString('en-GB')}</span>
          </div>
          <div class="flex items-center gap-2 text-gray-400">
            <span class="hidden sm:inline italic">Official Academic Record</span>
            <span class="hidden sm:inline w-1 h-1 rounded-full bg-gray-300"></span>
            <span class="text-gray-600">Page ${pageIndex + 1} of ${pages.length}</span>
          </div>
        </div>
      </div>`).join('')

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      toast.error('Popup blocked — please allow popups to print.')
      return
    }

    const styles = Array.from(
      document.querySelectorAll('style, link[rel="stylesheet"]')
    ).map(node => node.outerHTML).join('\n')

    printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${mockData.name} Mock Results — ${selectedClassName}</title>${styles}<style>
      body { margin: 0; background:#f9fafb; }
      @media print {
        @page { size: landscape; margin: 5mm; }
        body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-container { break-inside: avoid; page-break-after: always; break-after: page; }
        .page-container:last-child { page-break-after: auto; break-after: auto; }
      }
    </style></head><body class="pt-8 pb-12">${pagesHtml}<script>
      window.onload = function() { setTimeout(function(){ window.print(); }, 300); };
    </` + `script></body></html>`)
    printWindow.document.close()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start sm:items-center mb-6">
          <BackButton href="/admin/reports" className="mt-1 sm:mt-0" />
          <div className="ml-3 sm:ml-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              Historical Reports
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">Browse past term reports by class, including graduated students</p>
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
                  disabled={activeTab === 'mock'}
                  className="w-full p-2 border rounded-lg appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  <option value="">Select class</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
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
                disabled={activeTab === 'mock'}
                className="w-full p-2 border rounded-lg appearance-none bg-white disabled:bg-gray-100 disabled:text-gray-500 focus:ring-2 focus:ring-purple-500 outline-none"
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
                className="w-full p-2 border rounded-lg appearance-none bg-white focus:ring-2 focus:ring-purple-500 outline-none"
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
                className="w-full p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tabs: Report Cards | Class Broadsheet | Mock Results */}
        <div className="flex items-center gap-1 mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('reportcards')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'reportcards'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            Report Cards
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('broadsheet')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'broadsheet'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4" />
            Class Broadsheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mock')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'mock'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Mock Results
          </button>
        </div>

        {/* Roster / Mock Results / Broadsheet */}
        {activeTab === 'reportcards' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="font-semibold text-gray-800 text-sm sm:text-base">
                Students in {classes.find(c => c.id === selectedClass)?.name || 'class'}
                {selectedTermInfo ? ` — ${selectedTermInfo.name} ${selectedYear}` : ''}
              </h2>
              <span className="text-sm text-gray-500">{roster.length} student{roster.length === 1 ? '' : 's'}</span>
            </div>

            {(loading || loadingRoster) ? (
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
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                          className="inline-flex items-center flex-1 justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1.5" />
                          View Report
                        </Link>
                        {st.status !== 'active' && (
                          <button
                            onClick={() => setReactivateModal({ show: true, student: st })}
                            className="inline-flex items-center flex-1 justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                            title="Re-activate this student (keeps historical records)"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                            Re-activate
                          </button>
                        )}
                      </div>
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
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/admin/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200"
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                View Report
                              </Link>
                              {st.status !== 'active' && (
                                <button
                                  onClick={() => setReactivateModal({ show: true, student: st })}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
                                  title="Re-activate this student (keeps historical records)"
                                >
                                  <RotateCcw className="w-4 h-4 mr-1" />
                                  Re-activate
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        ) : activeTab === 'mock' ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-800 text-sm sm:text-base">
                  Mock Results — {selectedClassName}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Recorded via the Mock Exams module, separate from regular term scores.
                </p>
              </div>
              {mockExams.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedMockExam}
                    onChange={(e) => setSelectedMockExam(e.target.value)}
                    className="p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    {mockExams.map(m => (
                      <option key={m.id} value={m.id}>{m.name} Mock ({m.academic_year})</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <span className="text-sm font-semibold text-gray-700">Sort by:</span>
                    <select
                      value={sheetSortStrategy}
                      onChange={(e) => setSheetSortStrategy(e.target.value as any)}
                      className="bg-white border border-gray-200 rounded-lg text-sm px-2 py-1 focus:ring-2 focus:ring-purple-500 font-medium"
                    >
                      <option value="alphabetical">Alphabetical (A-Z)</option>
                      <option value="performance">Best to Least</option>
                      <option value="boys_first">Boys First</option>
                      <option value="girls_first">Girls First</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintMockSheet}
                    disabled={mockRoster.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    <Printer className="w-4 h-4" />
                    Print Sheet
                  </button>
                </div>
              )}
            </div>

            {loadingMock ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-full" />
                  </div>
                ))}
              </div>
            ) : !selectedClass ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No class available for mock results.</p>
              </div>
            ) : mockExams.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No mock exams have been recorded for {selectedClassName} yet.</p>
              </div>
            ) : filteredMockRoster.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-gray-500">No student scores found for this mock exam.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50">Student</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      {mockSubjects.map(s => (
                        <th key={s.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {s.code || s.name}
                        </th>
                      ))}
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aggregate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredMockRoster.map((st: any) => (
                      <tr key={st.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white">
                          <div className="font-medium text-gray-900">
                            {[st.last_name, st.middle_name, st.first_name].filter(Boolean).join(', ')}
                          </div>
                          <div className="text-xs text-gray-500">{st.student_id}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            st.status === 'graduated' ? 'bg-purple-100 text-purple-800'
                            : st.status === 'transferred' ? 'bg-yellow-100 text-yellow-800'
                            : st.status === 'inactive' ? 'bg-gray-100 text-gray-700'
                            : 'bg-green-100 text-green-800'
                          }`}>
                            {st.status === 'graduated' ? 'Graduated' : st.status}
                          </span>
                        </td>
                        {mockSubjects.map(s => (
                          <td key={s.id} className="px-3 py-3 text-center text-gray-700">
                            {st.scores[s.id] !== undefined ? st.scores[s.id] : '—'}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-center font-medium text-gray-900">{st.totalScore}</td>
                        <td className="px-3 py-3 text-center text-gray-700">{st.average.toFixed(1)}</td>
                        <td className="px-3 py-3 text-center font-semibold text-purple-700">{st.aggregate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Class Broadsheet tab: the whole-class report sheet for the past class + term */
          <div>
            {selectedClass && selectedTerm ? (
              <>
                <div className="mb-4 flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-3">
                  <div className="text-sm font-semibold text-gray-800">
                    Class Broadsheet — {selectedClassName}
                    {selectedTermInfo ? ` — ${selectedTermInfo.name} ${selectedYear}` : ''}
                  </div>
                  <button
                    type="button"
                    onClick={handlePrintBroadsheet}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors cursor-pointer"
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
                Select a class and term to generate the class report sheet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Re-activate Confirmation Modal */}
      {reactivateModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <RotateCcw className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Re-activate Student</h3>
              </div>
              <button onClick={() => setReactivateModal({ show: false, student: null })} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 mb-2 text-sm">
              Re-activate <span className="font-semibold text-gray-900">{reactivateModal.student?.last_name} {reactivateModal.student?.first_name}</span> (currently <span className="font-semibold">{reactivateModal.student?.status}</span>)?
            </p>
            <p className="text-gray-500 mb-6 text-sm">
              The student will return to the active roster and reappear in classes. <strong>All historical scores,
              remarks, and promotion records are preserved.</strong> They will need to be assigned to a current class to
              appear on active year reports.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReactivateModal({ show: false, student: null })}
                disabled={reactivating}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 text-sm"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Re-activating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Re-activate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}