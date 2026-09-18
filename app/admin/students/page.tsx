'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  Palette,
  Shuffle,
  X,
  RotateCcw,
  Loader2,
  ChevronDown,
  GraduationCap,
  Eye,
  CheckCircle2,
  UserCheck
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { SectionSelector } from '@/components/sections/SectionSelector'

const PAGE_SIZE = 20

const STATUS_TABS = [
  { value: 'all', label: 'All Records' },
  { value: 'active', label: 'Active' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'graduated', label: 'Graduated' },
]

export default function StudentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()

  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [classFilter, setClassFilter] = useState('all')
  const [sectionFilter, setSectionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])

  // Section reassign modal
  const [reassignModal, setReassignModal] = useState<{
    student: any
    open: boolean
  } | null>(null)
  const [reassigning, setReassigning] = useState(false)

  // Re-activate modal
  const [reactivateModal, setReactivateModal] = useState<{ student: any | null }>({ student: null })
  const [reactivating, setReactivating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Student section cache
  const [studentSections, setStudentSections] = useState<Record<string, any>>({})

  // Pagination
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  useEffect(() => {
    loadClasses()
    loadSections()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadStudents()
    }, 250)
    return () => clearTimeout(timer)
  }, [page, searchTerm, classFilter, sectionFilter, statusFilter, router, user, contextLoading])

  async function loadClasses() {
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('level')

    if (classesData) setClasses(classesData)
  }

  async function loadSections() {
    const { data } = await supabase
      .from('sections')
      .select('id, name, colour, emblem_url')
      .eq('is_active', true)
      .order('sort_order')

    if (data) setSections(data)
  }

  async function loadStudentSections(studentIds: string[]) {
    if (studentIds.length === 0) return
    const { data } = await supabase
      .from('student_sections')
      .select('student_id, section_id, sections(id, name, colour, emblem_url)')
      .in('student_id', studentIds)

    if (data) {
      const map: Record<string, any> = {}
      data.forEach((ss: any) => {
        map[ss.student_id] = ss.sections || null
      })
      setStudentSections(prev => ({ ...prev, ...map }))
    }
  }

  async function loadStudents() {
    if (contextLoading) return
    setLoading(true)

    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    let query = supabase
      .from('students')
      .select(`
        *,
        profiles:profile_id(full_name, email),
        classes:class_id(name, level)
      `, { count: 'exact' })
      .order('first_name', { ascending: true })

    if (classFilter !== 'all') {
      query = query.eq('class_id', classFilter)
    }

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (sectionFilter !== 'all') {
      const { data: sectionData } = await supabase
        .from('student_sections')
        .select('student_id')
        .eq('section_id', sectionFilter)
      const sectionStudentIds = (sectionData || []).map((s: { student_id: string }) => s.student_id)
      query = query.in('id', sectionStudentIds)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%,middle_name.ilike.%${term}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data: studentsData, count } = await query.range(from, to)

    if (studentsData) {
      setStudents(studentsData)
      setTotalCount(count || 0)
      loadStudentSections(studentsData.map((s: { id: string }) => s.id))
    }
    setLoading(false)
  }

  async function handleReassignSection(studentId: string, sectionId: string) {
    setReassigning(true)
    try {
      const { error } = await supabase
        .from('student_sections')
        .upsert({ student_id: studentId, section_id: sectionId }, { onConflict: 'student_id' })

      if (error) throw error

      toast.success('Section reassigned successfully')
      setReassignModal(null)
      loadStudents()
    } catch (error: any) {
      toast.error(error.message || 'Failed to reassign section')
    } finally {
      setReassigning(false)
    }
  }

  const handleDeleteStudent = async (studentId: string, profileId: string) => {
    if (!confirm('Are you sure you want to permanently delete this student? This action cannot be undone.')) return

    try {
      setDeletingId(studentId)
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, profileId }),
      })

      if (!response.ok) throw new Error('Failed to delete student')

      toast.success('Student record deleted successfully')
      loadStudents()
    } catch (error: any) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student: ' + (error.message || 'Unknown error'))
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReactivate() {
    const student = reactivateModal.student
    if (!student) return

    setReactivating(true)
    try {
      const updates: any = { status: 'active' }
      if (student.status === 'graduated') {
        updates.graduated_at = null
      }
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', student.id)
      if (error) throw error

      toast.success('Student re-activated with historical records intact')
      setReactivateModal({ student: null })
      loadStudents()
    } catch (error: any) {
      console.error('Error reactivating student:', error)
      toast.error(error.message || 'Failed to re-activate student')
    } finally {
      setReactivating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
      case 'transferred':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
      case 'graduated':
        return 'bg-blue-50 text-[#003B5C] border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
      case 'inactive':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  if (loading && students.length === 0) {
    return <StudentsSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white pb-16 sm:pb-20">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Student Directory
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Roster management, section allocation, and learner standing
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 shrink-0">
              <Link
                href="/admin/students/add"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 text-center shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Add Student</span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* Search & Filter Controls Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search student by name, student ID, or surname..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="w-full pl-10 pr-9 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setPage(1)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2 sm:gap-2.5 shrink-0">
              
              {/* Class Filter */}
              <div className="relative flex-1 sm:w-44">
                <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={classFilter}
                  onChange={(e) => {
                    setClassFilter(e.target.value)
                    setPage(1)
                  }}
                  className="w-full appearance-none pl-8 pr-8 py-2 sm:py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  <option value="all">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Section Filter */}
              <div className="relative flex-1 sm:w-44">
                <Palette className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={sectionFilter}
                  onChange={(e) => {
                    setSectionFilter(e.target.value)
                    setPage(1)
                  }}
                  className="w-full appearance-none pl-8 pr-8 py-2 sm:py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  <option value="all">All Sections / Houses</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

            </div>

          </div>

          {/* Status Tabs Segment */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none w-full sm:w-auto">
              {STATUS_TABS.map((tab) => {
                const isActive = statusFilter === tab.value
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.value)
                      setPage(1)
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 shrink-0 ${
                      isActive
                        ? 'bg-[#003B5C] text-white shadow-2xs dark:bg-blue-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <span className="hidden sm:inline-flex text-xs font-mono font-bold text-slate-400 shrink-0">
              {totalCount} Total Learners
            </span>
          </div>

        </section>

        {/* Records Output Area */}
        {students.length === 0 && !loading ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-16 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <Users className="w-6 h-6 opacity-35" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                No Learners Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {searchTerm || classFilter !== 'all' || sectionFilter !== 'all' || statusFilter !== 'all'
                  ? 'No students match your active search filters.'
                  : 'No student records have been created in the database yet.'}
              </p>
            </div>
            {(searchTerm || classFilter !== 'all' || sectionFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setClassFilter('all')
                  setSectionFilter('all')
                  setStatusFilter('all')
                  setPage(1)
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            
            {/* Desktop & Tablet Table View (≥ md screens) */}
            <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="px-4 lg:px-6 py-3.5">Learner Profile</th>
                      <th className="px-4 lg:px-6 py-3.5">Demographics</th>
                      <th className="px-4 lg:px-6 py-3.5">Class Cohort</th>
                      <th className="px-4 lg:px-6 py-3.5">House / Section</th>
                      <th className="px-4 lg:px-6 py-3.5 text-center">Status</th>
                      <th className="px-4 lg:px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {students.map((student) => {
                      const fullName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim()
                      const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase() || 'ST'

                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 lg:px-6 py-3.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate max-w-[170px] lg:max-w-[240px]">
                                  {fullName}
                                </p>
                                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                                  <span>{student.student_id}</span>
                                  {student.email && (
                                    <>
                                      <span>•</span>
                                      <span className="truncate max-w-[130px]" title={student.email}>{student.email}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                              <div>
                                <span className="text-slate-400 font-bold text-[10px] uppercase">DOB:</span>{' '}
                                <span className="font-semibold font-mono">{student.date_of_birth || '---'}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-bold text-[10px] uppercase">Sex:</span>{' '}
                                <span className="font-semibold capitalize">{student.gender || 'Unspecified'}</span>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                              <span>{student.classes?.name || 'Unassigned'}</span>
                            </span>
                          </td>

                          <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <SectionBadge section={studentSections[student.id] || null} size="sm" />
                              <button
                                type="button"
                                onClick={() => setReassignModal({ student, open: true })}
                                className="p-1 rounded-lg text-slate-400 hover:text-[#003B5C] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                title="Reassign House / Section"
                              >
                                <Shuffle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          <td className="px-4 lg:px-6 py-3.5 text-center whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(student.status)}`}>
                              {student.status || 'Active'}
                            </span>
                          </td>

                          <td className="px-4 lg:px-6 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <Link
                                href={`/admin/students/${student.id}`}
                                className="p-1.5 text-slate-500 hover:text-[#003B5C] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title="View Learner Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>

                              {student.status !== 'active' && (
                                <button
                                  type="button"
                                  onClick={() => setReactivateModal({ student })}
                                  className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors"
                                  title="Re-activate Student"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                                disabled={deletingId === student.id}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors disabled:opacity-50"
                                title="Delete Student"
                              >
                                {deletingId === student.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Card Roster (< md screens) */}
            <div className="md:hidden space-y-3">
              {students.map((student) => {
                const fullName = `${student.last_name || ''} ${student.first_name || ''} ${student.middle_name || ''}`.trim()
                const initials = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`.toUpperCase() || 'ST'

                return (
                  <div
                    key={student.id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {fullName}
                          </h4>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                            {student.student_id}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border shrink-0 ${getStatusBadge(student.status)}`}>
                        {student.status || 'Active'}
                      </span>
                    </div>

                    {/* Metadata Attribute Badges */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-50/70 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Class</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-[11px] mt-0.5">
                          {student.classes?.name || 'Unassigned'}
                        </span>
                      </div>

                      <div className="bg-slate-50/70 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Section</span>
                        <div className="flex items-center justify-between gap-1 mt-0.5">
                          <SectionBadge section={studentSections[student.id] || null} size="sm" />
                          <button
                            type="button"
                            onClick={() => setReassignModal({ student, open: true })}
                            className="p-0.5 text-slate-400 hover:text-[#003B5C] dark:hover:text-blue-400 rounded"
                            title="Change Section"
                          >
                            <Shuffle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-50/70 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200 capitalize truncate block text-[11px] mt-0.5">
                          {student.gender || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {student.date_of_birth ? `DOB: ${student.date_of_birth}` : ''}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <Link 
                          href={`/admin/students/${student.id}`}
                          className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition"
                        >
                          View Profile
                        </Link>

                        {student.status !== 'active' && (
                          <button
                            type="button"
                            onClick={() => setReactivateModal({ student })}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl transition"
                            title="Re-activate Student"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                          disabled={deletingId === student.id}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition disabled:opacity-50"
                          title="Delete Student"
                        >
                          {deletingId === student.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                  </div>
                )
              })}
            </div>

            {/* Pagination Strip */}
            {totalCount > 0 && (
              <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                  Showing <strong className="text-slate-900 dark:text-white font-mono">{(page - 1) * PAGE_SIZE + 1}</strong> to{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">{Math.min(page * PAGE_SIZE, totalCount)}</strong> of{' '}
                  <strong className="text-slate-900 dark:text-white font-mono">{totalCount}</strong> students
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 transition active:scale-95"
                  >
                    Previous
                  </button>
                  
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 px-2">
                    Page {page} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40 transition active:scale-95"
                  >
                    Next
                  </button>
                </div>
              </section>
            )}

          </div>
        )}

      </main>

      {/* Section Reassign Modal */}
      {reassignModal?.open && reassignModal.student && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setReassignModal(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Reassign Section
                  </h3>
                  <p className="text-xs text-slate-400">
                    {reassignModal.student.first_name} {reassignModal.student.last_name}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setReassignModal(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                Select House / Section
              </label>
              <SectionSelector
                value={studentSections[reassignModal.student.id]?.id || ''}
                onChange={(sectionId) => {
                  handleReassignSection(reassignModal.student.id, sectionId)
                }}
              />
              {reassigning && (
                <p className="text-xs text-[#003B5C] dark:text-blue-400 flex items-center gap-2 font-bold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating house allocation...</span>
                </p>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setReassignModal(null)}
                disabled={reassigning}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-activate Confirmation Modal */}
      {reactivateModal.student && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setReactivateModal({ student: null })}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Re-activate Learner
                </h3>
                <p className="text-xs text-slate-400">
                  {reactivateModal.student.first_name} {reactivateModal.student.last_name}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              This student is currently marked as <strong className="capitalize text-slate-900 dark:text-white">{reactivateModal.student.status}</strong>. Re-activating will restore them back to active enrollment.
            </p>

            <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>All historical assessments and remarks are preserved. If previously graduated, the graduation record timestamp is cleared.</span>
            </div>

            <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setReactivateModal({ student: null })}
                disabled={reactivating}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleReactivate}
                disabled={reactivating}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2 shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Re-activating...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Confirm Re-activation</span>
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

function StudentsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-4 flex-1">
        <Skeleton className="h-28 w-full rounded-2xl sm:rounded-3xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </main>
    </div>
  )
}