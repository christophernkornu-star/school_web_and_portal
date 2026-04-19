'use client'

import { useState, useEffect } from 'react'
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
  Filter,
  User,
  GraduationCap
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

export default function AuditLogsPage() {
  const supabase = getSupabaseBrowserClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('ALL')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [inspectedStudentName, setInspectedStudentName] = useState<string | null>(null)
  const [inspectedStudentClass, setInspectedStudentClass] = useState<string | null>(null)

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (!selectedLog) {
      setInspectedStudentName(null)
      setInspectedStudentClass(null)
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
        .limit(150)

      if (error) throw error
      setLogs((data as any[]) || [])
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      (log.entity_name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.action?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      ((log.profiles?.full_name || 'System').toLowerCase().includes(searchTerm.toLowerCase()))
      
    const matchesAction = filterAction === 'ALL' || log.action === filterAction
    
    return matchesSearch && matchesAction
  })

  // Calculate some quick stats
  const totalInsert = logs.filter(l => l.action === 'INSERT').length
  const totalUpdate = logs.filter(l => l.action === 'UPDATE').length
  const totalDelete = logs.filter(l => l.action === 'DELETE').length

  return (
    <div className="bg-gray-50/50 min-h-screen pb-20 font-sans">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-3xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/60 to-transparent pointer-events-none"></div>
          
          <div className="flex items-center gap-4 relative z-10">
            <BackButton href="/admin" className="shadow-sm" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <ShieldAlert className="w-8 h-8 text-indigo-600" />
                System Audit Logs
              </h1>
              <p className="text-sm sm:text-base text-gray-500 font-medium mt-1">
                Track and monitor security events and database mutations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-indigo-700 bg-indigo-50/80 px-4 py-2 rounded-xl border border-indigo-100/50 shadow-sm relative z-10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Live Activity Monitored
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Events" value={logs.length} icon={History} color="indigo" />
          <StatCard title="Creations (INSERT)" value={totalInsert} icon={Database} color="emerald" />
          <StatCard title="Modifications (UPDATE)" value={totalUpdate} icon={UserCog} color="blue" />
          <StatCard title="Deletions (DELETE)" value={totalDelete} icon={ShieldAlert} color="red" />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05)] border border-gray-100 flex flex-col min-h-[500px]">
          
          {/* Filters & Search */}
          <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50 rounded-t-3xl">
<div className="relative w-full md:w-96 mb-2 md:mb-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search entities, actors, or actions..." 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium placeholder:font-normal text-gray-900 shadow-sm"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              <div className="flex items-center gap-2 p-1.5 bg-gray-200/50 rounded-xl shrink-0">
                {['ALL', 'INSERT', 'UPDATE', 'DELETE'].map(action => (
                  <button
                    key={action}
                    onClick={() => setFilterAction(action)}
                    className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all tracking-wide ${
                      filterAction === action 
                        ? 'bg-white text-indigo-700 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]' 
                        : 'text-gray-500 hover:text-gray-900 bg-transparent'
                    }`}
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-4 sm:p-6 whitespace-nowrap">Timestamp</th>
                  <th className="p-4 sm:p-6 whitespace-nowrap">Actor</th>
                  <th className="p-4 sm:p-6 whitespace-nowrap">Action</th>
                  <th className="p-4 sm:p-6 whitespace-nowrap">Target Entity</th>
                  <th className="p-4 sm:p-6 whitespace-nowrap text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm font-medium text-gray-700">
                {loading ? (
                   <tr>
                     <td colSpan={5} className="p-16 text-center">
                       <div className="flex flex-col items-center justify-center space-y-4">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                         <p className="text-sm font-bold text-gray-500 tracking-wide">Decrypting Audit Trail...</p>
                       </div>
                     </td>
                   </tr>
                ) : filteredLogs.length === 0 ? (
                   <tr>
                     <td colSpan={5} className="p-16 text-center">
                       <div className="flex flex-col items-center justify-center space-y-3">
                         <History className="h-10 w-10 text-gray-300" />
                         <p className="text-sm font-bold text-gray-500">No matching audit logs found.</p>
                       </div>
                     </td>
                   </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-indigo-50/40 transition-colors group">
                      <td className="p-4 sm:px-6 whitespace-nowrap py-4">
                        <div className="flex items-center gap-2.5">
                           <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                             <Clock className="w-4 h-4 text-gray-400 group-hover:text-indigo-400 transition-colors" />
                           </div>
                           <div className="flex flex-col">
                             <span className="text-gray-900 font-bold text-[13px]">{format(new Date(log.created_at), 'MMM dd, yyyy')}</span>
                             <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                           </div>
                        </div>
                      </td>
                      <td className="p-4 sm:px-6 whitespace-nowrap py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shrink-0 border ${
                            log.profiles?.role === 'admin' ? 'bg-indigo-50 border-indigo-200/60 text-indigo-700' : 'bg-gray-50 border-gray-200/60 text-gray-600'
                          }`}>
                             {log.profiles?.full_name ? log.profiles.full_name[0].toUpperCase() : 'S'}
                          </div>
                          <div>
                            <p className="text-gray-900 font-bold group-hover:text-indigo-600 transition-colors text-[13px]">
                              {log.profiles?.full_name || 'System Auto'}
                            </p>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-0.5">{log.profiles?.role || 'SYSTEM'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 sm:px-6 whitespace-nowrap py-4">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="p-4 sm:px-6 whitespace-nowrap py-4">
                        <div>
                          <p className="text-gray-900 font-bold text-[13px]">{log.entity_name}</p>
                          <p className="text-[11px] text-gray-400 font-mono tracking-tight group-hover:text-indigo-500 transition-colors cursor-help mt-0.5" title={log.entity_id}>
                            id: {log.entity_id.substring(0,8)}...
                          </p>
                        </div>
                      </td>
                      <td className="p-4 sm:px-6 whitespace-nowrap py-4 text-right">
                        <button 
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200/80 hover:border-indigo-300 hover:bg-indigo-50 text-indigo-600 text-xs font-bold rounded-xl transition-all shadow-sm group-hover:shadow hover:-translate-y-0.5"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* JSON Inspection Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 ring-1 ring-white/10">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 bg-gray-50/80 border-b border-gray-100 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-64 h-full bg-gradient-to-l from-indigo-50/30 to-transparent pointer-events-none"></div>
              
              <div className="flex items-center gap-4 relative z-10 w-full">
                <ActionBadge action={selectedLog.action} />
                <div className="flex flex-col ml-2">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">
                    <span className="text-gray-400 font-bold mr-2 text-sm uppercase tracking-widest">Entity:</span> 
                    {selectedLog.entity_name}
                  </h3>
                  {inspectedStudentName && (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50/60 w-fit px-2.5 py-0.5 rounded-md border border-indigo-100 shadow-sm">
                        <User className="w-3.5 h-3.5" />
                        <span>{inspectedStudentName}</span>
                      </div>
                      {inspectedStudentClass && (
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50/60 w-fit px-2.5 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{inspectedStudentClass}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={() => setSelectedLog(null)}
                  className="p-2.5 hover:bg-gray-200/80 rounded-full transition-colors text-gray-500 border border-transparent hover:border-gray-300 shadow-sm ml-auto"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Modal Payload Inspector */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-6 bg-gray-50 flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
                
                <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-red-50/50 border-b border-red-100 px-4 py-3 flex items-center gap-2">
                    <div className="p-1.5 bg-red-100 text-red-500 rounded-md"><History className="w-3.5 h-3.5" /></div>
                    <h4 className="text-[11px] font-black text-red-800 uppercase tracking-widest">Previous State</h4>
                  </div>
                  <div className="bg-[#1e1e1e] p-5 overflow-auto flex-1 h-[400px]">
                    <pre className="text-[13px] font-mono text-red-300/90 leading-relaxed font-semibold">
                      {selectedLog.old_data && Object.keys(selectedLog.old_data).length > 0 
                        ? JSON.stringify(selectedLog.old_data, null, 2) 
                        : '// No previous data state recorded\n// Usually indicates a new INSERT operation.'}
                    </pre>
                  </div>
                </div>

                <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="bg-emerald-50/50 border-b border-emerald-100 px-4 py-3 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-md"><Database className="w-3.5 h-3.5" /></div>
                    <h4 className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">New Payload / State</h4>
                  </div>
                  <div className="bg-[#1e1e1e] p-5 overflow-auto flex-1 h-[400px]">
                    <pre className="text-[13px] font-mono text-emerald-300/90 leading-relaxed font-semibold">
                      {selectedLog.new_data && Object.keys(selectedLog.new_data).length > 0 
                        ? JSON.stringify(selectedLog.new_data, null, 2) 
                        : '// No new data state recorded\n// Usually indicates a DELETE operation.'}
                    </pre>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:px-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row sm:justify-between items-center gap-2 text-xs font-bold text-gray-500">
               <div className="flex items-center gap-2">
                 <ShieldAlert className="w-3.5 h-3.5 text-gray-400" />
                 Trace ID: <span className="font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md text-[10px]">{selectedLog.id}</span>
               </div>
               <div className="flex items-center gap-1.5">
                 <Clock className="w-3.5 h-3.5 text-gray-400" />
                 Recorded: {format(new Date(selectedLog.created_at), 'dd MMM yyyy, HH:mm:ss.SSS')}
               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
     indigo: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
     emerald: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100',
     blue: 'bg-blue-50 text-blue-600 group-hover:bg-blue-100',
     red: 'bg-red-50 text-red-600 group-hover:bg-red-100'
  }
  const bgClass = colorMap[color] || colorMap.indigo

  return (
    <div className="bg-white p-6 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.04)] border border-gray-100 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-pointer h-full">
      <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-[40px] opacity-40 transition-colors ${bgClass.replace('text-', 'bg-')}`}></div>
      <div className="relative z-10 flex flex-col items-start">
         <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-colors ${bgClass}`}>
             <Icon className="w-6 h-6" />
         </div>
         <h3 className="text-3xl font-black text-gray-900 mb-1">{value}</h3>
         <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</p>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: string }) {
  if (action === 'INSERT') {
    return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-emerald-50 text-emerald-700 uppercase tracking-widest border border-emerald-200/50 shadow-sm"><PlusIcon /> INSERT</span>
  }
  if (action === 'UPDATE') {
    return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-blue-50 text-blue-700 uppercase tracking-widest border border-blue-200/50 shadow-sm"><RefreshIcon /> UPDATE</span>
  }
  return <span className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black bg-red-50 text-red-700 uppercase tracking-widest border border-red-200/50 shadow-sm"><DeleteIcon /> DELETE</span>
}

const PlusIcon = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
const RefreshIcon = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
const DeleteIcon = () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
