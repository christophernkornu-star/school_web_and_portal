'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  Calendar as CalendarIcon, 
  Plus, 
  MapPin, 
  Clock, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  EyeOff, 
  Eye, 
  CalendarDays,
  Filter
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface SchoolEvent {
  id: string
  title: string
  description?: string
  event_date: string
  event_time?: string
  location?: string
  event_type: 'academic' | 'sports' | 'cultural' | 'religious' | 'other'
  published: boolean
  created_at?: string
}

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'religious', label: 'Religious' },
  { value: 'other', label: 'General / Other' },
]

export default function EventsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    event_type: 'academic' as SchoolEvent['event_type'],
    published: true,
  })

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })

      if (error) throw error
      if (data) setEvents(data as SchoolEvent[])
    } catch (err: any) {
      toast.error('Failed to load school events')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setEditingId(null)
    setFormData({
      title: '',
      description: '',
      event_date: '',
      event_time: '',
      location: '',
      event_type: 'academic',
      published: true,
    })
  }

  function openAddModal() {
    resetForm()
    setShowModal(true)
  }

  function openEditModal(event: SchoolEvent) {
    setEditingId(event.id)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date ? event.event_date.split('T')[0] : '',
      event_time: event.event_time || '',
      location: event.location || '',
      event_type: event.event_type || 'academic',
      published: event.published ?? true,
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.title.trim() || !formData.event_date) {
      toast.error('Event title and date are required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_date: formData.event_date,
        event_time: formData.event_time || null,
        location: formData.location.trim() || null,
        event_type: formData.event_type,
        published: formData.published,
      }

      if (editingId) {
        const { error } = await supabase
          .from('events')
          .update(payload)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Event updated successfully!')
      } else {
        const { error } = await supabase
          .from('events')
          .insert([payload])

        if (error) throw error
        toast.success('Event created successfully!')
      }

      setShowModal(false)
      resetForm()
      loadData()
    } catch (error: any) {
      toast.error(error.message || 'Error saving event')
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    if (!selectedEvent) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', selectedEvent.id)

      if (error) throw error

      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id))
      toast.success('Event deleted successfully!')
      setShowDeleteModal(false)
      setSelectedEvent(null)
    } catch (error: any) {
      toast.error('Failed to delete event')
    } finally {
      setSaving(false)
    }
  }

  async function togglePublished(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('events')
        .update({ published: !currentStatus })
        .eq('id', id)

      if (error) throw error

      setEvents(prev =>
        prev.map(e => e.id === id ? { ...e, published: !currentStatus } : e)
      )
      toast.success(!currentStatus ? 'Event published to calendar' : 'Event moved to drafts')
    } catch (error: any) {
      toast.error('Error updating status')
    }
  }

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesType = selectedType === 'all' || event.event_type === selectedType
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        event.title.toLowerCase().includes(query) ||
        (event.description && event.description.toLowerCase().includes(query)) ||
        (event.location && event.location.toLowerCase().includes(query))

      return matchesType && matchesSearch
    })
  }, [events, selectedType, searchQuery])

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]
    const upcoming = events.filter(e => e.event_date >= today).length
    const published = events.filter(e => e.published).length

    return {
      total: events.length,
      upcoming,
      published,
      drafts: events.length - published
    }
  }, [events])

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    School Events &amp; Calendar
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Schedule academic terms, sports meets, cultural ceremonies, and exams
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Schedule Event</span>
              <span className="sm:hidden">Add</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* KPI Summary Strip */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Total Events
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.total}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Upcoming Ahead
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-[#003B5C] dark:text-blue-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.upcoming}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Live on Portal
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.published}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Unpublished
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.drafts}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </section>

        {/* Search & Event Type Filter Section */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search events by title, description, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/70 dark:border-slate-700">
                <CalendarIcon className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                <span>{filteredEvents.length} of {events.length} Events</span>
              </span>
            </div>
          </div>

          {/* Event Type Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs font-bold select-none">
            {EVENT_TYPES.map(tab => {
              const isActive = selectedType === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSelectedType(tab.value)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </section>

        {/* Events Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 md:gap-5">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 space-y-4">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-2/3 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-1/2 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-14 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {searchQuery || selectedType !== 'all' ? 'No matching events found' : 'No school events scheduled yet'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedType !== 'all'
                  ? 'Try modifying your search criteria or switching to another event category.'
                  : 'Keep staff, parents, and students informed by scheduling the term calendar.'}
              </p>
            </div>
            {searchQuery || selectedType !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedType('all')
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Clear Active Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Schedule First Event</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4 md:gap-5">
            {filteredEvents.map(event => {
              const eventDateObj = new Date(event.event_date)
              const month = isNaN(eventDateObj.getTime())
                ? 'CAL'
                : eventDateObj.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              const day = isNaN(eventDateObj.getTime())
                ? '--'
                : eventDateObj.getDate()

              return (
                <div
                  key={event.id}
                  className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 md:p-6 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3.5">
                    
                    {/* Header Row: Date Box + Title & Badges */}
                    <div className="flex items-start gap-3 sm:gap-4">
                      
                      {/* Institutional Calendar Date Tile */}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#003B5C]/10 dark:bg-blue-500/20 border border-[#003B5C]/15 dark:border-blue-400/20 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                        <span className="text-[9px] sm:text-[10px] font-black tracking-wider text-[#003B5C] dark:text-blue-300 uppercase leading-none">
                          {month}
                        </span>
                        <span className="text-base sm:text-xl font-black text-slate-900 dark:text-white leading-tight font-mono">
                          {day}
                        </span>
                      </div>

                      {/* Title & Category Info */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] font-bold uppercase tracking-wider">
                            {event.event_type}
                          </span>

                          {!event.published && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold">
                              <EyeOff className="w-3 h-3" />
                              <span>Draft</span>
                            </span>
                          )}
                        </div>

                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {event.title}
                        </h2>
                      </div>

                    </div>

                    {/* Description */}
                    {event.description && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    )}

                    {/* Operational Metadata */}
                    <div className="space-y-1.5 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2 truncate">
                        <CalendarIcon className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                        <span className="truncate">
                          {new Date(event.event_date).toLocaleDateString('en-GB', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}
                        </span>
                      </div>

                      {event.event_time && (
                        <div className="flex items-center gap-2 truncate">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate">{event.event_time}</span>
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3.5 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => togglePublished(event.id, event.published)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                        event.published
                          ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                      title={event.published ? 'Unpublish from website' : 'Publish event live'}
                    >
                      {event.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{event.published ? 'Unpublish' : 'Publish'}</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(event)}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 text-xs font-semibold flex items-center gap-1"
                        title="Edit Event"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvent(event)
                          setShowDeleteModal(true)
                        }}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95 text-xs font-semibold flex items-center gap-1"
                        title="Delete Event"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>
        )}

      </main>

      {/* Modal: Create / Edit Event */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:text-blue-300 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {editingId ? 'Edit Scheduled Event' : 'Schedule New Event'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Event Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Event Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inter-House Athletics Championship"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description / Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Details on participants, schedules, equipment required..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] resize-none transition"
                />
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Event Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Event Time
                  </label>
                  <input
                    type="time"
                    value={formData.event_time}
                    onChange={(e) => setFormData({ ...formData, event_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>
              </div>

              {/* Location & Event Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Location / Venue
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. School Assembly Hall, Pitch"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as SchoolEvent['event_type'] })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer"
                  >
                    <option value="academic">Academic</option>
                    <option value="sports">Sports</option>
                    <option value="cultural">Cultural</option>
                    <option value="religious">Religious</option>
                    <option value="other">General / Other</option>
                  </select>
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Publish immediately to academic calendar &amp; website
                  </span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingId ? 'Update Event' : 'Schedule Event'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-md w-full p-5 sm:p-7 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-500/10">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Cancel &amp; Delete Event
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove <strong>&ldquo;{selectedEvent.title}&rdquo;</strong> from the schedule? This action cannot be reversed.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedEvent(null)
                }}
                disabled={saving}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Keep Event
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={saving}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Event</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}