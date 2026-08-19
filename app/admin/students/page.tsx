'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Users, Search, Filter, Edit, Trash2, ArrowLeft, Plus, Check, AlertCircle, ChevronLeft, ChevronRight, Palette, Shuffle, X, RotateCcw, Loader2 } from 'lucide-react'
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

// Status filter tabs shown above the student list.
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

  // Re-activate modal (for transferred / inactive / graduated students)
  const [reactivateModal, setReactivateModal] = useState<{ student: any | null }>({ student: null })
  const [reactivating, setReactivating] = useState(false)

  // Student section data cache
  const [studentSections, setStudentSections] = useState<Record<string, any>>({})

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Initial load for classes and sections
  useEffect(() => {
    loadClasses()
    loadSections()
  }, [])

    // Debounced load for students
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

                // Apply filters
    if (classFilter !== 'all') {
      query = query.eq('class_id', classFilter)
    }

        if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

        if (sectionFilter !== 'all') {
      // Filter by section via student_sections join
      const { data: sectionData } = await supabase
        .from('student_sections')
        .select('student_id')
        .eq('section_id', sectionFilter)
      const sectionStudentIds = (sectionData || []).map((s: { student_id: string }) => s.student_id)
      query = query.in('id', sectionStudentIds)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      // Note: searching across multiple columns with OR
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%,middle_name.ilike.%${term}%`)
    }

    // Apply pagination
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1
    
    const { data: studentsData, count } = await query.range(from, to)

    if (studentsData) {
      setStudents(studentsData)
      setTotalCount(count || 0)
      // Load section info for these students
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
      loadStudents() // Reload list
    } catch (error) {
      console.error('Error deleting student:', error)
      toast.error('Failed to delete student')
    }
  }

  // Re-activate a previously transferred/inactive/graduated student. This is a soft
  // re-enrolment: ALL historical scores, remarks, and promotion records are preserved.
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

    // Helper to render a status badge with the right colour per status.
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
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen p-8 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="space-y-4">
             {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    )
  }

    return (
    <>
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <PageHeader 
          title="Student Management" 
          description="View and manage all students in the system."
        >
            <div className="flex items-center gap-3">
              <button
                  onClick={() => router.back()}
                  className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
              </button>
              <Link
                  href="/admin/students/add"
                  className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                  <Plus className="w-4 h-4" />
                  <span>Add Student</span>
              </Link>
            </div>
        </PageHeader>
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-auto flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap gap-3">
                <div className="relative w-full sm:w-auto min-w-[180px]">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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

                                {/* Section Filter */}
                <div className="relative w-full sm:w-auto min-w-[180px]">
                  <Palette className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <select
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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

            {/* Status Filter Tabs */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-4">
              {STATUS_TABS.map((tab) => {
                const isActive = statusFilter === tab.value
                const isNonActive = tab.value !== 'all' && tab.value !== 'active'
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => { setStatusFilter(tab.value); setPage(1) }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : isNonActive
                          ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/30'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            
            {/* Mobile View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {students.map((student) => (
                <div key={student.id} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm uppercase">
                        {student.first_name[0]}{student.last_name[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {student.last_name} {student.first_name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                           {student.student_id}
                        </div>
                      </div>
                    </div>
                    <Badge variant={student.status === 'active' ? 'success' : 'secondary'}>
                        {student.status || 'Active'}
                    </Badge>
                  </div>
                  
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      <span className="block font-medium mb-1">Class</span>
                      <Badge variant="secondary" className="font-medium bg-white dark:bg-gray-800">
                        {student.classes?.name || 'Unassigned'}
                      </Badge>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      <span className="block font-medium mb-1">Section</span>
                      <div className="flex items-center gap-1">
                        <SectionBadge section={studentSections[student.id] || null} size="sm" />
                        <button
                          onClick={() => setReassignModal({ student, open: true })}
                          className="p-0.5 text-gray-400 hover:text-purple-600"
                          title="Change Section"
                        >
                          <Shuffle className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                      <span className="block font-medium mb-1">Gender</span>
                      <span className="capitalize">{student.gender || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                     <span className="text-xs text-gray-400 truncate max-w-[150px]">{student.email || 'No Email'}</span>
                                          <div className="flex items-center gap-2">
                          <Link 
                              href={`/admin/students/${student.id}`}
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-md transition-colors text-xs font-medium px-3"
                          >
                              View
                          </Link>
                          {student.status !== 'active' && (
                            <button
                              onClick={() => setReactivateModal({ student })}
                              className="p-1.5 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 rounded-md transition-colors"
                              title="Re-activate student"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                              onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                              className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 rounded-md transition-colors"
                          >
                              <Trash2 className="w-4 h-4" />
                          </button>
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-900 dark:text-gray-300 border-b dark:border-gray-700">
                                    <tr>
                    <th scope="col" className="px-6 py-3 font-semibold">Student Info</th>
                    <th scope="col" className="px-6 py-3 font-semibold hidden md:table-cell">Details</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Class</th>
                    <th scope="col" className="px-6 py-3 font-semibold">Section</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-center">Status</th>
                    <th scope="col" className="px-6 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {students.map((student) => (
                    <tr key={student.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                            {student.first_name[0]}{student.last_name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {student.last_name} {student.first_name}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center text-xs text-gray-500 dark:text-gray-400 sm:gap-2">
                               <span>{student.student_id}</span>
                               <span className="hidden sm:inline">•</span>
                               <span className="truncate max-w-[150px]">{student.email || 'No Email'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                              <div className="flex items-center gap-1">
                                  <span className="font-medium">DOB:</span>
                                  <span>{student.date_of_birth || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                  <span className="font-medium">Gender:</span>
                                  <span className="capitalize">{student.gender || 'N/A'}</span>
                              </div>
                          </div>
                      </td>
                                            <td className="px-6 py-4">
                        <Badge variant="secondary" className="font-medium">
                          {student.classes?.name || 'Unassigned'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
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
                      <td className="px-6 py-4 text-center">
                          <Badge variant={statusBadgeVariant(student.status)}>
                            {student.status || 'Active'}
                          </Badge>
                      </td>
                                          <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                              href={`/admin/students/${student.id}`}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/40 dark:text-gray-400 dark:hover:text-blue-400 rounded-md transition-colors"
                              title="View Details"
                          >
                              <Edit className="w-4 h-4" />
                          </Link>
                          {student.status !== 'active' && (
                            <button
                              onClick={() => setReactivateModal({ student })}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-md transition-colors"
                              title="Re-activate student (keeps historical records)"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                          <button
                              onClick={() => handleDeleteStudent(student.id, student.profile_id)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/40 dark:text-gray-400 dark:hover:text-red-400 rounded-md transition-colors"
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

            {/* Empty State - Now outside the hidden md:block div so it shows everywhere */}
            {students.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                    <p>No students found matching your criteria.</p>
                </div>
            )}
          </div>
          
          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between">
               <div className="text-sm text-gray-500 dark:text-gray-400">
                   Showing {students.length} of {totalCount} students
               </div>
               <div className="flex gap-2">
                   <button 
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-300"
                   >
                       Previous
                   </button>
                   <button 
                      disabled={students.length < PAGE_SIZE}
                      onClick={() => setPage(p => p + 1)}
                      className="px-3 py-1 border border-gray-200 dark:border-gray-700 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors text-gray-700 dark:text-gray-300"
                   >
                       Next
                   </button>
               </div>
          </div>
                </Card>
      </div>
    </div>

                        {/* Section Reassign Modal */}
      {reassignModal?.open && reassignModal.student && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                  <Shuffle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Change Section</h3>
                  <p className="text-sm text-gray-500">
                    {reassignModal.student.first_name} {reassignModal.student.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassignModal(null)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select New Section
              </label>
              <SectionSelector
                value={studentSections[reassignModal.student.id]?.id || ''}
                onChange={(sectionId, section) => {
                  handleReassignSection(reassignModal.student.id, sectionId)
                }}
              />
              {reassigning && (
                <p className="text-xs text-purple-600 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                  Reassigning...
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setReassignModal(null)}
                disabled={reassigning}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
            )}

      {/* Re-activate Confirmation Modal */}
      {reactivateModal.student && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl p-6 my-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <RotateCcw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Re-activate Student</h3>
                <p className="text-sm text-gray-500">
                  {reactivateModal.student.first_name} {reactivateModal.student.last_name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              This student is currently marked as{' '}
              <span className="font-semibold capitalize">{reactivateModal.student.status}</span>. Re-activating will move
              them back to the <span className="font-semibold">active</span> status.
            </p>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-2">
              <p className="text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>All historical scores, remarks, and promotion records are preserved.</strong> The student will
                  reappear in the active roster. If the student was marked graduated, the graduation date is cleared so they
                  can be reassigned to a current class.
                </span>
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setReactivateModal({ student: null })}
                disabled={reactivating}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                         bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                         rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReactivate}
                disabled={reactivating}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 
                         rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {reactivating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Reactivating...
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
    </>
  )
}
