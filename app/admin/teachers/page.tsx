'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
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
  Loader2,
  ShieldAlert,
  Calendar,
  UserCheck,
  CheckCircle2,
  Briefcase
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

const PAGE_SIZE = 12

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Debounced search & data fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTeachers()
    }, 250)
    return () => clearTimeout(timer)
  }, [page, searchTerm])

  async function loadTeachers() {
    setLoading(true)
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    let query = supabase
      .from('teachers')
      .select('*', { count: 'exact' })
      .order('first_name', { ascending: true })

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase()
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,teacher_id.ilike.%${term}%,specialization.ilike.%${term}%`)
    }

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const { data, count, error } = await query.range(from, to)

    if (error) {
      console.error('Error loading teachers:', error)
      toast.error('Failed to load teachers')
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
        throw new Error('Teacher profile account not found')
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
      toast.success('Password restored to default format')
      setTimeout(() => {
        setResetPasswordModal({ show: false, teacher: null })
        setResetSuccess(false)
      }, 1800)
    } catch (err: any) {
      console.error('Error resetting password:', err)
      toast.error(`Reset error: ${err.message}`)
    } finally {
      setResetting(false)
    }
  }

  async function handleDeleteTeacher(teacherId: string) {
    if (!confirm('Are you sure you want to delete this teacher? This will permanently delete their portal account and class assignments.')) {
      return
    }

    try {
      setDeletingId(teacherId)
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
      toast.success('Teacher and login account removed')
      loadTeachers()
    } catch (error: any) {
      toast.error('Deletion error: ' + error.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadMessage('Reading CSV template...')

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      const headers = lines[0].split(',').map(h => h.trim())

      let successCount = 0
      let errorCount = 0
      const totalRecords = lines.length - 1

      setUploadMessage(`Processing 0 of ${totalRecords} faculty records...`)

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        const teacher: any = {}
        headers.forEach((header, index) => {
          teacher[header] = values[index]
        })

        try {
          const sanitizedFirst = (teacher.first_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
          const sanitizedLast = (teacher.last_name || '').toLowerCase().replace(/[^a-z0-9]/g, '')

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
          setUploadMessage(`Processing ${i} of ${totalRecords}... (${successCount} successful, ${errorCount} failed)`)

          if (i < lines.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 15000))
          }
        } catch (err: any) {
          console.error('Error row', i, err)
          errorCount++
          setUploadMessage(`Processing ${i} of ${totalRecords}... (${successCount} successful, ${errorCount} failed)`)
        }
      }

      setUploadMessage(`Upload completed! ${successCount} teachers created successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`)

      if (successCount > 0) {
        setTimeout(() => {
          setShowUploadModal(false)
          loadTeachers()
        }, 2000)
      }
    } catch (err) {
      console.error('CSV error:', err)
      setUploadMessage('Failed to parse CSV file. Ensure valid columns.')
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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  if (loading && teachers.length === 0) {
    return <TeachersSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Title & Return */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Teacher Management
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Faculty credentials, subject specializations, and staff status
                </p>
              </div>
            </div>

            {/* Quick Header Actions */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition active:scale-95 border border-slate-200/60 dark:border-slate-700 shadow-2xs"
              >
                <Upload className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                <span>Upload CSV</span>
              </button>

              <Link
                href="/admin/teachers/add"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 text-center shrink-0"
              >
                <Plus className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Add Teacher</span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* Search & Statistics Filter Bar */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search faculty by name, staff ID, or subject..."
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

          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
              <GraduationCap className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
              <span>{totalCount} Total Faculty</span>
            </span>
          </div>
        </section>

        {/* Teachers Grid: 1 col on mobile, 2 cols on tablet, 3 cols on desktop */}
        {teachers.length === 0 && !loading ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-16 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <GraduationCap className="w-6 h-6 opacity-35" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                No Teachers Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {searchTerm ? 'No teachers match your search query.' : 'No faculty records have been registered in the database yet.'}
              </p>
            </div>
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setPage(1)
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4 md:gap-5 transition-opacity duration-150 ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
            {teachers.map((teacher) => {
              const fullName = `${teacher.first_name || ''} ${teacher.middle_name ? teacher.middle_name + ' ' : ''}${teacher.last_name || ''}`.trim()
              const initials = `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}`.toUpperCase() || 'TC'
              const isOnLeave = teacher.status === 'on_leave' || teacher.status === 'on leave'
              const isActive = teacher.status === 'active' || (!teacher.status)

              return (
                <div
                  key={teacher.id}
                  className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 shadow-xs hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3.5">
                    
                    {/* Card Header: Avatar, Name & Status Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 font-black text-xs sm:text-sm flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate leading-snug">
                            {fullName}
                          </h3>
                          <p className="text-[11px] font-mono text-slate-400 truncate">
                            ID: {teacher.teacher_id}
                          </p>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border shrink-0 ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                          : isOnLeave
                          ? 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}>
                        {isOnLeave ? 'On Leave' : teacher.status || 'Active'}
                      </span>
                    </div>

                    {/* Metadata Details Bubble */}
                    <div className="bg-slate-50/80 dark:bg-slate-900/50 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                      {teacher.specialization ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0">
                            <BookOpen className="w-3 h-3 text-amber-500" />
                            <span>Spec:</span>
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                            {teacher.specialization}
                          </span>
                        </div>
                      ) : null}

                      {teacher.qualification ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0">
                            <Award className="w-3 h-3 text-blue-500" />
                            <span>Qual:</span>
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-right">
                            {teacher.qualification}
                          </span>
                        </div>
                      ) : null}

                      {teacher.phone ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0">
                            <Phone className="w-3 h-3 text-emerald-500" />
                            <span>Phone:</span>
                          </span>
                          <a 
                            href={`tel:${teacher.phone}`}
                            className="font-mono text-slate-700 dark:text-slate-300 hover:text-[#003B5C] dark:hover:text-blue-400 hover:underline"
                          >
                            {teacher.phone}
                          </a>
                        </div>
                      ) : null}

                      {teacher.email ? (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0">
                            <Mail className="w-3 h-3 text-purple-500" />
                            <span>Email:</span>
                          </span>
                          <a 
                            href={`mailto:${teacher.email}`}
                            className="text-slate-700 dark:text-slate-300 hover:text-[#003B5C] dark:hover:text-blue-400 hover:underline truncate max-w-[170px]"
                            title={teacher.email}
                          >
                            {teacher.email}
                          </a>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gender:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{teacher.gender || 'Unspecified'}</span>
                      </div>
                    </div>

                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      href={`/admin/teachers/${teacher.teacher_id}`}
                      className="flex-1 py-2 px-3 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-95"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      <span>Edit &amp; Allocations</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setResetPasswordModal({ show: true, teacher })}
                      className="p-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl transition border border-amber-200/60 dark:border-amber-900/40 active:scale-95"
                      title="Reset Account Password"
                      aria-label="Reset Password"
                    >
                      <KeyRound className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteTeacher(teacher.teacher_id)}
                      disabled={deletingId === teacher.teacher_id}
                      className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition border border-rose-200/60 dark:border-rose-900/40 disabled:opacity-50 active:scale-95"
                      title="Delete Teacher"
                      aria-label="Delete Teacher"
                    >
                      {deletingId === teacher.teacher_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Responsive Pagination Strip */}
        {totalCount > 0 && (
          <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
              Showing <strong className="text-slate-900 dark:text-white font-mono">{(page - 1) * PAGE_SIZE + 1}</strong> to{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{Math.min(page * PAGE_SIZE, totalCount)}</strong> of{' '}
              <strong className="text-slate-900 dark:text-white font-mono">{totalCount}</strong> faculty records
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

      </main>

      {/* Reset Password Modal (Bottom Sheet on Mobile, Centered Dialog on Tablet+) */}
      {resetPasswordModal.show && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setResetPasswordModal({ show: false, teacher: null })}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Reset Faculty Password
                  </h3>
                  <p className="text-xs text-slate-400">Restore default credentials</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setResetPasswordModal({ show: false, teacher: null })}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="text-center py-6 space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                  Password restored successfully!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  Are you sure you want to reset the portal password for{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {resetPasswordModal.teacher?.first_name} {resetPasswordModal.teacher?.last_name}
                  </strong>?
                </p>

                <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 space-y-1 text-xs text-blue-900 dark:text-blue-200">
                  <p><span className="font-bold">Staff Username:</span> <code>{resetPasswordModal.teacher?.teacher_id}</code></p>
                  <p><span className="font-bold">Default Password:</span> <code>{resetPasswordModal.teacher?.teacher_id.padStart(8, '0')}</code></p>
                  <p className="text-[10px] text-blue-700 dark:text-blue-300 pt-1">Format: Staff ID padded with leading zeros to 8 characters.</p>
                </div>

                <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetPasswordModal({ show: false, teacher: null })}
                    disabled={resetting}
                    className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-[#003B5C] rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {resetting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <span>Confirm Reset</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSV Bulk Upload Modal */}
      {showUploadModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowUploadModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Bulk CSV Upload
                  </h3>
                  <p className="text-xs text-slate-400">Import faculty accounts from spreadsheet</p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <p>
                Upload a standard CSV file with headers: <br />
                <code className="font-mono text-[10px] sm:text-[11px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded text-[#003B5C] dark:text-blue-300 block mt-1 overflow-x-auto">
                  staff_id, first_name, last_name, email, phone, specialization, qualification, hire_date, password
                </code>
              </p>

              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50 rounded-2xl p-3 text-[11px] text-amber-800 dark:text-amber-300">
              <strong>Rate Limiting Protection:</strong> A mandatory 15-second pause runs between consecutive account creations to prevent provider auth throttle errors.
              </div>

              <button
                type="button"
                onClick={downloadCSVTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Sample Template (.csv)</span>
              </button>

              <input
                type="file"
                accept=".csv"
                onChange={handleCSVUpload}
                disabled={uploading}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#003B5C] file:text-white hover:file:bg-[#002a42] border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 bg-slate-50/50 dark:bg-slate-900/50 cursor-pointer"
              />
            </div>

            {uploadMessage && (
              <div className={`p-3 rounded-xl text-xs font-semibold leading-relaxed ${
                uploadMessage.includes('completed') || uploadMessage.includes('✅')
                  ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {uploadMessage}
              </div>
            )}

            {uploading && (
              <div className="flex items-center justify-center py-2 gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <Loader2 className="w-4 h-4 animate-spin text-[#003B5C] dark:text-blue-400" />
                <span>Importing accounts, please keep this window open...</span>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                disabled={uploading}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal Footer */}
      <PortalFooter />
    </div>
  )
}

function TeachersSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-60 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
      </main>
      <PortalFooter />
    </div>
  )
}