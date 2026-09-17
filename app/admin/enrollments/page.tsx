'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Filter, 
  Search, 
  Users, 
  ArrowRightLeft, 
  UserCheck, 
  AlertCircle, 
  CheckSquare, 
  Square, 
  Calendar,
  X,
  ChevronDown,
  Loader2,
  CheckCircle2,
  GraduationCap
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { PortalFooter } from '@/components/PortalFooter'

export default function EnrollmentsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [terms, setTerms] = useState<any[]>([])
  const [currentTermId, setCurrentTermId] = useState<string>('')
  
  // Filters
  const [classFilter, setClassFilter] = useState('all')
  const [termFilter, setTermFilter] = useState('current')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  // Selection
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())

  // Modal State
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [targetClass, setTargetClass] = useState('')
  const [targetStatus, setTargetStatus] = useState('')
  const [actionType, setActionType] = useState<'transfer' | 'status'>('transfer')

  useEffect(() => {
    loadClasses()
    loadTerms()
  }, [])

  useEffect(() => {
    if (!contextLoading) {
      loadStudents()
    }
  }, [classFilter, statusFilter, termFilter, searchTerm, contextLoading, user])

  const loadClasses = async () => {
    const { data } = await supabase
      .from('classes')
      .select('id, name, level')
      .order('level', { ascending: true })
    if (data) setClasses(data)
  }

  const loadTerms = async () => {
    const { data } = await supabase
      .from('academic_terms')
      .select('id, name, academic_year, is_current')
      .order('start_date', { ascending: false })
    
    if (data) {
      setTerms(data)
      const current = data.find((t: any) => t.is_current)
      if (current) setCurrentTermId(current.id)
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    let query = supabase
      .from('students')
      .select(`
        id, 
        first_name, 
        last_name, 
        middle_name,
        student_id, 
        status,
        created_at,
        classes:class_id (id, name)
      `)
      .order('last_name', { ascending: true })

    if (classFilter !== 'all') {
      query = query.eq('class_id', classFilter)
    }
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (searchTerm.trim()) {
      const term = searchTerm.trim()
      query = query.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,student_id.ilike.%${term}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error loading students:', error)
      toast.error('Failed to load students list')
    } else {
      setStudents(data || [])
    }
    setLoading(false)
    setSelectedStudents(new Set())
  }

  const toggleSelectAll = () => {
    if (selectedStudents.size === students.length && students.length > 0) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(students.map(s => s.id)))
    }
  }

  const toggleStudent = (id: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedStudents(newSelected)
  }

  const handleBulkAction = async () => {
    if (selectedStudents.size === 0) return
    setSaving(true)

    try {
      const updateData: Record<string, any> = {}
      
      if (actionType === 'transfer') {
        if (!targetClass) throw new Error('Please select a target class')
        updateData.class_id = targetClass
      } else if (actionType === 'status') {
        if (!targetStatus) throw new Error('Please select a status')
        updateData.status = targetStatus
      }

      const { error } = await supabase
        .from('students')
        .update(updateData)
        .in('id', Array.from(selectedStudents))

      if (error) throw error

      toast.success(`Successfully updated ${selectedStudents.size} learner${selectedStudents.size > 1 ? 's' : ''}`)
      setShowTransferModal(false)
      setTargetClass('')
      setTargetStatus('')
      loadStudents()
      setSelectedStudents(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Bulk operation failed')
    } finally {
      setSaving(false)
    }
  }

  const currentTermObj = useMemo(() => {
    return terms.find((t: any) => t.id === currentTermId)
  }, [terms, currentTermId])

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
      case 'inactive':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50'
      case 'transferred':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
      case 'graduated':
        return 'bg-blue-50 text-[#003B5C] border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  if (loading && students.length === 0) {
    return <EnrollmentsSkeleton />
  }

  const allSelected = students.length > 0 && selectedStudents.size === students.length

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Title & Navigation */}
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Enrollment &amp; Transfers
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Cohort enrollment management, class transfers, and status updates
                </p>
              </div>
            </div>

            {/* Current Academic Term Display */}
            {currentTermObj && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 self-start sm:self-auto shrink-0 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                <div className="text-left">
                  <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 block leading-tight">
                    Current Term
                  </span>
                  <span className="text-xs font-black text-[#003B5C] dark:text-blue-300 font-mono leading-tight">
                    {currentTermObj.name} ({currentTermObj.academic_year})
                  </span>
                </div>
              </div>
            )}

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-5">
        
        {/* Search & Responsive Filters Matrix */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3">
          
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            
            {/* Search Input Bar */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search students by name, surname, or ID..."
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

            {/* Total Results Pill */}
            <div className="flex items-center justify-between lg:justify-end gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                <Users className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                <span>{students.length} Learners Listed</span>
              </span>
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            
            {/* Class Cohort Select */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full appearance-none pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
              >
                <option value="all">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Academic Term Select */}
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={termFilter}
                onChange={(e) => setTermFilter(e.target.value)}
                className="w-full appearance-none pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
              >
                <option value="current">Current Enrollment</option>
                {terms.map((t: any) => (
                  <option key={t.id} value={t.id} disabled={t.id !== currentTermId}>
                    {t.name} ({t.academic_year}) {t.id !== currentTermId ? '(Archived)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Enrollment Status Select */}
            <div className="relative">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none pl-9 pr-8 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-[#003B5C] cursor-pointer transition truncate"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Enrolled</option>
                <option value="inactive">Inactive</option>
                <option value="transferred">Transferred Out</option>
                <option value="graduated">Graduated / Alumni</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

          </div>
        </section>

        {/* Floating / Sticky Mobile-Ready Batch Actions Bar */}
        {selectedStudents.size > 0 && (
          <aside 
            aria-label="Batch operations bar"
            className="sticky top-16 sm:top-20 z-20 bg-[#003B5C] text-white p-3 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/20 animate-in slide-in-from-top-2 duration-200"
          >
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                <CheckSquare className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-amber-300 font-mono text-sm sm:text-base">{selectedStudents.size}</strong>{' '}
                  Learner{selectedStudents.size > 1 ? 's' : ''} Selected
                </span>
              </div>

              <button 
                type="button"
                onClick={() => setSelectedStudents(new Set())}
                className="text-xs text-blue-200 hover:text-white font-semibold underline sm:hidden"
              >
                Deselect All
              </button>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActionType('transfer')
                  setShowTransferModal(true)
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white text-[#003B5C] hover:bg-slate-100 rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                <span>Bulk Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActionType('status')
                  setShowTransferModal(true)
                }}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
              >
                <AlertCircle className="w-3.5 h-3.5 text-white" />
                <span>Update Status</span>
              </button>
            </div>
          </aside>
        )}

        {/* Empty State */}
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
                {searchTerm || classFilter !== 'all' || statusFilter !== 'all'
                  ? 'No students match your active filter or search criteria.'
                  : 'No student records have been registered in the system database yet.'}
              </p>
            </div>
            {(searchTerm || classFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setClassFilter('all')
                  setStatusFilter('all')
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
                      <th className="px-4 py-3.5 w-12 text-center">
                        <button 
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-slate-400 hover:text-[#003B5C] transition-colors p-1"
                          aria-label="Select all students on screen"
                        >
                          {allSelected ? (
                            <CheckSquare className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 sm:px-6 py-3.5 font-mono">Student ID</th>
                      <th className="px-4 py-3.5">Learner Full Name</th>
                      <th className="px-4 py-3.5">Current Class</th>
                      <th className="px-4 py-3.5 text-center">Enrollment Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {students.map((student) => {
                      const isSelected = selectedStudents.has(student.id)
                      const fullName = `${student.last_name || ''}, ${student.first_name || ''}${student.middle_name ? ` ${student.middle_name}` : ''}`.trim()

                      return (
                        <tr 
                          key={student.id} 
                          onClick={() => toggleStudent(student.id)}
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50/70 dark:bg-blue-950/30' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleStudent(student.id)}
                              className="text-slate-400 hover:text-[#003B5C] transition-colors p-1"
                              aria-label={`Select ${fullName}`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>
                          </td>

                          <td className="px-4 sm:px-6 py-3.5 font-mono font-bold text-slate-600 dark:text-slate-300">
                            {student.student_id || '---'}
                          </td>

                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {fullName}
                          </td>

                          <td className="px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                              <span>{student.classes?.name || 'Unassigned'}</span>
                            </span>
                          </td>

                          <td className="px-4 py-3.5 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-lg border ${getStatusBadge(student.status)}`}>
                              {student.status || 'Active'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Touch-Friendly Card List (< md screens) */}
            <div className="md:hidden space-y-3">
              
              {/* Select All Toggle Bar on Mobile */}
              <div className="flex items-center justify-between px-1 text-xs font-semibold text-slate-500">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 p-1 text-slate-700 dark:text-slate-200 active:scale-95 transition-transform"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Select All ({students.length})</span>
                </button>

                <span>{selectedStudents.size} selected</span>
              </div>

              {/* Cards Roster */}
              {students.map((student) => {
                const isSelected = selectedStudents.has(student.id)
                const fullName = `${student.last_name || ''}, ${student.first_name || ''}${student.middle_name ? ` ${student.middle_name}` : ''}`.trim()

                return (
                  <div
                    key={student.id}
                    onClick={() => toggleStudent(student.id)}
                    className={`bg-white dark:bg-slate-800/90 rounded-2xl border p-4 shadow-xs transition-all active:scale-[0.99] cursor-pointer ${
                      isSelected 
                        ? 'border-[#003B5C] ring-2 ring-[#003B5C]/20 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20' 
                        : 'border-slate-200/80 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-snug">
                            {fullName}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono text-[11px] font-bold text-slate-400">
                            {student.student_id}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                            <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{student.classes?.name || 'Unassigned'}</span>
                          </span>
                        </div>

                        <div className="pt-0.5">
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${getStatusBadge(student.status)}`}>
                            {student.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Tap Target Checkbox */}
                      <div className="p-1 -mr-1 -mt-1 text-slate-400 shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#003B5C] dark:text-blue-400" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

            </div>
          </div>
        )}

      </main>

      {/* Responsive Modal (Bottom-Sheet on Mobile, Centered Dialog on Tablet/Desktop) */}
      {showTransferModal && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setShowTransferModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-700 max-h-[92vh] overflow-y-auto space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                  {actionType === 'transfer' ? <ArrowRightLeft className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    {actionType === 'transfer' ? 'Transfer Learners' : 'Update Status'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Applying changes to {selectedStudents.size} selected student{selectedStudents.size > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 pt-1">
              {actionType === 'transfer' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    Target Class Cohort <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                    >
                      <option value="">Select Destination Class...</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {actionType === 'status' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                    New Enrollment Standing <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={targetStatus}
                      onChange={(e) => setTargetStatus(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2.5 text-xs sm:text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer pr-8"
                    >
                      <option value="">Select Status...</option>
                      <option value="active">Active Enrolled</option>
                      <option value="inactive">Inactive</option>
                      <option value="transferred">Transferred Out</option>
                      <option value="graduated">Graduated / Alumni</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col-reverse sm:flex-row justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  disabled={saving}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkAction}
                  disabled={saving || (actionType === 'transfer' && !targetClass) || (actionType === 'status' && !targetStatus)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-95 disabled:opacity-50 transition"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Applying...</span>
                    </>
                  ) : (
                    <span>Confirm Batch Update</span>
                  )}
                </button>
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

function EnrollmentsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-44 rounded-md" />
          </div>
          <Skeleton className="h-9 w-32 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-4 flex-1">
        <Skeleton className="h-28 w-full rounded-2xl sm:rounded-3xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
      </main>
      <PortalFooter />
    </div>
  )
}