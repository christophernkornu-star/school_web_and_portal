'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Search, FileText, Loader2, Archive, Users, Printer, 
  ChevronDown, GraduationCap, Calendar, Clock, Eye, AlertCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { resolveActiveAcademicYear, isPastYear } from '@/lib/academic-year'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import ClassReportSheet, { ClassReportPrintStyles } from '@/components/teacher/ClassReportSheet'

const PAGE_SIZE = 15

interface TeacherClass {
  class_id: string
  class_name: string
}

interface TermItem {
  id: string
  name: string
  academic_year: string
}

interface StudentRosterItem {
  id: string
  first_name: string
  middle_name?: string | null
  last_name: string
  student_id: string
  gender?: string | null
  status?: string | null
  graduated_at?: string | null
}

export default function TeacherHistoricalReportsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [loadingRoster, setLoadingRoster] = useState(false)
  const [classes, setClasses] = useState<TeacherClass[]>([])
  const [selectedClass, setSelectedClass] = useState('')
  const [classTeacherClasses, setClassTeacherClasses] = useState<string[]>([])

  const [activeTab, setActiveTab] = useState<'reportcards' | 'broadsheet'>('reportcards')

  const [years, setYears] = useState<string[]>([])
  const [selectedYear, setSelectedYear] = useState('')
  const [terms, setTerms] = useState<TermItem[]>([])
  const [selectedTerm, setSelectedTerm] = useState('')

  const [roster, setRoster] = useState<StudentRosterItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const broadsheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function init() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData } = await getTeacherData(user.id)
        if (!teacherData) {
          router.push('/login?portal=teacher')
          return
        }

        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        const assignedClasses: TeacherClass[] = classAccess.map((c: any) => ({
          class_id: c.class_id,
          class_name: c.class_name
        }))
        setClasses(assignedClasses)
        setClassTeacherClasses(
          classAccess.filter((c: any) => c.is_class_teacher === true).map((c: any) => c.class_id)
        )

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

  useEffect(() => {
    async function loadTermsForYear() {
      if (!selectedYear) {
        setTerms([])
        setSelectedTerm('')
        return
      }
      const { data } = await supabase
        .from('academic_terms')
        .select('id, name, academic_year')
        .eq('academic_year', selectedYear)
        .order('name')

      setTerms(data || [])
      const current = data?.find((t: any) => t.is_current)
      setSelectedTerm(current?.id || data?.[0]?.id || '')
      setCurrentPage(1)
    }
    loadTermsForYear()
  }, [supabase, selectedYear])

  useEffect(() => {
    async function loadRoster() {
      if (!selectedClass || !selectedTerm) {
        setRoster([])
        return
      }
      setLoadingRoster(true)
      try {
        const { data, error } = await supabase
          .from('scores')
          .select('student_id, students(first_name, middle_name, last_name, student_id, gender, status, graduated_at)')
          .eq('class_id', selectedClass)
          .eq('term_id', selectedTerm)

        if (error) throw error

        const map = new Map<string, StudentRosterItem>()
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
              graduated_at: s.graduated_at
            })
          }
        })

        const list = Array.from(map.values()).sort((a, b) =>
          (a.last_name || '').localeCompare(b.last_name || '')
        )

        setRoster(list)
        setCurrentPage(1)
      } catch (e: any) {
        console.error('Error loading historical roster:', e)
        toast.error('Failed to load class roster')
        setRoster([])
      } finally {
        setLoadingRoster(false)
      }
    }
    loadRoster()
  }, [supabase, selectedClass, selectedTerm])

  const selectedTermInfo = terms.find((t) => t.id === selectedTerm)
  const selectedClassName = classes.find((c) => c.class_id === selectedClass)?.class_name || 'Class'

  const filteredRoster = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    if (!q) return roster
    return roster.filter((st) => {
      return (
        (st.last_name || '').toLowerCase().includes(q) ||
        (st.first_name || '').toLowerCase().includes(q) ||
        (st.student_id || '').toLowerCase().includes(q)
      )
    })
  }, [roster, searchTerm])

  const totalPages = Math.max(1, Math.ceil(filteredRoster.length / PAGE_SIZE))

  const paginatedRoster = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filteredRoster.slice(start, start + PAGE_SIZE)
  }, [filteredRoster, currentPage])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1)
    }
  }, [totalPages, currentPage])

  function handlePrintBroadsheet() {
    const el = broadsheetRef.current
    if (!el) return

    const printWindow = window.open('', '_blank', 'width=1100,height=900')
    if (!printWindow) {
      toast.error('Popup blocked — please allow popups to print.')
      return
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((node) => node.outerHTML)
      .join('\n')

    printWindow.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="utf-8" />
<title>Class Broadsheet - ${selectedClassName}</title>
${styles}
<style>
  body { margin: 0; background: white; }
</style>
</head>
<body>${el.outerHTML}
<script>
  window.onload = function() { setTimeout(function(){ window.print(); }, 300); };
</script>
</body></html>`)
    printWindow.document.close()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  if (classes.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-10 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 rounded-2xl mx-auto flex items-center justify-center">
            <Archive className="w-7 h-7" />
          </div>
          <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">No Assigned Classes</h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            You are not assigned to any classes. Contact your school administrator to configure class assignments.
          </p>
          <div className="pt-2">
            <Link
              href="/teacher/reports"
              className="inline-flex items-center justify-center px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
            >
              Back to Reports
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/reports" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2 truncate">
                  <Archive className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Historical Reports Archive</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Browse previous academic sessions, student report cards, and broadsheets
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300 border border-[#003B5C]/20 shrink-0">
              Archived Data
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 sm:space-y-6">
        {/* Filters Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-5 md:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {/* Class Cohort Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Class Cohort <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Academic Year Dropdown */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Academic Year <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                >
                  <option value="">Select past year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Term Session Dropdown */}
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Term Session <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedTerm}
                  onChange={(e) => {
                    setSelectedTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  disabled={!selectedYear || terms.length === 0}
                  className="w-full pl-5 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">{selectedYear ? 'Select term' : 'Choose year first'}</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.academic_year})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Search Field */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-750">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by student name or ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-11 pr-4 py-2.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
              />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="w-full sm:w-auto overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <div className="bg-gray-200/70 dark:bg-gray-800/90 p-1.5 rounded-2xl inline-flex items-center gap-1.5 min-w-full sm:min-w-0 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab('reportcards')}
                className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'reportcards'
                    ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Student Report Cards</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('broadsheet')}
                disabled={!classTeacherClasses.includes(selectedClass)}
                className={`shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 whitespace-nowrap ${
                  activeTab === 'broadsheet'
                    ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                } ${!classTeacherClasses.includes(selectedClass) ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <Users className="w-4 h-4" />
                <span>Class Broadsheet</span>
              </button>
            </div>
          </div>

          {activeTab === 'broadsheet' && !classTeacherClasses.includes(selectedClass) && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Only designated class teachers can view the broadsheet.</span>
            </p>
          )}
        </div>

        {/* Tab 1: Student Report Cards List */}
        {activeTab === 'reportcards' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-gray-50/50 dark:bg-gray-850">
              <div className="min-w-0">
                <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                  {selectedClassName}
                  {selectedTermInfo ? ` — ${selectedTermInfo.name} (${selectedYear})` : ''}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Showing {filteredRoster.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0} -{' '}
                  {Math.min(currentPage * PAGE_SIZE, filteredRoster.length)} of {filteredRoster.length} student{filteredRoster.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            {loadingRoster ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredRoster.length === 0 ? (
              <div className="px-6 py-14 text-center space-y-2">
                <Archive className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                  {selectedClass && selectedTerm
                    ? 'No students found with recorded scores for this term'
                    : 'Select a class, year, and term above to view report cards'}
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Historical scores determine which students were active in this classroom cohort.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Cards Layout (< md) */}
                <div className="block md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedRoster.map((st) => (
                    <div key={st.id} className="p-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-full bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 font-black text-xs flex items-center justify-center shrink-0">
                            {st.first_name[0]}{st.last_name[0]}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                              {[st.last_name, st.middle_name, st.first_name].filter(Boolean).join(', ')}
                            </h4>
                            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {st.student_id} {st.gender ? `• ${st.gender}` : ''}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`shrink-0 px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                            st.status === 'graduated'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                              : st.status === 'transferred'
                              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'
                              : st.status === 'inactive'
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}
                        >
                          {st.status === 'graduated' ? 'Graduated' : st.status || 'Active'}
                        </span>
                      </div>

                      <Link
                        href={`/teacher/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/10 dark:bg-[#003B5C]/20 hover:bg-[#003B5C]/20 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Historical Report</span>
                      </Link>
                    </div>
                  ))}
                </div>

                {/* Tablet & Desktop Table (≥ md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                      <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4 text-center">Gender</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-right">Report Card</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                      {paginatedRoster.map((st) => (
                        <tr key={st.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition">
                          <td className="p-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {[st.last_name, st.middle_name, st.first_name].filter(Boolean).join(', ')}
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">{st.student_id}</div>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap text-gray-600 dark:text-gray-300">
                            {st.gender || '—'}
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-0.5 text-[10px] font-black uppercase rounded-full ${
                                st.status === 'graduated'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                                  : st.status === 'transferred'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/50 dark:text-yellow-300'
                                  : st.status === 'inactive'
                                  ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                              }`}
                            >
                              {st.status === 'graduated' ? 'Graduated' : st.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-right whitespace-nowrap">
                            <Link
                              href={`/teacher/reports/student/${st.id}?term=${selectedTerm}&class=${selectedClass}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#003B5C]/10 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-300 hover:bg-[#003B5C]/20 rounded-xl text-xs font-bold transition"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>View Report</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center sm:text-left">
                      Page <span className="font-bold text-gray-900 dark:text-white">{currentPage}</span> of{' '}
                      <span className="font-bold text-gray-900 dark:text-white">{totalPages}</span>
                    </p>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition shadow-sm"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Prev</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition shadow-sm"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Class Broadsheet */}
        {activeTab === 'broadsheet' && (
          <div>
            {selectedClass && selectedTerm && classTeacherClasses.includes(selectedClass) ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4">
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white truncate">
                      Class Broadsheet: {selectedClassName}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {selectedTermInfo ? `${selectedTermInfo.name} (${selectedYear})` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintBroadsheet}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95 shrink-0"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Download Sheet</span>
                  </button>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-x-auto p-2 sm:p-4">
                  <div ref={broadsheetRef} className="min-w-[800px]">
                    <ClassReportSheet
                      classId={selectedClass}
                      termId={selectedTerm}
                      historical
                    />
                  </div>
                </div>
                <ClassReportPrintStyles />
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-12 text-center text-gray-500 text-xs sm:text-sm space-y-2">
                <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {!classTeacherClasses.includes(selectedClass)
                    ? 'Broadsheet access is restricted to class teachers.'
                    : 'Select a class and term to generate the historical class broadsheet.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}