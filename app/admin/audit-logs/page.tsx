'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { format } from 'date-fns'
import {
  ShieldAlert,
  Search,
  History,
  Activity,
  UserCog,
  Database,
  Eye,
  X,
  Clock,
  User,
  GraduationCap,
  DollarSign,
  FileSpreadsheet,
  Calendar,
  CheckCircle2,
  Layers,
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Loader2
} from 'lucide-react'
import { PortalFooter } from '@/components/PortalFooter'

interface AuditProfile {
  full_name: string
  role: string
}

interface AuditLog {
  id: string
  entity_name: string
  entity_id: string
  action: string
  old_data: any
  new_data: any
  created_at: string
  profiles?: AuditProfile
}

const entityNameMap: Record<string, string> = {
  fee_types: 'Fee Types',
  fee_structures: 'Fee Structures',
  fee_payments: 'Fee Payments',
  scores: 'Student Scores',
  students: 'Student Profile',
  student_attendance: 'Attendance Register',
  student_remarks: 'Terminal Remarks',
}

export default function AuditLogsPage() {
  const supabase = getSupabaseBrowserClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [inspectedStudentName, setInspectedStudentName] = useState<string | null>(null)
  const [inspectedStudentClass, setInspectedStudentClass] = useState<string | null>(null)
  const [inspectedFeeType, setInspectedFeeType] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (!selectedLog) {
      setInspectedStudentName(null)
      setInspectedStudentClass(null)
      setInspectedFeeType(null)
      return
    }

    const studentId = selectedLog.new_data?.student_id || selectedLog.old_data?.student_id
    if (studentId) {
      supabase
        .from('students')
        .select('first_name, last_name, classes(name)')
        .eq('id', studentId)
        .single()
        .then(({ data, error }: any) => {
          if (data && !error) {
            setInspectedStudentName(`${data.first_name} ${data.last_name}`)
            setInspectedStudentClass(data.classes?.name || null)
          }
        })
    } else if (selectedLog.entity_name === 'students' && selectedLog.entity_id) {
      supabase
        .from('students')
        .select('first_name, last_name, classes(name)')
        .eq('id', selectedLog.entity_id)
        .single()
        .then(({ data, error }: any) => {
          if (data && !error) {
            setInspectedStudentName(`${data.first_name} ${data.last_name}`)
            setInspectedStudentClass(data.classes?.name || null)
          }
        })
    }

    if (selectedLog.entity_name === 'fee_structures' && selectedLog.entity_id) {
      supabase
        .from('fee_structures')
        .select('fee_types(name)')
        .eq('id', selectedLog.entity_id)
        .single()
        .then(({ data, error }: any) => {
          if (data?.fee_types && !error) {
            setInspectedFeeType(data.fee_types.name)
          }
        })
    } else if (selectedLog.entity_name === 'fee_types' && selectedLog.entity_id) {
      supabase
        .from('fee_types')
        .select('name')
        .eq('id', selectedLog.entity_id)
        .single()
        .then(({ data, error }: any) => {
          if (data?.name && !error) {
            setInspectedFeeType(data.name)
          }
        })
    } else if (selectedLog.entity_name === 'fee_payments') {
      const feeStructId = selectedLog.new_data?.fee_structure_id || selectedLog.old_data?.fee_structure_id
      if (feeStructId) {
        supabase
          .from('fee_structures')
          .select('fee_types(name)')
          .eq('id', feeStructId)
          .single()
          .then(({ data, error }: any) => {
            if (data?.fee_types && !error) {
              setInspectedFeeType(data.fee_types.name)
            }
          })
      }
    }
  }, [selectedLog, supabase])

  async function fetchLogs() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          entity_name,
          entity_id,
          action,
          old_data,
          new_data,
          created_at,
          profiles:changed_by_profile_id (
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setLogs((data as AuditLog[]) || [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = useMemo(() => {
    return logs.filter((log: AuditLog) => {
      const term = searchTerm.toLowerCase().trim()
      const matchesSearch =
        !term ||
        (log.entity_name?.toLowerCase().includes(term)) ||
        (entityNameMap[log.entity_name]?.toLowerCase().includes(term)) ||
        (log.action?.toLowerCase().includes(term)) ||
        (log.entity_id?.toLowerCase().includes(term)) ||
        ((log.profiles?.full_name || 'System').toLowerCase().includes(term))

      const matchesAction = filterAction === 'ALL' || log.action === filterAction

      return matchesSearch && matchesAction
    })
  }, [logs, searchTerm, filterAction])

  const totalInsert = useMemo(() => logs.filter(l => l.action === 'INSERT').length, [logs])
  const totalUpdate = useMemo(() => logs.filter(l => l.action === 'UPDATE').length, [logs])
  const totalDelete = useMemo(() => logs.filter(l => l.action === 'DELETE').length, [logs])

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
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
                    System Audit Trail
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Real-time database mutation tracking, data security, and actor history
                </p>
              </div>
            </div>

            {/* Live Monitoring Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 self-start sm:self-auto shrink-0 shadow-2xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-[#003B5C] dark:text-blue-300">
                Live Audit Stream
              </span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs w-full sm:w-fit overflow-x-auto">
          <Link
            href="/admin/audit-logs"
            className="flex items-center justify-center gap-2 flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all bg-[#003B5C] text-white shadow-xs whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>All System Events</span>
          </Link>
          <Link
            href="/admin/audit-logs/finance"
            className="flex items-center justify-center gap-2 flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/60 whitespace-nowrap"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>Financial Logs</span>
          </Link>
        </div>

        {/* Quick Statistics Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
          <StatCard title="Total Events" value={logs.length} icon={History} color="blue" />
          <StatCard title="New Records" value={totalInsert} icon={Plus} color="emerald" />
          <StatCard title="Modifications" value={totalUpdate} icon={RefreshCw} color="amber" />
          <StatCard title="Deletions" value={totalDelete} icon={Trash2} color="rose" />
        </section>

        {/* Audit Log Table & Filtering Container */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden flex flex-col">
          
          {/* Controls Bar: Search & Action Selector */}
          <div className="p-3.5 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-slate-50/50 dark:bg-slate-900/40">
            
            <div className="relative flex-1 sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search by entity, ID, user, or action..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Segment Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-900/70 rounded-xl overflow-x-auto select-none shrink-0">
              {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map(action => (
                <button
                  key={action}
                  type="button"
                  onClick={() => setFilterAction(action)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-[10px] font-black rounded-lg transition-all tracking-wider whitespace-nowrap active:scale-95 ${
                    filterAction === action 
                      ? 'bg-white dark:bg-slate-800 text-[#003B5C] dark:text-blue-300 shadow-xs' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 bg-transparent'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>

          </div>

          {/* Mobile & Tablet Card Roster (< md screens) */}
          <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-12 text-center space-y-2">
                <Loader2 className="w-7 h-7 text-[#003B5C] animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Decrypting events...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-10 text-center space-y-2 text-slate-400">
                <History className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No matching audit logs found
                </p>
                <p className="text-[11px]">Try adjusting your search criteria or action filter.</p>
              </div>
            ) : (
              filteredLogs.map(log => {
                const actorName = log.profiles?.full_name || 'System Auto'
                const actorInitial = actorName[0]?.toUpperCase() || 'S'
                const entityDisplayName = entityNameMap[log.entity_name] || log.entity_name.replace(/_/g, ' ')

                return (
                  <div key={log.id} className="p-4 space-y-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    
                    {/* Header Row: Actor & Action Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                          log.profiles?.role === 'admin'
                            ? 'bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/50'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}>
                          {actorInitial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {actorName}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                          </p>
                        </div>
                      </div>

                      <ActionBadge action={log.action} />
                    </div>

                    {/* Entity Target Pill */}
                    <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                      <EntityIcon entityName={log.entity_name} className="w-8 h-8" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 capitalize truncate">
                          {entityDisplayName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">
                          ID: {log.entity_id}
                        </p>
                      </div>
                    </div>

                    {/* Footer Row: Role & Payload Inspection Button */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                        Role: {log.profiles?.role || 'SYSTEM'}
                      </span>

                      <button 
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#003B5C] dark:text-blue-300 text-xs font-bold rounded-xl shadow-2xs active:scale-95 transition-transform"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Payload</span>
                      </button>
                    </div>

                  </div>
                )
              })
            )}
          </div>

          {/* Desktop Table View (≥ md screens) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px] text-xs sm:text-sm">
              <thead className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-700 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="px-4 lg:px-6 py-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="px-4 lg:px-6 py-3.5 whitespace-nowrap">Actor &amp; Role</th>
                  <th className="px-4 lg:px-6 py-3.5 whitespace-nowrap">Mutation Action</th>
                  <th className="px-4 lg:px-6 py-3.5 whitespace-nowrap">Target Entity</th>
                  <th className="px-4 lg:px-6 py-3.5 whitespace-nowrap text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center space-y-3">
                      <Loader2 className="w-8 h-8 text-[#003B5C] animate-spin mx-auto" />
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Decoding audit sequence...</p>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center space-y-2">
                      <History className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No matching audit events recorded</p>
                      <p className="text-xs text-slate-400">Database changes will appear here automatically.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: AuditLog) => {
                    const actorName = log.profiles?.full_name || 'System Auto'
                    const actorInitial = actorName[0]?.toUpperCase() || 'S'
                    const entityDisplayName = entityNameMap[log.entity_name] || log.entity_name.replace(/_/g, ' ')

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                        <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5 font-mono">
                            <Clock className="w-4 h-4 text-slate-300 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors shrink-0" />
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-xs">
                                {format(new Date(log.created_at), 'MMM dd, yyyy')}
                              </p>
                              <p className="text-[10px] text-slate-400">
                                {format(new Date(log.created_at), 'HH:mm:ss')}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                              log.profiles?.role === 'admin'
                                ? 'bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                            }`}>
                              {actorInitial}
                            </div>
                            <div className="min-w-0">
                              <p className="text-slate-900 dark:text-white font-bold text-xs truncate max-w-[150px]">
                                {actorName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">
                                {log.profiles?.role || 'SYSTEM'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                          <ActionBadge action={log.action} />
                        </td>

                        <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <EntityIcon entityName={log.entity_name} className="w-7 h-7" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                                {entityDisplayName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono" title={log.entity_id}>
                                ID: {log.entity_id ? `${log.entity_id.substring(0, 8)}...` : '---'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap text-right">
                          <button 
                            type="button"
                            onClick={() => setSelectedLog(log)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[#003B5C] dark:text-blue-300 text-xs font-bold rounded-xl shadow-2xs transition-all active:scale-95"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

        </section>

      </main>

      {/* Responsive Inspection Modal (Bottom Sheet on Mobile, Centered Dialog on Tablet/Desktop) */}
      {selectedLog && (
        <div 
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSelectedLog(null)}
        >
          <div 
            className="bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-h-[92vh] sm:max-h-[85vh] sm:max-w-3xl md:max-w-4xl flex flex-col overflow-hidden border-t sm:border border-slate-200 dark:border-slate-700"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/80 flex items-start justify-between gap-3 shrink-0">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <ActionBadge action={selectedLog.action} />
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    {entityNameMap[selectedLog.entity_name] || selectedLog.entity_name.replace(/_/g, ' ')}
                  </h3>
                </div>
                
                {/* Contextual Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs pt-0.5">
                  {inspectedStudentName && (
                    <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 font-bold border border-blue-200/60 dark:border-blue-900/50 flex items-center gap-1">
                      <User className="w-3 h-3 text-[#003B5C] dark:text-blue-400" />
                      <span>{inspectedStudentName}</span>
                    </span>
                  )}
                  {inspectedStudentClass && (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold border border-emerald-200/60 dark:border-emerald-900/50 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      <span>{inspectedStudentClass}</span>
                    </span>
                  )}
                  {inspectedFeeType && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold border border-amber-200/60 dark:border-amber-900/50 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-amber-600" />
                      <span>{inspectedFeeType}</span>
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Stacked on phone, Dual Column on tablet/desktop */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Previous State Payload */}
                <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                  <div className="bg-rose-50/90 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/50 px-3.5 py-2 flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    <h4 className="text-[11px] font-black text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                      Previous Record State
                    </h4>
                  </div>
                  <div className="p-3 sm:p-4 bg-slate-950 overflow-x-auto max-h-[220px] sm:max-h-[340px]">
                    <pre className="text-xs font-mono text-rose-300 leading-relaxed whitespace-pre-wrap break-all">
                      {selectedLog.old_data && Object.keys(selectedLog.old_data).length > 0 
                        ? JSON.stringify(selectedLog.old_data, null, 2) 
                        : '// No previous record (INSERT transaction)'}
                    </pre>
                  </div>
                </div>

                {/* New Payload State */}
                <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
                  <div className="bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50 px-3.5 py-2 flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-[11px] font-black text-emerald-900 dark:text-emerald-200 uppercase tracking-wider">
                      Committed Payload
                    </h4>
                  </div>
                  <div className="p-3 sm:p-4 bg-slate-950 overflow-x-auto max-h-[220px] sm:max-h-[340px]">
                    <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
                      {selectedLog.new_data && Object.keys(selectedLog.new_data).length > 0 
                        ? JSON.stringify(selectedLog.new_data, null, 2) 
                        : '// Record deleted (DELETE transaction)'}
                    </pre>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer Metadata */}
            <div className="p-3.5 sm:px-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-700/80 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 shrink-0">
              <span className="truncate max-w-full">
                Transaction UUID: {selectedLog.id}
              </span>
              <span>
                {format(new Date(selectedLog.created_at), 'dd MMM yyyy, HH:mm:ss')}
              </span>
            </div>

          </div>
        </div>
      )}

      {/* Footer */}
      <PortalFooter />
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number; icon: any; color: string }) {
  const colorMap: Record<string, { bg: string; icon: string }> = {
    blue: { bg: 'bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300', icon: 'text-[#003B5C] dark:text-blue-400' },
    emerald: { bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', icon: 'text-emerald-600 dark:text-emerald-400' },
    amber: { bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', icon: 'text-amber-600 dark:text-amber-400' },
    rose: { bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300', icon: 'text-rose-600 dark:text-rose-400' }
  }
  const styling = colorMap[color] || colorMap.blue

  return (
    <div className="bg-white dark:bg-slate-800/90 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between h-full space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${styling.bg}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white truncate">
        {value}
      </p>
    </div>
  )
}

function EntityIcon({ entityName, className }: { entityName: string; className?: string }) {
  const isFinance = entityName.startsWith('fee_')
  const isStudent = entityName === 'students'
  const isScore = entityName === 'scores'
  const isAttendance = entityName === 'student_attendance'

  return (
    <div className={`rounded-xl flex items-center justify-center shrink-0 ${
      isFinance ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/70 dark:border-amber-900/50' :
      isStudent ? 'bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/70 dark:border-blue-900/50' :
      isScore ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200/70 dark:border-purple-900/50' :
      isAttendance ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-900/50' :
      'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
    } ${className || 'w-8 h-8'}`}>
      {isFinance ? <DollarSign className="w-4 h-4" /> :
       isStudent ? <User className="w-4 h-4" /> :
       isScore ? <GraduationCap className="w-4 h-4" /> :
       isAttendance ? <Clock className="w-4 h-4" /> :
       <Database className="w-4 h-4" />}
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'INSERT') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 uppercase tracking-wider border border-emerald-200/80 dark:border-emerald-900/50 shrink-0">
        <Plus className="w-3 h-3" />
        <span>INSERT</span>
      </span>
    )
  }
  if (action === 'UPDATE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 uppercase tracking-wider border border-blue-200/80 dark:border-blue-900/50 shrink-0">
        <RefreshCw className="w-3 h-3" />
        <span>UPDATE</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 uppercase tracking-wider border border-rose-200/80 dark:border-rose-900/50 shrink-0">
      <Trash2 className="w-3 h-3" />
      <span>DELETE</span>
    </span>
  )
}