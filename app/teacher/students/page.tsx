'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Users,
  Search,
  GraduationCap,
  AlertCircle,
  Filter,
  Grid,
  List,
  Edit,
  TrendingUp,
  Phone,
  Mail,
  KeyRound,
  CheckSquare,
  Square,
  ArrowUpDown,
  Download,
  Shuffle,
  X,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { SectionBadge } from '@/components/sections/SectionBadge'

const PAGE_SIZE = 24

interface Student {
  id: string
  student_id: string
  first_name: string
  last_name: string
  middle_name?: string
  gender?: string
  date_of_birth?: string
  class_id: string
  guardian_name?: string
  guardian_phone?: string
  guardian_email?: string
  status?: string
  classes?: {
    id?: string
    name?: string
  }
  profiles?: {
    username?: string
    email?: string
  }
}

function StudentCard({
  student,
  canManage,
  onEdit,
  onResetPassword,
  onStatusChange,
  selected,
  selectionMode,
  onSelect,
  studentSection,
  onChangeSection
}: {
  student: Student
  canManage: boolean
  onEdit: () => void
  onResetPassword: () => void
  onStatusChange: () => void
  selected: boolean
  selectionMode: boolean
  onSelect: () => void
  studentSection: any
  onChangeSection: () => void
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)
  const [offset, setOffset] = useState(0)
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null)
  const [isLongPress, setIsLongPress] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const minSwipeDistance = 50
  const dragThreshold = 10

  const onTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return

    setTouchStart(e.targetTouches[0].clientX)
    setTouchStartY(e.targetTouches[0].clientY)
    setIsLongPress(false)
    setIsDragging(false)

    const timer = setTimeout(() => {
      if (canManage) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(50)
          } catch {}
        }
        setIsLongPress(true)
        onSelect()
      }
    }, 500)
    setLongPressTimer(timer)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null || touchStartY === null) return

    const currentX = e.targetTouches[0].clientX
    const currentY = e.targetTouches[0].clientY
    const deltaX = currentX - touchStart
    const deltaY = currentY - touchStartY

    if (Math.abs(deltaY) > Math.abs(deltaX)) return

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        setLongPressTimer(null)
      }
    }

    if (!selectionMode && canManage) {
      if (Math.abs(deltaX) < dragThreshold) return
      setIsDragging(true)

      if (deltaX < -110) setOffset(-110)
      else if (deltaX > 110) setOffset(110)
      else setOffset(deltaX)
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return

    setIsDragging(false)

    if (longPressTimer) {
      clearTimeout(longPressTimer)
      setLongPressTimer(null)
    }

    if (isLongPress) {
      setIsLongPress(false)
      setTouchStart(null)
      setTouchStartY(null)
      return
    }

    if (touchStart === null || touchStartY === null) {
      setTouchStart(null)
      setTouchStartY(null)
      return
    }

    const currentX = e.changedTouches[0].clientX
    const currentY = e.changedTouches[0].clientY
    const deltaX = Math.abs(currentX - touchStart)
    const deltaY = Math.abs(currentY - touchStartY)

    if (deltaX < dragThreshold && deltaY < dragThreshold) {
      if (offset === 0 && canManage) {
        if (selectionMode) {
          onSelect()
        } else {
          onEdit()
        }
      } else {
        setOffset(0)
      }
    } else if (!selectionMode && canManage && deltaX > deltaY && deltaX > minSwipeDistance) {
      const signedDistance = touchStart - currentX
      if (signedDistance > minSwipeDistance) {
        setOffset(-100)
      } else if (signedDistance < -minSwipeDistance) {
        setOffset(100)
      } else {
        setOffset(0)
      }
    } else {
      setOffset(0)
    }

    setTouchStart(null)
    setTouchStartY(null)
  }

  const onClick = (e: React.MouseEvent) => {
    if (canManage) {
      if (e.ctrlKey || e.metaKey || selectionMode) {
        onSelect()
      } else if (offset === 0) {
        onEdit()
      } else {
        setOffset(0)
      }
    }
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 h-full select-none transition-all duration-200 group hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 ${
        selected ? 'ring-2 ring-[#003B5C] bg-[#003B5C]/5 dark:bg-[#003B5C]/20' : 'bg-white dark:bg-gray-800'
      }`}
    >
      {/* Background Swipe Actions */}
      <div className="absolute inset-0 flex items-center justify-between pointer-events-none">
        <div
          className={`flex items-center justify-start w-full h-full bg-amber-100 dark:bg-amber-950/60 absolute left-0 top-0 transition-opacity duration-200 ${
            offset > 0 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10'
          }`}
        >
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onResetPassword()
              setOffset(0)
            }}
            className="pl-5 pr-4 h-full flex items-center space-x-2 text-amber-800 dark:text-amber-300 font-bold text-xs"
          >
            <KeyRound className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        <div
          className={`flex items-center justify-end w-full h-full bg-purple-100 dark:bg-purple-950/60 absolute right-0 top-0 transition-opacity duration-200 ${
            offset < 0 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 -z-10'
          }`}
        >
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              onStatusChange()
              setOffset(0)
            }}
            className="pl-4 pr-5 h-full flex items-center justify-end space-x-2 text-purple-800 dark:text-purple-300 font-bold text-xs"
          >
            <span>Status</span>
            <TrendingUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Foreground */}
      <div
        className={`p-4 sm:p-5 relative z-20 h-full flex flex-col justify-between bg-white dark:bg-gray-800 ${
          canManage ? 'cursor-pointer' : ''
        } ${selected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''} ${
          isDragging ? 'transition-none' : 'transition-transform duration-200 ease-out'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
        onTouchStart={canManage ? onTouchStart : undefined}
        onTouchMove={canManage ? onTouchMove : undefined}
        onTouchEnd={canManage ? onTouchEnd : undefined}
        onClick={onClick}
      >
        <div>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 p-2.5 sm:p-3 rounded-2xl shrink-0">
                <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                  {student.last_name} {student.first_name} {student.middle_name || ''}
                </h3>
                <p className="text-[11px] sm:text-xs text-gray-400 font-mono mt-0.5">{student.student_id}</p>
              </div>
            </div>

            {selectionMode ? (
              <div className="shrink-0 p-1">
                {selected ? (
                  <CheckSquare className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                ) : (
                  <Square className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                )}
              </div>
            ) : (
              canManage && (
                <div className="hidden sm:flex items-center space-x-1 shrink-0">
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      onResetPassword()
                    }}
                    className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                    title="Reset Password"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      onStatusChange()
                    }}
                    className="p-1.5 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                    title="Change Status"
                  >
                    <TrendingUp className="w-4 h-4" />
                  </button>
                </div>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
            <span className="inline-flex px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
              {student.classes?.name || 'No Class'}
            </span>

            {studentSection ? (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold border"
                style={{
                  backgroundColor: (studentSection.colour || '#003B5C') + '15',
                  color: studentSection.colour || '#003B5C',
                  borderColor: (studentSection.colour || '#003B5C') + '35'
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: studentSection.colour || '#003B5C' }}
                />
                {studentSection.name}
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/60 px-2 py-0.5 rounded-lg">
                No Section
              </span>
            )}

            {canManage && (
              <button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation()
                  onChangeSection()
                }}
                className="p-1 text-gray-400 hover:text-[#003B5C] dark:hover:text-blue-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                title="Change Section"
              >
                <Shuffle className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-50/60 dark:bg-gray-900/40 p-2.5 rounded-xl">
          {student.guardian_name && (
            <p className="truncate text-gray-700 dark:text-gray-300">
              <span className="font-semibold text-gray-400 dark:text-gray-500 text-[11px] uppercase mr-1">Guardian:</span>
              {student.guardian_name}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 pt-0.5">
            {student.guardian_phone && (
              <a
                href={`tel:${student.guardian_phone}`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                className="inline-flex items-center space-x-1 text-[#003B5C] dark:text-blue-400 hover:underline font-mono text-xs"
              >
                <Phone className="w-3 h-3 shrink-0" />
                <span>{student.guardian_phone}</span>
              </a>
            )}
            {student.guardian_email && (
              <div className="inline-flex items-center space-x-1 text-gray-400 truncate max-w-[140px]">
                <Mail className="w-3 h-3 shrink-0" />
                <span className="truncate">{student.guardian_email}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MyStudentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [teacherClasses, setTeacherClasses] = useState<any[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClass, setSelectedClass] = useState('all')
  const [sortBy, setSortBy] = useState('name_asc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [statusModal, setStatusModal] = useState<{ show: boolean; student: Student | null }>({ show: false, student: null })
  const [statusPending, setStatusPending] = useState<string>('')
  const [statusUpdating, setStatusUpdating] = useState(false)

  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetPasswordModal, setResetPasswordModal] = useState<{ show: boolean; student: Student | null }>({
    show: false,
    student: null
  })

  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkStatusModal, setBulkStatusModal] = useState(false)
  const [bulkStatusPending, setBulkStatusPending] = useState<string>('')
  const [bulkStatusUpdating, setBulkStatusUpdating] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkResetPasswordModal, setBulkResetPasswordModal] = useState(false)
  const [bulkResetting, setBulkResetting] = useState(false)

  const [sections, setSections] = useState<any[]>([])
  const [studentSections, setStudentSections] = useState<Record<string, any>>({})
  const [reassignModal, setReassignModal] = useState<{ open: boolean; student: Student | null }>({ open: false, student: null })
  const [reassigning, setReassigning] = useState(false)

  useEffect(() => {
    async function loadMetadata() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        if (teacherError || !teacherData) {
          setError('Teacher profile not found')
          setInitialLoading(false)
          return
        }

        const classAccess = await getTeacherClassAccess(teacherData.profile_id)
        setTeacherClasses(classAccess)

        const { data: sectionsData } = await supabase
          .from('sections')
          .select('id, name, colour, emblem_url')
          .eq('is_active', true)
          .order('sort_order')

        if (sectionsData) setSections(sectionsData)
      } catch (err: any) {
        console.error('Initial metadata error:', err)
        setError('An unexpected error occurred')
      } finally {
        setInitialLoading(false)
      }
    }

    loadMetadata()
  }, [router, supabase])

  const fetchStudents = useCallback(async () => {
    if (teacherClasses.length === 0) {
      setStudents([])
      setTotalCount(0)
      return
    }

    setStudentsLoading(true)
    try {
      const classIds = teacherClasses.map((c: any) => c.class_id)

      let query = supabase
        .from('students')
        .select(`
          *,
          classes(id, name),
          profiles(username)
        `, { count: 'exact' })
        .eq('status', 'active')

      if (selectedClass === 'all') {
        query = query.in('class_id', classIds)
      } else {
        query = query.eq('class_id', selectedClass)
      }

      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase()
        query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%,middle_name.ilike.%${term}%`)
      }

      if (sortBy === 'name_asc') {
        query = query.order('last_name', { ascending: true }).order('first_name', { ascending: true })
      } else if (sortBy === 'name_desc') {
        query = query.order('last_name', { ascending: false }).order('first_name', { ascending: false })
      } else if (sortBy === 'id_asc') {
        query = query.order('student_id', { ascending: true })
      } else if (sortBy === 'id_desc') {
        query = query.order('student_id', { ascending: false })
      } else if (sortBy === 'gender_male') {
        query = query.order('gender', { ascending: false }).order('last_name', { ascending: true })
      } else if (sortBy === 'gender_female') {
        query = query.order('gender', { ascending: true }).order('last_name', { ascending: true })
      }

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, count, error: studentsError } = await query.range(from, to)

      if (studentsError) throw studentsError

      const loadedStudents: Student[] = (data || []) as Student[]
      setStudents(loadedStudents)
      setTotalCount(count || 0)

      if (loadedStudents.length > 0) {
        const pageStudentIds = loadedStudents.map((s: Student) => s.id)
        const { data: ssData } = await supabase
          .from('student_sections')
          .select('student_id, section_id, sections(id, name, colour, emblem_url)')
          .in('student_id', pageStudentIds)

        if (ssData) {
          const sectionMap: Record<string, any> = {}
          ssData.forEach((ss: any) => {
            sectionMap[ss.student_id] = ss.sections || null
          })
          setStudentSections((prev) => ({ ...prev, ...sectionMap }))
        }
      }
    } catch (err: any) {
      console.error('Error loading paginated students:', err)
      toast.error('Failed to load students')
    } finally {
      setStudentsLoading(false)
    }
  }, [supabase, teacherClasses, selectedClass, searchTerm, sortBy, page])

  useEffect(() => {
    if (initialLoading) return

    const timer = setTimeout(() => {
      fetchStudents()
    }, 250)

    return () => clearTimeout(timer)
  }, [fetchStudents, initialLoading])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  const toggleSelection = (studentId: string) => {
    if (selectedStudents.includes(studentId)) {
      const newSelected = selectedStudents.filter((id: string) => id !== studentId)
      setSelectedStudents(newSelected)
      if (newSelected.length === 0) setSelectionMode(false)
    } else {
      setSelectedStudents([...selectedStudents, studentId])
      setSelectionMode(true)
    }
  }

  const toggleSelectAll = () => {
    const currentPageIds = students.map((s: Student) => s.id)
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id: string) => selectedStudents.includes(id))

    if (allSelected) {
      setSelectedStudents((prev: string[]) => prev.filter((id: string) => !currentPageIds.includes(id)))
      if (selectedStudents.length <= currentPageIds.length) setSelectionMode(false)
    } else {
      setSelectedStudents((prev: string[]) => Array.from(new Set([...prev, ...currentPageIds])))
      setSelectionMode(true)
    }
  }

  const canManageStudentsInClass = (classId: string) => {
    if (classId === 'all') {
      return teacherClasses.some((c: any) => c.is_class_teacher)
    }
    const classAccess = teacherClasses.find((c: any) => c.class_id === classId)
    return classAccess?.is_class_teacher || false
  }

  const isClassTeacher = canManageStudentsInClass(selectedClass)

  function getResetCredentials(student: Student | null) {
    if (!student) return { username: '', password: '' }

    const sanitizedFirst = (student.first_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const sanitizedLast = (student.last_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

    const firstPart = sanitizedFirst.substring(0, 3)
    const lastPart = sanitizedLast.substring(Math.max(0, sanitizedLast.length - 3))
    let newUsername = `${firstPart}${lastPart}`.toLowerCase()

    if (newUsername.length < 3) {
      newUsername = (sanitizedFirst + sanitizedLast).substring(0, 6).toLowerCase()
    }

    let newPassword = 'Student123!'
    if (student.date_of_birth) {
      const parts = student.date_of_birth.split('-')
      if (parts.length === 3) {
        const [year, month, day] = parts
        newPassword = `${day}-${month}-${year}`
      }
    }

    return { username: newUsername, password: newPassword }
  }

  const handleExportLogins = async () => {
    try {
      let exportList: any[] = []

      if (selectedStudents.length > 0) {
        exportList = students.filter((s: Student) => selectedStudents.includes(s.id))
      } else {
        toast.loading('Preparing export...', { id: 'export-loading' })
        const classIds = teacherClasses.map((c: any) => c.class_id)
        let query = supabase
          .from('students')
          .select(`
            last_name, first_name, student_id, date_of_birth,
            classes(name),
            profiles(username)
          `)
          .eq('status', 'active')
          .limit(1000)

        if (selectedClass === 'all') {
          query = query.in('class_id', classIds)
        } else {
          query = query.eq('class_id', selectedClass)
        }

        if (searchTerm.trim()) {
          const term = searchTerm.trim().toLowerCase()
          query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%`)
        }

        const { data, error } = await query
        toast.dismiss('export-loading')
        if (error || !data) throw new Error('Failed to retrieve full export list')
        exportList = data
      }

      if (exportList.length === 0) {
        toast.error('No students to export')
        return
      }

      const headers = ['Name', 'Student ID', 'Class', 'Username', 'Default Password']
      const csvContent = [
        headers.join(','),
        ...exportList.map((student: any) => {
          const { username: fallbackUsername, password } = getResetCredentials(student)
          const username = student.profiles?.username || fallbackUsername
          return [
            `"${student.last_name || ''} ${student.first_name || ''}"`,
            `"${student.student_id || ''}"`,
            `"${student.classes?.name || '-'}"`,
            `"${username}"`,
            `"${password}"`
          ].join(',')
        })
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `student_logins_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${exportList.length} student logins!`)
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    }
  }

  async function handleResetPassword() {
    if (!resetPasswordModal.student) return

    setResetting(true)
    setResetSuccess(false)
    try {
      const student = resetPasswordModal.student
      const { username: newUsername, password: newPassword } = getResetCredentials(student)

      const { data: studentData, error: studentError } = (await supabase
        .from('students')
        .select('profile_id, profiles(email)')
        .eq('id', student.id)
        .single()) as { data: any; error: any }

      if (studentError || !studentData?.profile_id) {
        throw new Error('Student profile not found')
      }

      const {
        data: { user }
      } = await supabase.auth.getUser()

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: studentData.profile_id,
          newPassword: newPassword,
          newUsername: newUsername,
          requesterId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset password')
      }

      setResetSuccess(true)
      toast.success('Password reset successfully')
      setTimeout(() => {
        setResetPasswordModal({ show: false, student: null })
        setResetSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      toast.error(`Failed to reset password: ${err.message}`)
    } finally {
      setResetting(false)
    }
  }

  async function handleStatusChange() {
    if (!statusModal.student || !statusPending) return

    setStatusUpdating(true)
    try {
      const { error } = await supabase.from('students').update({ status: statusPending }).eq('id', statusModal.student.id)

      if (error) throw error

      toast.success(`Student marked as ${statusPending}`)
      setStatusModal({ show: false, student: null })
      setStatusPending('')
      fetchStudents()
    } catch (err: any) {
      toast.error('Failed to update student status: ' + err.message)
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleBulkStatusChange() {
    if (selectedStudents.length === 0 || !bulkStatusPending) return

    setBulkStatusUpdating(true)
    try {
      const { error } = await supabase.from('students').update({ status: bulkStatusPending }).in('id', selectedStudents)

      if (error) throw error

      toast.success(`Selected students marked as ${bulkStatusPending}`)
      setSelectedStudents([])
      setBulkStatusModal(false)
      setBulkStatusPending('')
      fetchStudents()
    } catch (err: any) {
      toast.error('Failed to update students: ' + err.message)
    } finally {
      setBulkStatusUpdating(false)
    }
  }

  async function handleBulkResetPassword() {
    if (selectedStudents.length === 0) return

    setBulkResetting(true)
    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      const studentsToReset = students.filter((s: Student) => selectedStudents.includes(s.id))

      let successCount = 0
      let failCount = 0

      for (const student of studentsToReset) {
        try {
          const { username: newUsername, password: newPassword } = getResetCredentials(student)

          const { data: studentData, error: studentError } = await supabase
            .from('students')
            .select('profile_id')
            .eq('id', student.id)
            .single()

          if (studentError || !studentData?.profile_id) {
            failCount++
            continue
          }

          const response = await fetch('/api/admin/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: studentData.profile_id,
              newPassword: newPassword,
              newUsername: newUsername,
              requesterId: user?.id
            })
          })

          if (response.ok) successCount++
          else failCount++
        } catch {
          failCount++
        }
      }

      toast.success(`Password reset complete.\nSuccessful: ${successCount}\nFailed: ${failCount}`, { duration: 5000 })
      setSelectedStudents([])
      setSelectionMode(false)
      setBulkResetPasswordModal(false)
    } catch (err: any) {
      toast.error('Failed to reset passwords: ' + err.message)
    } finally {
      setBulkResetting(false)
    }
  }

  async function handleReassignSection(studentId: string, sectionId: string) {
    setReassigning(true)
    try {
      const { error } = await supabase
        .from('student_sections')
        .upsert({ student_id: studentId, section_id: sectionId }, { onConflict: 'student_id' })

      if (error) throw error

      toast.success('Section reassigned successfully')
      const newSection = sections.find((s: any) => s.id === sectionId)
      setStudentSections((prev) => ({ ...prev, [studentId]: newSection }))
      setReassignModal({ open: false, student: null })
    } catch (error: any) {
      toast.error(error.message || 'Failed to reassign section')
    } finally {
      setReassigning(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <header className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm sticky top-0 z-30">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="w-40 h-6" />
                  <Skeleton className="w-24 h-4" />
                </div>
              </div>
              <Skeleton className="w-28 h-10 rounded-xl" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
          <Skeleton className="w-full h-24 rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="w-full h-48 rounded-2xl" />
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-3.5 sm:py-4">
          {selectionMode ? (
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  onClick={() => {
                    setSelectionMode(false)
                    setSelectedStudents([])
                  }}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <span className="font-bold text-sm sm:text-base text-[#003B5C] dark:text-blue-400 truncate">
                  {selectedStudents.length} Selected
                </span>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {selectedStudents.length > 0 && (
                  <>
                    <button
                      onClick={handleExportLogins}
                      className="p-2 text-[#003B5C] dark:text-blue-400 hover:bg-[#003B5C]/10 rounded-xl transition"
                      title="Download Logins"
                    >
                      <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setBulkResetPasswordModal(true)}
                      className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition"
                      title="Reset Passwords"
                    >
                      <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button
                      onClick={() => setBulkStatusModal(true)}
                      className="p-2 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition"
                      title="Change Status"
                    >
                      <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 sm:gap-4">
              <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
                <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <Users className="w-6 h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                    <span>My Students</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {isClassTeacher
                      ? 'View and manage enrolled learners in your classes'
                      : 'View active rosters in your assigned classes'}
                  </p>
                </div>
              </div>

              {isClassTeacher && (
                <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={handleExportLogins}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white dark:bg-gray-800 text-[#003B5C] dark:text-blue-400 border border-gray-200 dark:border-gray-700 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition active:scale-95 whitespace-nowrap"
                  >
                    <Download className="w-4 h-4 shrink-0" />
                    <span>Export Logins</span>
                  </button>
                  <Link
                    href="/teacher/students/add"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl font-bold text-xs sm:text-sm shadow-md transition active:scale-95 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>Add Student</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {teacherClasses.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 sm:p-8 text-center space-y-3">
            <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto" />
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">No Classes Assigned</h2>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              You are not currently assigned to teach or manage any classes. Please contact your system administrator.
            </p>
            <Link
              href="/teacher/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#003B5C] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-[#002a42] transition"
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {teacherClasses.length > 0 && (
          <>
            {/* Search, Filter & Controls Toolbar */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-3 sm:p-4 md:p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="relative sm:col-span-2 md:col-span-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search name or ID..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSearchTerm(e.target.value)
                      setPage(1)
                    }}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-[#003B5C] outline-none text-xs sm:text-sm font-medium transition"
                  />
                </div>

                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={selectedClass}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setSelectedClass(e.target.value)
                      setPage(1)
                    }}
                    className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] outline-none text-xs sm:text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="all">All Classes</option>
                    {teacherClasses.map((cls: any) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                </div>

                <div className="relative">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      setSortBy(e.target.value)
                      setPage(1)
                    }}
                    className="w-full pl-9 pr-8 py-2 sm:py-2.5 bg-gray-50/80 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl focus:ring-2 focus:ring-[#003B5C] outline-none text-xs sm:text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="name_asc">Name (A-Z)</option>
                    <option value="name_desc">Name (Z-A)</option>
                    <option value="id_asc">Student ID (Asc)</option>
                    <option value="id_desc">Student ID (Desc)</option>
                    <option value="gender_male">Gender (Boys First)</option>
                    <option value="gender_female">Gender (Girls First)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Showing <span className="font-bold text-gray-900 dark:text-white">{students.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0}</span> to{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{Math.min(page * PAGE_SIZE, totalCount)}</span> of{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{totalCount}</span> learners
                </p>

                <div className="flex items-center gap-1.5">
                  <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center gap-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        viewMode === 'grid'
                          ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                      title="Grid View"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Grid</span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                        viewMode === 'list'
                          ? 'bg-white dark:bg-gray-700 text-[#003B5C] dark:text-blue-300 shadow-sm'
                          : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">List</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {selectionMode && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center space-x-2 text-xs font-bold text-gray-700 dark:text-gray-300"
                >
                  {students.every((s: Student) => selectedStudents.includes(s.id)) && students.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Select All Page ({students.length})</span>
                </button>
                <span className="text-xs text-gray-400 font-medium">Click items to toggle</span>
              </div>
            )}

            <div className={`relative transition-opacity duration-200 ${studentsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
              {students.length > 0 ? (
                viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5">
                    {students.map((student: Student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        canManage={canManageStudentsInClass(student.class_id)}
                        onEdit={() => router.push(`/teacher/students/edit/${student.id}`)}
                        onResetPassword={() => setResetPasswordModal({ show: true, student })}
                        onStatusChange={() => setStatusModal({ show: true, student })}
                        selected={selectedStudents.includes(student.id)}
                        selectionMode={selectionMode}
                        onSelect={() => toggleSelection(student.id)}
                        studentSection={studentSections[student.id] || null}
                        onChangeSection={() => setReassignModal({ open: true, student })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-gray-50/80 dark:bg-gray-900/60 border-b border-gray-200 dark:border-gray-700 text-[11px] font-black text-gray-400 uppercase tracking-wider">
                            {isClassTeacher && (
                              <th className="p-3 sm:p-4 w-10 text-center">
                                <button onClick={toggleSelectAll} className="flex items-center justify-center">
                                  {students.every((s: Student) => selectedStudents.includes(s.id)) && students.length > 0 ? (
                                    <CheckSquare className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-400" />
                                  )}
                                </button>
                              </th>
                            )}
                            <th className="p-3 sm:p-4">Student</th>
                            <th className="p-3 sm:p-4">Class</th>
                            <th className="p-3 sm:p-4">Section</th>
                            <th className="p-3 sm:p-4 hidden md:table-cell">Guardian</th>
                            <th className="p-3 sm:p-4 hidden lg:table-cell">Contact</th>
                            <th className="p-3 sm:p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-750 text-xs sm:text-sm font-medium">
                          {students.map((student: Student) => (
                            <tr
                              key={student.id}
                              className={`hover:bg-gray-50/70 dark:hover:bg-gray-750/50 transition ${
                                selectedStudents.includes(student.id) ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                              }`}
                            >
                              {isClassTeacher && (
                                <td className="p-3 sm:p-4 text-center">
                                  {canManageStudentsInClass(student.class_id) ? (
                                    <button onClick={() => toggleSelection(student.id)}>
                                      {selectedStudents.includes(student.id) ? (
                                        <CheckSquare className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                                      ) : (
                                        <Square className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                                      )}
                                    </button>
                                  ) : (
                                    <Square className="w-4 h-4 text-gray-200 dark:text-gray-700" />
                                  )}
                                </td>
                              )}
                              <td className="p-3 sm:p-4 whitespace-nowrap">
                                <div className="font-bold text-gray-900 dark:text-white">
                                  {student.last_name} {student.first_name} {student.middle_name || ''}
                                </div>
                                <div className="text-[11px] text-gray-400 font-mono">{student.student_id}</div>
                              </td>
                              <td className="p-3 sm:p-4 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50">
                                  {student.classes?.name || 'No Class'}
                                </span>
                              </td>
                              <td className="p-3 sm:p-4 whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  {studentSections?.[student.id] ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold border"
                                      style={{
                                        backgroundColor: (studentSections[student.id].colour || '#003B5C') + '15',
                                        color: studentSections[student.id].colour || '#003B5C',
                                        borderColor: (studentSections[student.id].colour || '#003B5C') + '35'
                                      }}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full"
                                        style={{ backgroundColor: studentSections[student.id].colour || '#003B5C' }}
                                      />
                                      {studentSections[student.id].name}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">—</span>
                                  )}
                                  {canManageStudentsInClass(student.class_id) && (
                                    <button
                                      onClick={() => setReassignModal({ open: true, student })}
                                      className="p-1 text-gray-400 hover:text-[#003B5C] rounded transition"
                                      title="Change Section"
                                    >
                                      <Shuffle className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 sm:p-4 whitespace-nowrap hidden md:table-cell text-xs text-gray-600 dark:text-gray-300">
                                {student.guardian_name || '—'}
                              </td>
                              <td className="p-3 sm:p-4 whitespace-nowrap hidden lg:table-cell text-xs text-gray-500 font-mono">
                                {student.guardian_phone || '—'}
                              </td>
                              <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                                {canManageStudentsInClass(student.class_id) ? (
                                  <div className="flex items-center justify-end space-x-1">
                                    <Link
                                      href={`/teacher/students/edit/${student.id}`}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition"
                                      title="Edit Profile"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Link>
                                    <button
                                      onClick={() => setResetPasswordModal({ show: true, student })}
                                      className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition"
                                      title="Reset Password"
                                    >
                                      <KeyRound className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setStatusModal({ show: true, student })}
                                      className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition"
                                      title="Change Status"
                                    >
                                      <TrendingUp className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-gray-400 font-medium">View Only</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-10 sm:p-14 text-center space-y-3">
                  <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    {searchTerm || selectedClass !== 'all' ? 'No matching students found' : 'Roster is empty'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                    {searchTerm || selectedClass !== 'all'
                      ? 'Try clearing your search terms or choosing another class.'
                      : 'Add learners to your classroom roster to get started.'}
                  </p>
                  {!searchTerm && selectedClass === 'all' && isClassTeacher && (
                    <Link
                      href="/teacher/students/add"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#003B5C] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:bg-[#002a42] transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add First Student</span>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {totalCount > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-gray-900 dark:text-white">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{Math.min(page * PAGE_SIZE, totalCount)}</span> of{' '}
                  <span className="font-bold text-gray-900 dark:text-white">{totalCount}</span> learners
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                    disabled={page === 1 || studentsLoading}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 px-2">
                    {page} / {totalPages || 1}
                  </span>
                  <button
                    onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || studentsLoading}
                    className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 transition"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Reset Password Modal */}
      {resetPasswordModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-100 dark:bg-amber-950/40 p-2.5 rounded-xl text-amber-700 dark:text-amber-300 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Reset Student Password</h3>
                  <p className="text-xs text-gray-400 font-medium">Default password restore</p>
                </div>
              </div>
              <button
                onClick={() => setResetPasswordModal({ show: false, student: null })}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-6">
                <div className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">Password reset successfully!</p>
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-3 leading-relaxed">
                  Are you sure you want to reset the login credentials for{' '}
                  <strong className="text-gray-900 dark:text-white">
                    {resetPasswordModal.student?.last_name} {resetPasswordModal.student?.first_name}
                  </strong>
                  ?
                </p>
                <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3.5 mb-5 space-y-1 text-xs text-blue-900 dark:text-blue-200">
                  <p>
                    <span className="font-bold">New Username:</span>{' '}
                    {getResetCredentials(resetPasswordModal.student).username}
                  </p>
                  <p>
                    <span className="font-bold">New Password:</span>{' '}
                    {getResetCredentials(resetPasswordModal.student).password}
                  </p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 pt-1">
                    Defaults to student Date of Birth (DD-MM-YYYY).
                  </p>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                  <button
                    onClick={() => setResetPasswordModal({ show: false, student: null })}
                    disabled={resetting}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>Confirm Reset</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 dark:bg-purple-950/40 p-2.5 rounded-xl text-purple-700 dark:text-purple-300 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Change Student Status</h3>
                  <p className="text-xs text-gray-400 font-medium">Archive without deleting marks</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setStatusModal({ show: false, student: null })
                  setStatusPending('')
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Updating status for{' '}
              <strong className="text-gray-900 dark:text-white">
                {statusModal.student?.last_name} {statusModal.student?.first_name}
              </strong>
              . This removes them from your active roster while preserving historical scores.
            </p>

            <div className="space-y-2 mb-5">
              {[
                {
                  value: 'transferred',
                  label: 'Transferred',
                  desc: 'Student moved to another educational institution.',
                  color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30'
                },
                {
                  value: 'inactive',
                  label: 'Inactive',
                  desc: 'Student is absent indefinitely or withdrew.',
                  color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700'
                }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusPending(opt.value)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium transition-all border ${
                    statusPending === opt.value
                      ? 'border-purple-300 bg-purple-50/60 dark:bg-purple-950/30 ring-2 ring-purple-200'
                      : 'border-gray-200 dark:border-gray-700 hover:border-purple-200 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${opt.color}`}>
                      {opt.label}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
                  </div>
                  {statusPending === opt.value && <span className="text-purple-600 font-bold">✓</span>}
                </button>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                onClick={() => {
                  setStatusModal({ show: false, student: null })
                  setStatusPending('')
                }}
                disabled={statusUpdating}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={statusUpdating || !statusPending}
                className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {statusUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    <span>Confirm Status</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Status Change Modal */}
      {bulkStatusModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-purple-100 dark:bg-purple-950/40 p-2.5 rounded-xl text-purple-700 dark:text-purple-300 shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Bulk Status Update</h3>
                  <p className="text-xs text-gray-400 font-medium">{selectedStudents.length} learners selected</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setBulkStatusModal(false)
                  setBulkStatusPending('')
                }}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 mb-5">
              {[
                {
                  value: 'transferred',
                  label: 'Transferred',
                  desc: 'Moved to another school institution.',
                  color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                },
                {
                  value: 'inactive',
                  label: 'Inactive',
                  desc: 'Withdrawn or dropped out indefinitely.',
                  color: 'text-gray-700 bg-gray-100 dark:bg-gray-700'
                }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setBulkStatusPending(opt.value)}
                  className={`w-full flex items-start gap-3 p-3.5 rounded-xl text-left text-xs sm:text-sm font-medium transition-all border ${
                    bulkStatusPending === opt.value
                      ? 'border-purple-300 bg-purple-50/60 ring-2 ring-purple-200'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex-1">
                    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold ${opt.color}`}>
                      {opt.label}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.desc}</p>
                  </div>
                  {bulkStatusPending === opt.value && <span className="text-purple-600 font-bold">✓</span>}
                </button>
              ))}
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                onClick={() => {
                  setBulkStatusModal(false)
                  setBulkStatusPending('')
                }}
                disabled={bulkStatusUpdating}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkStatusChange}
                disabled={bulkStatusUpdating || !bulkStatusPending}
                className="w-full sm:w-auto px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {bulkStatusUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>Apply Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Reset Password Confirmation Modal */}
      {bulkResetPasswordModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center space-x-3 text-amber-600 mb-3.5">
              <div className="bg-amber-100 dark:bg-amber-950/40 p-2.5 rounded-xl shrink-0">
                <KeyRound className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Bulk Password Reset</h3>
                <p className="text-xs text-gray-400 font-medium">{selectedStudents.length} learners selected</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Reset default passwords for all selected students? Credentials will be set to each student&apos;s individual
              Date of Birth (DD-MM-YYYY).
            </p>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
              <button
                onClick={() => setBulkResetPasswordModal(false)}
                disabled={bulkResetting}
                className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkResetPassword}
                disabled={bulkResetting}
                className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {bulkResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Confirm All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section Reassign Modal */}
      {reassignModal.open && reassignModal.student && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-[#003B5C]/10 dark:bg-[#003B5C]/30 text-[#003B5C] dark:text-blue-300 rounded-xl shrink-0">
                  <Shuffle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Change House / Section</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {reassignModal.student.first_name} {reassignModal.student.last_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setReassignModal({ open: false, student: null })}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <label className="block text-xs font-black uppercase text-gray-400 tracking-wider">
                Select Active Section
              </label>

              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {sections.length === 0 ? (
                  <p className="text-xs text-gray-400 italic py-2">No active sections available.</p>
                ) : (
                  sections.map((sec: any) => (
                    <button
                      key={sec.id}
                      onClick={() => handleReassignSection(reassignModal.student?.id || '', sec.id)}
                      disabled={reassigning}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all border text-left ${
                        studentSections[reassignModal.student?.id || '']?.id === sec.id
                          ? 'bg-[#003B5C]/10 border-[#003B5C]/30 text-[#003B5C] dark:bg-[#003B5C]/30 dark:text-blue-200'
                          : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-[#003B5C]/30 text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shadow-sm shrink-0"
                        style={{ backgroundColor: sec.colour }}
                      />
                      <span className="flex-1 truncate">{sec.name}</span>
                      {studentSections[reassignModal.student?.id || '']?.id === sec.id && (
                        <span className="text-[10px] uppercase tracking-wider bg-[#003B5C] text-white px-2 py-0.5 rounded-full font-black">
                          Current
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {reassigning && (
                <p className="text-xs text-[#003B5C] dark:text-blue-400 flex items-center gap-2 font-semibold pt-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Updating house allocation...
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setReassignModal({ open: false, student: null })}
                disabled={reassigning}
                className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}