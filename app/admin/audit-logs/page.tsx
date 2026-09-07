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
  Layers
} from 'lucide-react'

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
  student_attendance: 'Attendance',
  student_remarks: 'Remarks',
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
      const matchesSearch =
        (log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entityNameMap[log.entity_name]?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.action?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ((log.profiles?.full_name || 'System').toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesAction = filterAction === 'ALL' || log.action === filterAction

      return matchesSearch && matchesAction
    })
  }, [logs, searchTerm, filterAction])

  const totalInsert = useMemo(() => logs.filter(l => l.action === 'INSERT').length, [logs])
  const totalUpdate = useMemo(() => logs.filter(l => l.action === 'UPDATE').length, [logs])
  const totalDelete = useMemo(() => logs.filter(l => l.action === 'DELETE').length, [logs])

  return (
    <div className="bg-gray-50/50 min-h-screen pb-24 font-sans">
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-7 md:p-8 rounded-2xl sm:rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/70 to-transparent pointer-events-none"></div>
          
          <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 relative z-10">
            <BackButton href="/admin/dashboard" className="shadow-sm shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 shrink-0" />
                <span>System Audit Logs</span>
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-gray-500 font-medium mt-0.5 sm:mt-1">
                Track security events, data adjustments, and critical record history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto text-xs sm:text-sm font-bold text-indigo-700 bg-indigo-50/90 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl border border-indigo-100/60 shadow-sm relative z-10">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Live Monitoring
          </div>
        </div>

        {/* Sub Navigation Tabs */}
        <div className="flex items-center gap-2 bg-white p-1.5 sm:p-2 rounded-xl sm:rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 w-full sm:w-fit overflow-x-auto">
          <Link
            href="/admin/audit-logs"
            className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 text-xs font-black rounded-lg sm:rounded-xl transition-all tracking-wide bg-indigo-600 text-white shadow-md whitespace-nowrap"
          >
            <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            All Events
          </Link>
          <Link
            href="/admin/audit-logs/finance"
            className="flex items-center justify-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial px-3 sm:px-5 py-2 sm:py-2.5 text-xs font-black rounded-lg sm:rounded-xl transition-all tracking-wide text-gray-500 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
          >
            <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            Finance
          </Link>
        </div>

        {/* Quick Stats Grid: 2-col on phone, 4-col on tablet/desktop */}
        <div className="grid gap-3 sm:gap-4 md:gap-5 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Events" value={logs.length} icon={History} color="indigo" />
          <StatCard title="Creations" value={totalInsert} icon={Database} color="emerald" />
          <StatCard title="Modifications" value={totalUpdate} icon={UserCog} color="blue" />
          <StatCard title="Deletions" value={totalDelete} icon={ShieldAlert} color="red" />
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col min-h-[460px] overflow-hidden">
          
          {/* Responsive Filters */}
          <div className="p-3.5 sm:p-5 md:p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-gray-50/60">
            <div className="relative w-full sm:w-80 md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search entities, actors, actions..." 
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-gray-900 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-1 p-1 bg-gray-200/60 rounded-xl overflow-x-auto w-full sm:w-auto">
              {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map(action => (
                <button
                  key={action}
                  onClick={() => setFilterAction(action)}
                  className={`flex-1 sm:flex-initial px-3 py-1.5 text-[10px] font-black rounded-lg transition-all tracking-wider whitespace-nowrap ${
                    filterAction === action 
                      ? 'bg-white text-indigo-700 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900 bg-transparent'
                  }`}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile & Tablet Card View (Screen Width < 768px) */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Loading events...</p>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-10 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <History className="h-9 w-9 text-gray-300" />
                  <p className="text-sm font-bold text-gray-600">No matching audit logs found</p>
                  <p className="text-xs text-gray-400">Try changing your search terms or filters</p>
                </div>
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="p-4 sm:p-5 active:bg-indigo-50/20 transition-colors">
                  {/* Top Meta Row */}
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                        log.profiles?.role === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-100 border-gray-200 text-gray-700'
                      }`}>
                        {log.profiles?.full_name ? log.profiles.full_name[0].toUpperCase() : 'S'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-gray-900 font-bold text-xs truncate">
                          {log.profiles?.full_name || 'System Auto'}
                        </p>
                        <p className="text-[10px] text-gray-400 font-semibold tracking-wider">
                          {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <ActionBadge action={log.action} />
                  </div>

                  {/* Entity Details Card */}
                  <div className="flex items-center gap-2.5 my-2.5 bg-gray-50/80 p-2.5 rounded-xl border border-gray-100">
                    <EntityIcon entityName={log.entity_name} className="w-8 h-8" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-800 truncate">
                        {entityNameMap[log.entity_name] || log.entity_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">
                        ID: {log.entity_id}
                      </p>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      Role: {log.profiles?.role || 'SYSTEM'}
                    </span>
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-indigo-700 text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Inspect Payload
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop & Tablet-Landscape Table (Screen Width ≥ 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 lg:px-6 whitespace-nowrap">Timestamp</th>
                  <th className="p-4 lg:px-6 whitespace-nowrap">Actor</th>
                  <th className="p-4 lg:px-6 whitespace-nowrap">Action</th>
                  <th className="p-4 lg:px-6 whitespace-nowrap">Target Entity</th>
                  <th className="p-4 lg:px-6 whitespace-nowrap text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Decrypting Audit Trail...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <History className="h-9 w-9 text-gray-300" />
                        <p className="text-sm font-bold text-gray-600">No matching audit logs found</p>
                        <p className="text-xs text-gray-400">Mutations and administrative events will appear here.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log: AuditLog) => (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="p-4 lg:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <Clock className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                          <div className="flex flex-col">
                            <span className="text-gray-900 font-bold text-xs">{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                            <span className="text-[10px] text-gray-400 font-semibold">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 lg:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                            log.profiles?.role === 'admin' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-100 border-gray-200 text-gray-700'
                          }`}>
                            {log.profiles?.full_name ? log.profiles.full_name[0].toUpperCase() : 'S'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-900 font-bold text-xs truncate max-w-[140px]">
                              {log.profiles?.full_name || 'System Auto'}
                            </p>
                            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{log.profiles?.role || 'SYSTEM'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 lg:px-6 whitespace-nowrap">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="p-4 lg:px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <EntityIcon entityName={log.entity_name} className="w-7 h-7" />
                          <div>
                            <p className="text-xs font-bold text-gray-900">
                              {entityNameMap[log.entity_name] || log.entity_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono cursor-help" title={log.entity_id}>
                              id: {log.entity_id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 lg:px-6 whitespace-nowrap text-right">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg transition-all shadow-sm group-hover:shadow"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Responsive Inspection Modal: Fullscreen on mobile, centered dialog on tablet & desktop */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-h-[92vh] sm:max-h-[85vh] sm:max-w-3xl md:max-w-4xl flex flex-col overflow-hidden border-t sm:border border-gray-100">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-100 flex items-start justify-between gap-3 shrink-0">
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <ActionBadge action={selectedLog.action} />
                  <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 tracking-tight">
                    {entityNameMap[selectedLog.entity_name] || selectedLog.entity_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </h3>
                </div>
                
                {/* Contextual Meta Badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {inspectedStudentName && (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/60 flex items-center gap-1">
                      <User className="w-3 h-3 text-indigo-600" />
                      {inspectedStudentName}
                    </span>
                  )}
                  {inspectedStudentClass && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60 flex items-center gap-1">
                      <GraduationCap className="w-3 h-3 text-emerald-600" />
                      {inspectedStudentClass}
                    </span>
                  )}
                  {inspectedFeeType && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold border border-amber-200/60 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-amber-600" />
                      {inspectedFeeType}
                    </span>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400 hover:text-gray-700 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Two-column responsive JSON viewer */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-gray-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Previous State */}
                <div className="flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="bg-rose-50/80 border-b border-rose-100 px-4 py-2.5 flex items-center gap-2">
                    <History className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider">Previous State</h4>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#1e1e1e] overflow-auto max-h-[200px] sm:max-h-[320px]">
                    <pre className="text-xs font-mono text-rose-300 leading-relaxed whitespace-pre-wrap break-all">
                      {selectedLog.old_data && Object.keys(selectedLog.old_data).length > 0 
                        ? JSON.stringify(selectedLog.old_data, null, 2) 
                        : '// No previous record (INSERT operation)'}
                    </pre>
                  </div>
                </div>

                {/* New State */}
                <div className="flex flex-col rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                  <div className="bg-emerald-50/80 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider">New Payload</h4>
                  </div>
                  <div className="p-3 sm:p-4 bg-[#1e1e1e] overflow-auto max-h-[200px] sm:max-h-[320px]">
                    <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap break-all">
                      {selectedLog.new_data && Object.keys(selectedLog.new_data).length > 0 
                        ? JSON.stringify(selectedLog.new_data, null, 2) 
                        : '// Record deleted (DELETE operation)'}
                    </pre>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 sm:px-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between items-start sm:items-center gap-1.5 text-[11px] font-semibold text-gray-500 shrink-0">
              <span className="font-mono truncate max-w-full">
                ID: {selectedLog.id}
              </span>
              <span>
                {format(new Date(selectedLog.created_at), 'dd MMM yyyy, HH:mm:ss')}
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600'
  }
  const bgClass = colorMap[color] || colorMap.indigo

  return (
    <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden flex flex-col justify-between h-full">
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center shrink-0 ${bgClass}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider truncate">
          {title}
        </span>
      </div>
      <h3 
        className="text-base sm:text-xl md:text-2xl font-black text-gray-900 truncate" 
        title={String(value)}
      >
        {value}
      </h3>
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
      isFinance ? 'bg-amber-50 text-amber-600 border border-amber-200/70' :
      isStudent ? 'bg-indigo-50 text-indigo-600 border border-indigo-200/70' :
      isScore ? 'bg-purple-50 text-purple-600 border border-purple-200/70' :
      isAttendance ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/70' :
      'bg-blue-50 text-blue-600 border border-blue-200/70'
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
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-200/50 shrink-0">
        <PlusIcon /> INSERT
      </span>
    )
  }
  if (action === 'UPDATE') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black bg-blue-50 text-blue-700 uppercase tracking-widest border border-blue-200/50 shrink-0">
        <RefreshIcon /> UPDATE
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-black bg-red-50 text-red-700 uppercase tracking-widest border border-red-200/50 shrink-0">
      <DeleteIcon /> DELETE
    </span>
  )
}

const PlusIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)

const RefreshIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
)

const DeleteIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)