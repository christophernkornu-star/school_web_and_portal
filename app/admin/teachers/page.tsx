'use client'

import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  GraduationCap,
  Search,
  Plus,
  ArrowLeft,
  Edit,
  Trash2,
  Upload,
  Download,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Award,
  BookOpen,
  X,
  Loader2
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

const PAGE_SIZE = 20

export default function TeachersPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [resetPasswordModal, setResetPasswordModal] = useState<{ show: boolean; teacher: any | null }>({ show: false, teacher: null })
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Debounced load for teachers
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeachers()
    }, 300)
    return () => clearTimeout(timer)
  }, [page, searchTerm, router])

  async function loadTeachers() {
    setLoading(true)
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login')
      return
    }

    let query = supabase
      .from('teachers')
      .select('*', { count: 'exact' })
      .order('first_name')

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,teacher_id.ilike.%${term}%`)
    }

    // Apply pagination
    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Error loading teachers:', error)
    }

    if (data) {
      setTeachers(data)
      setTotalCount(count || 0)
    }
    setLoading(false)
  }

  async function handleResetPassword() {
    if (!resetPasswordModal.teacher) return

    setResetting(true)
    setResetSuccess(false)
    try {
      const teacher = resetPasswordModal.teacher
      const defaultPassword = teacher.teacher_id.padStart(8, '0')

      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('profile_id, profiles(email)')
        .eq('id', teacher.id)
        .single() as { data: any; error: any }

      if (teacherError || !teacherData?.profile_id) {
        throw new Error('Teacher profile not found')
      }

      const { data: { user } } = await supabase.auth.getUser()

      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: teacherData.profile_id,
          newPassword: defaultPassword,
          newUsername: teacher.teacher_id,
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
        setResetPasswordModal({ show: false, teacher: null })
        setResetSuccess(false)
      }, 2000)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      toast.error(`Failed to reset password: ${err.message}`)
    } finally {
      setResetting(false)
    }
  }

  async function handleDeleteTeacher(teacherId: string) {
    if (!confirm('Are you sure you want to delete this teacher? This action cannot be undone. This will also delete their login account.')) {
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const response = await fetch('/api/admin/delete-teacher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId,
          requesterId: user?.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete teacher')
      }

      setTeachers(prev => prev.filter(t => t.teacher_id !== teacherId))
      toast.success('Teacher and login account deleted successfully')
      loadTeachers()
    } catch (error: any) {
      toast.error('Failed to delete teacher: ' + error.message)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMessage('')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []
      const totalRecords = lines.length - 1

      setUploadMessage(`Processing 0 of ${totalRecords} teachers...`)

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const teacher: any = {}
        headers.forEach((header, index) => {
          teacher[header] = values[index]
        })

        try {
          const sanitizedFirst = teacher.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')
          const sanitizedLast = teacher.last_name.toLowerCase().replace(/[^a-z0-9]/g, '')

          const email = teacher.email || `${sanitizedFirst}.${sanitizedLast}.teacher@gmail.com`
          const password = teacher.password || 'Teacher123!'

          const { createTeacher } = await import('@/lib/user-creation')

          await createTeacher({
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email,
            password,
            phone: teacher.phone || null,
            specialization: teacher.specialization || null,
            qualification: teacher.qualification || null,
            hire_date: teacher.hire_date || new Date().toISOString().split('T')[0],
            staff_id: teacher.staff_id || null
          })

          successCount++
          setUploadMessage(`✅ Processing ${i} of ${totalRecords} teachers... (${successCount} successful, ${errorCount} failed)`)

          if (i < lines.length - 1) {
            setUploadMessage(`⏳ Waiting 15 seconds before next teacher... (${successCount} successful, ${errorCount} failed)`)
            await new Promise(resolve => setTimeout(resolve, 15000))
          }
        } catch (err: any) {
          console.error('Error creating teacher:', err)
          errorCount++
          errors.push(`Row ${i}: ${err.message || 'Unknown error'}`)
          setUploadMessage(`❌ Processing ${i} of ${totalRecords} teachers... (${successCount} successful, ${errorCount} failed)`)
        }
      }

      if (errors.length > 0) {
        console.log('Upload errors:', errors)
      }

      setUploadMessage(`✅ Upload complete! ${successCount} teachers created successfully.${errorCount > 0 ? ` ${errorCount} failed (check console for details).` : ''}`)

      if (successCount > 0) {
        setTimeout(() => {
          setShowUploadModal(false)
          window.location.reload()
        }, 3000)
      }
    } catch (err) {
      console.error('CSV parsing error:', err)
      setUploadMessage('❌ Error parsing CSV file. Please check the format.')
    } finally {
      setUploading(false)
    }
  }

  const downloadCSVTemplate = () => {
    const template = 'staff_id,first_name,last_name,email,phone,specialization,qualification,hire_date,password\nTCH0001,John,Doe,john.doe.teacher@gmail.com,+233201234567,Mathematics,B.Ed Mathematics,2024-01-15,Teacher123!\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'teachers_template.csv'
    a.click()
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (loading && teachers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white shadow sticky top-0 z-10">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="space-y-1">
                  <Skeleton className="w-40 sm:w-48 h-7" />
                  <Skeleton className="w-28 sm:w-32 h-4" />
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Skeleton className="flex-1 sm:w-28 h-10 rounded-xl" />
                <Skeleton className="flex-1 sm:w-28 h-10 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-12 h-12 rounded-2xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="w-3/4 h-5" />
                    <Skeleton className="w-1/3 h-3" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-5/6 h-4" />
                  <Skeleton className="w-2/3 h-4" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Skeleton className="flex-1 h-9 rounded-xl" />
                  <Skeleton className="w-9 h-9 rounded-xl" />
                  <Skeleton className="w-9 h-9 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4">
              <BackButton href="/admin/dashboard" className="shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                  <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-600 shrink-0" />
                  <span>Teacher Management</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                  View, assign, and manage faculty credentials
                </p>
              </div>
            </div>

            {/* Actions Grid for Mobile, Row for Tablet+ */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowUploadModal(true)}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 text-xs sm:text-sm shadow-sm active:scale-95"
              >
                <Upload className="w-4 h-4 shrink-0" />
                <span>Upload CSV</span>
              </button>
              <Link 
                href="/admin/teachers/add"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold transition-all flex items-center justify-center space-x-1.5 text-xs sm:text-sm active:scale-95"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span>Add Teacher</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-5 sm:py-8 space-y-6">
        {/* Search Bar & Total Counter */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3 sm:p-4 md:p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or staff ID..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-gray-900 text-sm font-medium transition-all outline-none"
              />
            </div>
            <div className="text-xs font-bold px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl whitespace-nowrap text-gray-600 dark:text-gray-300 self-start sm:self-auto text-center">
              {totalCount} teacher{totalCount !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>

        {/* Teachers Responsive Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 transition-opacity duration-200 ${loading && teachers.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-gray-700 p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3 mb-3.5">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 p-2.5 sm:p-3 rounded-2xl shrink-0 text-emerald-600 dark:text-emerald-400">
                      <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {teacher.first_name} {teacher.middle_name ? teacher.middle_name + ' ' : ''}{teacher.last_name}
                      </h3>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{teacher.teacher_id}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider shrink-0 ${
                    teacher.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200/60'
                      : teacher.status === 'on_leave'
                      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200/60'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200'
                  }`}>
                    {teacher.status === 'on_leave' ? 'On Leave' : teacher.status || 'Active'}
                  </span>
                </div>

                {/* Details Breakdown */}
                <div className="space-y-2 bg-gray-50/70 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 mb-4">
                  {teacher.specialization && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-400 text-[11px] uppercase tracking-wide flex items-center gap-1.5 shrink-0">
                        <BookOpen className="w-3.5 h-3.5" /> Spec:
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{teacher.specialization}</span>
                    </div>
                  )}
                  {teacher.qualification && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-400 text-[11px] uppercase tracking-wide flex items-center gap-1.5 shrink-0">
                        <Award className="w-3.5 h-3.5" /> Qual:
                      </span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{teacher.qualification}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-400 text-[11px] uppercase tracking-wide flex items-center gap-1.5 shrink-0">
                        <Phone className="w-3.5 h-3.5" /> Phone:
                      </span>
                      <span className="font-mono text-gray-700 dark:text-gray-300">{teacher.phone}</span>
                    </div>
                  )}
                  {teacher.email && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-400 text-[11px] uppercase tracking-wide flex items-center gap-1.5 shrink-0">
                        <Mail className="w-3.5 h-3.5" /> Email:
                      </span>
                      <span className="truncate text-gray-700 dark:text-gray-300 max-w-[180px]">{teacher.email}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-gray-400 text-[11px] uppercase tracking-wide">Gender:</span>
                    <span className="font-semibold capitalize text-gray-700 dark:text-gray-300">{teacher.gender || 'Unknown'}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <Link 
                  href={`/admin/teachers/${teacher.teacher_id}`}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </Link>
                <button 
                  onClick={() => setResetPasswordModal({ show: true, teacher })}
                  className="p-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl transition-colors border border-amber-200/60 dark:border-amber-800"
                  title="Reset Password"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteTeacher(teacher.teacher_id)}
                  className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 rounded-xl transition-colors border border-rose-200/60 dark:border-rose-800"
                  title="Delete Teacher"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {teachers.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <GraduationCap className="w-14 h-14 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800 mb-1">No teachers found</h3>
            <p className="text-xs text-gray-500">Try adjusting your search criteria or register a new teacher.</p>
          </div>
        )}

        {/* Responsive Pagination */}
        {totalCount > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3.5 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 font-medium text-center sm:text-left">
              Showing <span className="font-bold text-gray-900">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
              <span className="font-bold text-gray-900">{Math.min(page * PAGE_SIZE, totalCount)}</span> of{' '}
              <span className="font-bold text-gray-900">{totalCount}</span> teachers
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-500 px-2">
                {page} / {totalPages || 1}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Reset Password Modal (Bottom Sheet on Mobile, Centered on Tablet+) */}
      {resetPasswordModal.show && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-amber-100 p-2.5 rounded-xl text-amber-700 shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Reset Password</h3>
                  <p className="text-xs text-gray-400">Restore default login credentials</p>
                </div>
              </div>
              <button 
                onClick={() => setResetPasswordModal({ show: false, teacher: null })}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-6">
                <div className="bg-emerald-100 text-emerald-600 w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-emerald-700 font-bold text-sm">Password reset successfully!</p>
              </div>
            ) : (
              <>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 leading-relaxed">
                  Are you sure you want to reset the password for{' '}
                  <span className="font-bold text-gray-900">
                    {resetPasswordModal.teacher?.first_name} {resetPasswordModal.teacher?.last_name}
                  </span>?
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 space-y-1 text-xs text-blue-900">
                  <p><span className="font-bold">Username:</span> {resetPasswordModal.teacher?.teacher_id}</p>
                  <p><span className="font-bold">New Password:</span> {resetPasswordModal.teacher?.teacher_id.padStart(8, '0')}</p>
                  <p className="text-[10px] text-blue-700 pt-1 font-medium">Format: Staff ID padded to 8 characters.</p>
                </div>
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                  <button
                    onClick={() => setResetPasswordModal({ show: false, teacher: null })}
                    disabled={resetting}
                    className="w-full sm:w-auto px-4 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
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

      {/* CSV Upload Modal (Bottom Sheet on Mobile, Centered on Tablet+) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2.5 rounded-xl text-blue-700 shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-800">Upload Teachers CSV</h3>
                  <p className="text-xs text-gray-400">Bulk register faculty records</p>
                </div>
              </div>
              <button 
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-xs text-gray-600 leading-relaxed">
                Upload a structured CSV file. Required headers: <code className="font-mono text-[11px] bg-gray-100 px-1 py-0.5 rounded">staff_id, first_name, last_name, email, phone, specialization, qualification, hire_date, password</code>.
              </p>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  ⚠️ <strong>Rate Limiting:</strong> Auth account creation runs with a 15-second delay between entries to protect against provider rate limits.
                </p>
              </div>

              <button
                onClick={downloadCSVTemplate}
                className="text-xs text-blue-600 hover:underline font-bold inline-flex items-center gap-1.5 py-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template (.csv)</span>
              </button>

              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-xl p-1.5"
              />
            </div>

            {uploadMessage && (
              <div className={`p-3 rounded-xl mb-4 text-xs font-semibold ${
                uploadMessage.includes('complete') || uploadMessage.includes('✅')
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-rose-50 text-rose-800'
              }`}>
                {uploadMessage}
              </div>
            )}

            {uploading && (
              <div className="flex items-center justify-center py-3 gap-2 text-xs font-bold text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Processing records...</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50"
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