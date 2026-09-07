'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import {
  Users,
  Search,
  Filter,
  Edit,
  Trash2,
  ArrowLeft,
  Plus,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Palette,
  Shuffle,
  X,
  RotateCcw,
  Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionBadge } from '@/components/sections/SectionBadge'
import { SectionSelector } from '@/components/sections/SectionSelector'

const PAGE_SIZE = 20

const STATUS_TABS = [
  { value: 'all', label: 'All' },
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
    }, 300)
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
      router.push('/login')
      return
    }

    let query = supabase
      .from('students')
      .select(`
        *,
        profiles:profile_id(full_name, email),
        classes:class_id(name, level)
      `, { count: 'exact' })
      .order('first_name')

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

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
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
    if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return

    try {
      const response = await fetch('/api/admin/delete-student', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId, profileId }),
      })

      if (!response.ok) throw new Error('Failed to delete student')

      toast.success('Student deleted successfully')
      loadStudents()
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
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

  function statusBadgeVariant(status: string) {
    switch (status) {
      case 'active': return 'success' as const
      case 'transferred': return 'warning' as const
      case 'inactive': return 'secondary' as const
      case 'graduated': return 'secondary' as const
      default: return 'secondary' as const
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-4 sm:p-8 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="space-y-3 sm:space-y-4">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen pb-16">
        <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
          
          {/* Responsive Header */}
          <PageHeader 
            title="Student Management" 
            description="View and manage all students in the system."
          >
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => router.back()}
                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 px-3 py-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
              <Link
                href="/admin/students/add"
                className="bg-blue-600 dark:bg-blue-700 text-white px-3.5 py-2 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-xs sm:text-sm font-bold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Student</span>
              </Link>
            </div>
          </PageHeader>
          
          {/* Filters Card */}
          <Card className="rounded-2xl sm:rounded-3xl border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <CardContent className="p-3.5 sm:p-5 md:p-6 space-y-4">
              <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
                
                {/* Search Bar */}
                <div className="relative w-full lg:max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Class and Section Dropdowns */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full lg:w-auto">
                  <div className="relative w-full sm:w-48">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <select
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer shadow-sm"
                      value={classFilter}
                      onChange={(e) => setClassFilter(e.target.value)}
                    >
                      <option value="all">All Classes</option>
                      {classes.map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative w-full sm:w-48">
                    <Palette className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                    <select
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 cursor-pointer shadow-sm"
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                    >
                      <option value="all">All Sections</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={sec.id}>
                          {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Status Filter Tabs - Scrollable Pills on Phone */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {STATUS_TABS.map((tab) => {
                  const isActive = statusFilter === tab.value
                  const isNonActive = tab.value !== 'all' && tab.value !== 'active'
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : isNonActive
                            ? 'bg-amber-50 text-amber-700 border-amber-200/80 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Records Card */}
          <Card className="rounded-2xl sm:rounded-3xl border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="bg-white dark:bg-gray-800 overflow-hidden">
              
              {/* Mobile Card List (< md) */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-750">
                {students.map((student) => (
                  <div key={student.id} className="p-4 space-y-3 hover:bg-gray-50/50 dark:hover:bg-gray-750 transition-colors">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase shrink-0 shadow-sm">
                          {student.first_name?.[0]}{student.last_name?.[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                            {student.last_name} {student.first_name} {student.middle_name || ''}
                          </div>
                          <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono">{student.student_id}</span>
                            {student.email && (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[120px]">{student.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <Badge variant={statusBadgeVariant(student.status)} className="shrink-0 text-[10px] uppercase font-bold">
                        {student.status || 'Active'}
                      </Badge>
                    </div>
                    
                    {/* Balanced 3-Column Attributes Grid */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
                        <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-0.5">Class</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 truncate block text-[11px]">
                          {student.classes?.name || 'Unassigned'}
                        </span>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
                        <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-0.5">Section</span>
                        <div className="flex items-center justify-between gap-1">
                          <SectionBadge section={studentSections[student.id] || null} size="sm" />
                          <button
                            onClick={() => setReassignModal({ student, open: true })}
                            className="p-0.5 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 rounded"
                            title="Change Section"
                          >
                            <Shuffle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-xl">
                        <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider mb-0.5">Gender</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200 capitalize truncate block text-[11px]">
                          {student.gender || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between pt-1 gap-2 border-t border-gray-50 dark:border-gray-700">
                      <span className="text-[10px] text-gray-400">
                        {student.date_of_birth ? `DOB: ${student.date_of_birth}` : ''}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Link 
                          href={`/admin/students/${student.id}`}
                          className="px-2.5 py-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg text-xs font-bold transition-colors"
                        >
                          View
                        </Link>
                        {student.status !== 'active' && (
                          <button
                            onClick={() => setReactivateModal({ student })}
                            className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-lg transition-colors"
                            title="Re-activate student"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                          className="p-1.5 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-300 rounded-lg transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop Table View (≥ md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[11px] font-black text-gray-400 uppercase tracking-wider bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th scope="col" className="px-4 lg:px-6 py-3.5">Student Info</th>
                      <th scope="col" className="px-4 lg:px-6 py-3.5">Details</th>
                      <th scope="col" className="px-4 lg:px-6 py-3.5">Class</th>
                      <th scope="col" className="px-4 lg:px-6 py-3.5">Section</th>
                      <th scope="col" className="px-4 lg:px-6 py-3.5 text-center">Status</th>
                      <th scope="col" className="px-4 lg:px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {students.map((student) => (
                      <tr key={student.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase shrink-0">
                              {student.first_name?.[0]}{student.last_name?.[0]}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 dark:text-white truncate max-w-[150px] lg:max-w-[220px]">
                                {student.last_name} {student.first_name}
                              </div>
                              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5 mt-0.5">
                                <span className="font-mono">{student.student_id}</span>
                                {student.email && (
                                  <>
                                    <span>•</span>
                                    <span className="truncate max-w-[120px]">{student.email}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="font-bold">DOB:</span>
                              <span>{student.date_of_birth || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="font-bold">Gender:</span>
                              <span className="capitalize">{student.gender || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <Badge variant="secondary" className="font-semibold text-xs">
                            {student.classes?.name || 'Unassigned'}
                          </Badge>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <SectionBadge section={studentSections[student.id] || null} size="sm" />
                            <button
                              onClick={() => setReassignModal({ student, open: true })}
                              className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded transition-colors"
                              title="Change Section"
                            >
                              <Shuffle className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-center whitespace-nowrap">
                          <Badge variant={statusBadgeVariant(student.status)} className="font-bold text-[10px] uppercase">
                            {student.status || 'Active'}
                          </Badge>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link 
                              href={`/admin/students/${student.id}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                            {student.status !== 'active' && (
                              <button
                                onClick={() => setReactivateModal({ student })}
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-lg transition-colors"
                                title="Re-activate student"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition-colors"
                              title="Delete Student"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {students.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400 space-y-2">
                  <Users className="w-9 h-9 mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="font-bold text-sm">No students found</p>
                  <p className="text-xs">Adjust your search or filter settings to view records.</p>
                </div>
              )}
            </div>
            
            {/* Responsive Pagination */}
            <div className="p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-gray-800 dark:text-gray-200">{students.length}</span> of <span className="font-bold text-gray-800 dark:text-gray-200">{totalCount}</span> students
              </div>
              <div className="flex items-center gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Previous
                </button>
                <span className="text-xs font-bold text-gray-400 px-1">{page}</span>
                <button 
                  disabled={students.length < PAGE_SIZE}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors text-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Section Reassign Modal - Bottom Drawer on Phone, Centered on Tablet/Desktop */}
      {reassignModal?.open && reassignModal.student && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-xl shrink-0">
                  <Shuffle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">Change Section</h3>
                  <p className="text-xs text-gray-500">
                    {reassignModal.student.first_name} {reassignModal.student.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassignModal(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Select New Section
              </label>
              <SectionSelector
                value={studentSections[reassignModal.student.id]?.id || ''}
                onChange={(sectionId) => {
                  handleReassignSection(reassignModal.student.id, sectionId)
                }}
              />
              {reassigning && (
                <p className="text-xs text-purple-600 flex items-center gap-2 font-semibold">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Reassigning...
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setReassignModal(null)}
                disabled={reassigning}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Re-activate Confirmation Modal */}
      {reactivateModal.student && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] flex flex-col overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl shrink-0">
                <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Re-activate Student</h3>
                <p className="text-xs text-gray-500">
                  {reactivateModal.student.first_name} {reactivateModal.student.last_name}
                </p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
              This student is currently marked as <span className="font-bold capitalize">{reactivateModal.student.status}</span>. Re-activating will move them back to <span className="font-bold text-emerald-600">active</span>.
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 rounded-xl p-3 mb-4">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  All historical records are preserved. If previously graduated, the completion timestamp is cleared so they can be placed in a current class.
                </span>
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setReactivateModal({ student: null })}
                disabled={reactivating}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Re-activating...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Confirm Re-activation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}