'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  Filter, 
  GraduationCap, 
  Eye, 
  X, 
  ChevronDown, 
  Loader2, 
  AlertCircle,
  School,
  ShieldCheck,
  Trash2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { createStudent } from '@/lib/user-creation'
import { PortalFooter } from '@/components/PortalFooter'

export default function AdmissionsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [applications, setApplications] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [classFilter, setClassFilter] = useState('all')

  useEffect(() => {
    fetchInitialData()
  }, [])

  const fetchInitialData = async () => {
    try {
      setLoading(true)

      // 1. Fetch Classes for dropdown filtering
      const { data: classData } = await supabase
        .from('classes')
        .select('id, name')
        .order('name', { ascending: true })

      if (classData) setClasses(classData)

      // 2. Fetch Admission Applications
      const { data, error } = await supabase
        .from('admission_applications')
        .select(`
          *,
          classes:class_applying_for (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error: any) {
      console.error('Error fetching applications:', error)
      toast.error('Failed to load admission applications')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: number, newStatus: 'approved' | 'rejected') => {
    try {
      setUpdatingId(id)

      if (newStatus === 'approved') {
        const app = applications.find(a => a.id === id)
        if (!app) throw new Error('Application record not found')

        const nameParts = app.applicant_name.trim().split(/\s+/)
        const firstName = nameParts[0]
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Student'

        await createStudent({
          first_name: firstName,
          last_name: lastName,
          date_of_birth: app.date_of_birth,
          gender: app.gender,
          class_id: app.class_applying_for,
          guardian_name: app.parent_name,
          guardian_phone: app.parent_phone,
          guardian_email: app.parent_email || undefined,
          admission_date: new Date().toISOString().split('T')[0]
        })
      }

      const { error } = await supabase
        .from('admission_applications')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error
      
      setApplications(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
      if (selectedApp?.id === id) {
        setSelectedApp((prev: any) => prev ? { ...prev, status: newStatus } : null)
      }

      if (newStatus === 'approved') {
        toast.success('Application approved & learner account created!')
      } else {
        toast.success('Application marked as rejected.')
      }
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status: ' + (error.message || 'Unknown error'))
    } finally {
      setUpdatingId(null)
    }
  }

  const deleteApplication = async (id: number) => {
    if (!confirm('Are you sure you want to delete this admission application? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingId(id)

      const { error } = await supabase
        .from('admission_applications')
        .delete()
        .eq('id', id)

      if (error) throw error

      setApplications(prev => prev.filter(app => app.id !== id))
      if (selectedApp?.id === id) {
        setSelectedApp(null)
      }
      toast.success('Admission application deleted successfully')
    } catch (error: any) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application: ' + (error.message || 'Unknown error'))
    } finally {
      setDeletingId(null)
    }
  }

  // Filtered Applications Pipeline
  const filteredApplications = useMemo(() => {
    return applications.filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false
      }

      if (classFilter !== 'all') {
        const classMatch = String(app.class_applying_for) === String(classFilter)
        if (!classMatch) return false
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const applicant = (app.applicant_name || '').toLowerCase()
        const parent = (app.parent_name || '').toLowerCase()
        const phone = (app.parent_phone || '').toLowerCase()
        const email = (app.parent_email || '').toLowerCase()

        if (
          !applicant.includes(term) && 
          !parent.includes(term) && 
          !phone.includes(term) && 
          !email.includes(term)
        ) {
          return false
        }
      }

      return true
    })
  }, [applications, statusFilter, classFilter, searchTerm])

  // Aggregate Metrics
  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter(a => a.status === 'pending').length,
      approved: applications.filter(a => a.status === 'approved').length,
      rejected: applications.filter(a => a.status === 'rejected').length
    }
  }, [applications])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
      case 'rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
    }
  }

  if (loading && applications.length === 0) {
    return <AdmissionsSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Admissions Desk
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Review applicant profiles, guardian contacts, and manage enrollment requests
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 self-start sm:self-auto shrink-0 shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
              <span className="text-xs font-mono font-bold text-[#003B5C] dark:text-blue-300">
                {stats.pending} Pending Review
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* KPI Strip */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
          
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Total Submissions
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {stats.total}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">All time intake</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 flex items-center justify-center shrink-0 ml-1">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Awaiting Review
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-amber-600 dark:text-amber-400">
                {stats.pending}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Action required</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 flex items-center justify-center shrink-0 ml-1">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Admitted &amp; Enrolled
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {stats.approved}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Account provisioned</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-center shrink-0 ml-1">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Declined
              </span>
              <div className="text-xl sm:text-2xl md:text-3xl font-black font-mono text-rose-600 dark:text-rose-400">
                {stats.rejected}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Not admitted</p>
            </div>
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-center shrink-0 ml-1">
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

        </section>

        {/* Filter & Search Controls */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search applicant name, parent, phone or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Dropdown Filters */}
            <div className="grid grid-cols-2 md:flex items-center gap-2 sm:gap-2.5 shrink-0">
              
              {/* Status Filter */}
              <div className="relative flex-1 md:w-40">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Only</option>
                  <option value="approved">Approved Only</option>
                  <option value="rejected">Rejected Only</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              {/* Class Filter */}
              <div className="relative flex-1 md:w-44">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="w-full appearance-none pl-3 pr-8 py-2.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
                >
                  <option value="all">All Classes</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

            </div>

          </div>
        </section>

        {/* Applications Output Roster */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-16 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto shadow-inner">
              <FileText className="w-6 h-6 opacity-35" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                No Applications Found
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                {searchTerm || statusFilter !== 'all' || classFilter !== 'all'
                  ? 'No applications match your active filter criteria.'
                  : 'No prospective students have submitted online admissions forms yet.'}
              </p>
            </div>
            {(searchTerm || statusFilter !== 'all' || classFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setClassFilter('all')
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Desktop Table View (≥ md screens) */}
            <div className="hidden md:block bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200/80 dark:border-slate-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3.5">Applicant &amp; Bio</th>
                      <th className="px-4 py-3.5">Intended Class</th>
                      <th className="px-4 py-3.5">Parent / Guardian Contact</th>
                      <th className="px-4 py-3.5 font-mono">Date Received</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                      <th className="px-4 sm:px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {filteredApplications.map((app) => {
                      const isPending = app.status === 'pending'
                      const isApproved = app.status === 'approved'
                      const isProcessing = updatingId === app.id
                      const isDeleting = deletingId === app.id

                      return (
                        <tr key={app.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-4 sm:px-6 py-3.5">
                            <div className="font-bold text-slate-900 dark:text-white">
                              {app.applicant_name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {app.gender}, Born: {app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString('en-GB') : '---'}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                              <span>{app.classes?.name || app.class_applying_for}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {app.parent_name}
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                              <a href={`tel:${app.parent_phone}`} className="hover:underline text-slate-600 dark:text-slate-300">
                                {app.parent_phone}
                              </a>
                              {app.parent_email && (
                                <>
                                  <span>•</span>
                                  <a href={`mailto:${app.parent_email}`} className="hover:underline truncate max-w-[140px]" title={app.parent_email}>
                                    {app.parent_email}
                                  </a>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-3.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusBadge(app.status)}`}>
                              {app.status}
                            </span>
                          </td>

                          <td className="px-4 sm:px-6 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setSelectedApp(app)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition active:scale-95 inline-flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>Inspect</span>
                              </button>

                              {isPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateStatus(app.id, 'approved')}
                                    disabled={isProcessing || isDeleting}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 inline-flex items-center gap-1 shadow-2xs"
                                  >
                                    {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    <span>Approve</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => updateStatus(app.id, 'rejected')}
                                    disabled={isProcessing || isDeleting}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition active:scale-95 disabled:opacity-50 border border-rose-200/80 dark:border-rose-900/50"
                                    title="Reject Application"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {isApproved && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Enrolled</span>
                                </span>
                              )}

                              {/* Delete Action Button */}
                              <button
                                type="button"
                                onClick={() => deleteApplication(app.id)}
                                disabled={isDeleting || isProcessing}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition active:scale-95 disabled:opacity-50 border border-rose-200/60 dark:border-rose-900/40"
                                title="Delete Admission Application"
                                aria-label="Delete Admission Application"
                              >
                                {isDeleting ? (
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

            {/* Mobile Touch-Friendly Card View (< md screens) */}
            <div className="md:hidden space-y-3">
              {filteredApplications.map((app) => {
                const isPending = app.status === 'pending'
                const isApproved = app.status === 'approved'
                const isProcessing = updatingId === app.id
                const isDeleting = deletingId === app.id

                return (
                  <div
                    key={app.id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 p-4 shadow-xs space-y-3"
                  >
                    {/* Header Row: Applicant Name, Date & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {app.applicant_name}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>{app.gender}</span>
                          <span>•</span>
                          <span>Born: {app.date_of_birth ? new Date(app.date_of_birth).toLocaleDateString('en-GB') : '---'}</span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border shrink-0 ${getStatusBadge(app.status)}`}>
                        {app.status}
                      </span>
                    </div>

                    {/* Meta Information Box */}
                    <div className="bg-slate-50/70 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                          <span>Class:</span>
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {app.classes?.name || app.class_applying_for}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-amber-500" />
                          <span>Parent:</span>
                        </span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[170px]">
                          {app.parent_name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Contact:</span>
                        </span>
                        <a href={`tel:${app.parent_phone}`} className="font-mono text-slate-700 dark:text-slate-300 font-bold hover:underline">
                          {app.parent_phone}
                        </a>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition active:scale-95 text-center"
                      >
                        Inspect
                      </button>

                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => updateStatus(app.id, 'approved')}
                            disabled={isProcessing || isDeleting}
                            className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition active:scale-95 disabled:opacity-50 text-center shadow-2xs"
                          >
                            {isProcessing ? 'Enrolling...' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(app.id, 'rejected')}
                            disabled={isProcessing || isDeleting}
                            className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition border border-rose-200/80 dark:border-rose-900/50"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {isApproved && (
                        <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200/80 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Enrolled</span>
                        </div>
                      )}

                      {/* Mobile Delete Button */}
                      <button
                        type="button"
                        onClick={() => deleteApplication(app.id)}
                        disabled={isDeleting || isProcessing}
                        className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl transition border border-rose-200/60 dark:border-rose-900/40 active:scale-95 disabled:opacity-50"
                        title="Delete Application"
                      >
                        {isDeleting ? (
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
          </div>
        )}

      </main>

      {/* Application Details Dialog / Responsive Bottom Sheet */}
      {selectedApp && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setSelectedApp(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-2xl w-full shadow-2xl p-5 sm:p-6 md:p-8 border border-slate-200/80 dark:border-slate-700 max-h-[92vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                    Admissions Dossier
                  </h3>
                  <p className="text-xs text-slate-400">
                    Application #{selectedApp.id} • Submitted {new Date(selectedApp.created_at).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dossier Content Grid */}
            <div className="space-y-4">
              
              {/* Group 1: Student Information */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-amber-400 rounded-full shrink-0" />
                  <span>Applicant Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Full Name</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedApp.applicant_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Date of Birth</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedApp.date_of_birth ? new Date(selectedApp.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '---'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Gender</span>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedApp.gender}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Class Applying For</span>
                    <p className="font-bold text-[#003B5C] dark:text-blue-300">
                      {selectedApp.classes?.name || selectedApp.class_applying_for}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group 2: Parent / Guardian Information */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-3.5 bg-amber-400 rounded-full shrink-0" />
                  <span>Parent &amp; Guardian Contacts</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Guardian Name</span>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedApp.parent_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Telephone</span>
                    <a href={`tel:${selectedApp.parent_phone}`} className="font-mono font-bold text-slate-900 dark:text-white hover:underline">
                      {selectedApp.parent_phone}
                    </a>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Email Address</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedApp.parent_email || <span className="text-slate-400 font-normal italic">None provided</span>}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Residential Address</span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {selectedApp.address || <span className="text-slate-400 font-normal italic">None provided</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group 3: Previous Schooling & Status */}
              {selectedApp.previous_school && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Previous School Attended</span>
                  <div className="p-3 bg-slate-50/70 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <School className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{selectedApp.previous_school}</span>
                  </div>
                </div>
              )}

              {/* Current Standing Callout */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-500">Admissions Standing:</span>
                <span className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-xl border ${getStatusBadge(selectedApp.status)}`}>
                  {selectedApp.status}
                </span>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => deleteApplication(selectedApp.id)}
                disabled={deletingId === selectedApp.id || updatingId === selectedApp.id}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {deletingId === selectedApp.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Dossier</span>
              </button>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Close Dossier
                </button>

                {selectedApp.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      onClick={() => updateStatus(selectedApp.id, 'rejected')}
                      disabled={updatingId === selectedApp.id || deletingId === selectedApp.id}
                      className="w-full sm:w-auto px-4 py-2.5 border border-rose-200 dark:border-rose-900/50 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs sm:text-sm font-bold transition disabled:opacity-50"
                    >
                      Reject Application
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(selectedApp.id, 'approved')}
                      disabled={updatingId === selectedApp.id || deletingId === selectedApp.id}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 disabled:opacity-50 transition"
                    >
                      {updatingId === selectedApp.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enrolling Student...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve &amp; Enroll Learner</span>
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <PortalFooter />
    </div>
  )
}

function AdmissionsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-14 w-full rounded-2xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </main>

      <PortalFooter />
    </div>
  )
}