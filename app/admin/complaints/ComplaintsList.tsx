'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { updateComplaintStatus } from '@/app/actions/complaints'
import { toast } from 'react-hot-toast'
import { 
  Search, 
  Filter, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  ArrowLeft,
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Loader2,
  Save,
  Check,
  Send,
  Lightbulb
} from 'lucide-react'

type Complaint = {
  id: string
  type: 'complaint' | 'suggestion'
  subject: string
  message: string
  status: 'pending' | 'reviewed' | 'resolved'
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  admin_response?: string
  created_at: string
}

export default function ComplaintsList({ initialComplaints }: { initialComplaints: Complaint[] }) {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all')
  const [search, setSearch] = useState('')
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [response, setResponse] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Status counts for filter chips
  const counts = useMemo(() => {
    return {
      all: complaints.length,
      pending: complaints.filter(c => c.status === 'pending').length,
      reviewed: complaints.filter(c => c.status === 'reviewed').length,
      resolved: complaints.filter(c => c.status === 'resolved').length,
    }
  }, [complaints])

  const filteredComplaints = useMemo(() => {
    return complaints.filter(c => {
      const matchesFilter = filter === 'all' || c.status === filter
      const term = search.toLowerCase().trim()
      const matchesSearch = 
        !term ||
        c.subject.toLowerCase().includes(term) || 
        c.message.toLowerCase().includes(term) ||
        (c.contact_name && c.contact_name.toLowerCase().includes(term)) ||
        (c.contact_email && c.contact_email.toLowerCase().includes(term)) ||
        (c.contact_phone && c.contact_phone.includes(term))

      return matchesFilter && matchesSearch
    })
  }, [complaints, filter, search])

  const handleSelectComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setResponse(complaint.admin_response || '')
  }

  const handleStatusUpdate = async (newStatus: 'pending' | 'reviewed' | 'resolved') => {
    if (!selectedComplaint) return

    setIsUpdating(true)
    try {
      const result = await updateComplaintStatus(selectedComplaint.id, newStatus, response)
      if (result.success) {
        toast.success(`Inquiry marked as ${newStatus}`)
        
        const updatedList = complaints.map(c => 
          c.id === selectedComplaint.id 
            ? { ...c, status: newStatus, admin_response: response || c.admin_response } 
            : c
        )
        setComplaints(updatedList)
        setSelectedComplaint(prev => prev ? { ...prev, status: newStatus, admin_response: response || prev.admin_response } : null)
      } else {
        toast.error(result.error || 'Failed to update inquiry status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('An unexpected error occurred while updating status')
    } finally {
      setIsUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
      case 'reviewed':
        return 'bg-blue-50 text-[#003B5C] border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50'
      case 'resolved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3.5 h-3.5 text-amber-500" />
      case 'reviewed':
        return <MessageSquare className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
      case 'resolved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
    }
  }

  return (
    <div className="w-full">
      
      {/* Master-Detail Responsive Container */}
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-[600px] lg:h-[calc(100dvh-12.5rem)]">
        
        {/* Left / Master Pane: Search, Filters & Inquiries List */}
        <div 
          className={`w-full lg:w-[420px] xl:w-[460px] bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col overflow-hidden shrink-0 ${
            selectedComplaint ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Filter Header & Search Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-700/80 space-y-3 bg-slate-50/50 dark:bg-slate-900/40">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search subject, message, or submitter..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden select-none">
              {(['all', 'pending', 'reviewed', 'resolved'] as const).map((tab) => {
                const isActive = filter === tab
                const count = counts[tab]

                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setFilter(tab)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition active:scale-95 ${
                      isActive
                        ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{tab}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Inquiries Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 overscroll-contain">
            {filteredComplaints.length === 0 ? (
              <div className="p-8 sm:p-12 text-center space-y-2 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                  No submissions found
                </p>
                <p className="text-[11px] text-slate-400">
                  {search ? 'Try clearing or modifying your search keywords.' : 'There are no items recorded under this category.'}
                </p>
              </div>
            ) : (
              filteredComplaints.map((item) => {
                const isSelected = selectedComplaint?.id === item.id
                const isComplaint = item.type === 'complaint'

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectComplaint(item)}
                    className={`p-3.5 sm:p-4 cursor-pointer transition-all active:scale-[0.99] border-l-4 ${
                      isSelected
                        ? 'bg-blue-50/70 dark:bg-blue-950/30 border-l-[#003B5C] dark:border-l-blue-400'
                        : 'border-l-transparent hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {/* Item Top: Type Tag & Timestamp */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                        isComplaint
                          ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300'
                          : 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300'
                      }`}>
                        {isComplaint ? <AlertCircle className="w-3 h-3" /> : <Lightbulb className="w-3 h-3" />}
                        <span>{item.type}</span>
                      </span>

                      <span className="text-[11px] font-mono text-slate-400 shrink-0">
                        {format(new Date(item.created_at), 'MMM d, yyyy')}
                      </span>
                    </div>

                    {/* Subject Line */}
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {item.subject}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                      {item.message}
                    </p>

                    {/* Item Footer: Submitter & Status Chip */}
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[11px] font-medium text-slate-400 truncate max-w-[170px]">
                        From: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{item.contact_name || 'Anonymous Submitter'}</strong>
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border shrink-0 ${getStatusBadge(item.status)}`}>
                        {getStatusIcon(item.status)}
                        <span>{item.status}</span>
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right / Detail Pane: Selected Inquiry Dossier & Admin Resolution Form */}
        <div 
          className={`flex-1 bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex-col overflow-hidden ${
            selectedComplaint ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {selectedComplaint ? (
            <>
              {/* Detail Header Bar */}
              <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-900/40 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button 
                    type="button"
                    onClick={() => setSelectedComplaint(null)}
                    className="lg:hidden p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 shrink-0 active:scale-95"
                    aria-label="Back to complaints list"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                      Dossier View
                    </span>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">
                      {selectedComplaint.subject}
                    </h2>
                  </div>
                </div>

                {/* Status Switch Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedComplaint.status !== 'resolved' ? (
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate('resolved')}
                      disabled={isUpdating}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 disabled:opacity-50"
                    >
                      {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200/80">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Resolved</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Dossier Body Content */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 overscroll-contain">
                
                {/* Meta Summary Badge Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                      selectedComplaint.type === 'complaint'
                        ? 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300'
                        : 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300'
                    }`}>
                      {selectedComplaint.type}
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${getStatusBadge(selectedComplaint.status)}`}>
                      {getStatusIcon(selectedComplaint.status)}
                      <span>{selectedComplaint.status}</span>
                    </span>
                  </div>

                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{format(new Date(selectedComplaint.created_at), 'PPP p')}</span>
                  </span>
                </div>

                {/* Primary Message Narrative Box */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Submission Narrative
                  </span>
                  <div className="bg-slate-50/80 dark:bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed font-medium">
                    {selectedComplaint.message}
                  </div>
                </div>

                {/* Submitter Contact Coordinates */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Submitter Contact Coordinates
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 bg-slate-50/50 dark:bg-slate-900/40 p-3 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Name</span>
                      <p className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                        {selectedComplaint.contact_name || <span className="text-slate-400 font-normal italic">Anonymous</span>}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Address</span>
                      {selectedComplaint.contact_email ? (
                        <a 
                          href={`mailto:${selectedComplaint.contact_email}`} 
                          className="font-bold text-[#003B5C] dark:text-blue-400 hover:underline mt-0.5 block truncate"
                          title={selectedComplaint.contact_email}
                        >
                          {selectedComplaint.contact_email}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal italic mt-0.5 block">Not provided</span>
                      )}
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Telephone</span>
                      {selectedComplaint.contact_phone ? (
                        <a 
                          href={`tel:${selectedComplaint.contact_phone}`} 
                          className="font-mono font-bold text-[#003B5C] dark:text-blue-400 hover:underline mt-0.5 block"
                        >
                          {selectedComplaint.contact_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 font-normal italic mt-0.5 block">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Administrative Resolution & Response Notes Form */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Admin Action Notes &amp; Official Response
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Internal Documentation</span>
                  </div>

                  <textarea
                    rows={3}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Enter resolution notes, outcome details, or direct response remarks..."
                    className="w-full p-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition resize-none placeholder:text-slate-400 leading-relaxed"
                  />

                  {/* Action Buttons Row */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStatusUpdate('reviewed')}
                      disabled={isUpdating || selectedComplaint.status === 'reviewed'}
                      className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition active:scale-95 disabled:opacity-50 text-center"
                    >
                      Mark as Reviewed
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusUpdate(selectedComplaint.status)}
                      disabled={isUpdating}
                      className="inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isUpdating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Save className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <span>Save Notes</span>
                    </button>
                  </div>
                </div>

              </div>
            </>
          ) : (
            /* Blank Placeholder when no complaint is selected (Desktop) */
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center shadow-inner">
                <MessageSquare className="w-7 h-7 opacity-35" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  No Inquiry Selected
                </h3>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                  Select a grievance or suggestion from the left roster to inspect details and record administrative actions.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  )
}