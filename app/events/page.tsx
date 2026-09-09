'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Search, 
  Sparkles, 
  CalendarDays,
  Tag,
  ArrowRight,
  ChevronDown
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import SiteHeader from '@/components/SiteHeader'
import { PortalFooter } from '@/components/PortalFooter'
import { Skeleton } from '@/components/ui/skeleton'

interface SchoolEvent {
  id: string
  title: string
  description?: string
  event_date: string
  event_time?: string
  location?: string
  event_type?: string
  image_url?: string
  published: boolean
}

export default function EventsPage() {
  const supabase = getSupabaseBrowserClient()
  const [events, setEvents] = useState<SchoolEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    async function loadEvents() {
      setLoading(true)
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('published', true)
        .order('event_date', { ascending: true })

      if (data) {
        setEvents(data as SchoolEvent[])
      }
      setLoading(false)
    }

    loadEvents()
  }, [])

  // Derive unique event types for filtering
  const eventTypes = useMemo(() => {
    const types = new Set<string>()
    events.forEach(e => {
      if (e.event_type) types.add(e.event_type)
    })
    return Array.from(types)
  }, [events])

  // Filtered list
  const filteredEvents = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    return events.filter(event => {
      const matchesSearch = 
        event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = typeFilter === 'all' || event.event_type === typeFilter

      const eventDate = new Date(event.event_date)
      let matchesTime = true
      if (timeFilter === 'upcoming') {
        matchesTime = eventDate >= now
      } else if (timeFilter === 'past') {
        matchesTime = eventDate < now
      }

      return matchesSearch && matchesType && matchesTime
    })
  }, [events, searchTerm, typeFilter, timeFilter])

  const getBadgeStyle = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'academic':
      case 'exam':
        return 'bg-blue-50 text-[#003B5C] border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50'
      case 'sports':
      case 'extra-curricular':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50'
      case 'worship':
      case 'church':
        return 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50'
      case 'holiday':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-12 sm:py-16 md:py-20 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Campus Calendar & Activities</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              School Events &amp; Programs
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              Stay connected with worship assemblies, terminal examinations, sporting contests, and academic milestones at Biriwa Methodist &apos;C&apos;.
            </p>
          </div>
        </section>

        {/* Filter & Search Bar */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20">
          <div className="bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Search Field */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search events by name, hall, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
              </div>

              {/* Filters Group */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Time Switch Buttons */}
                <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setTimeFilter('upcoming')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'upcoming' 
                        ? 'bg-[#003B5C] text-white shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Upcoming
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('past')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'past' 
                        ? 'bg-[#003B5C] text-white shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Past
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'all' 
                        ? 'bg-[#003B5C] text-white shadow-xs' 
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    All
                  </button>
                </div>

                {/* Event Type Select */}
                {eventTypes.length > 0 && (
                  <div className="relative flex-1 sm:flex-initial sm:w-44">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                    >
                      <option value="all">All Event Types</option>
                      {eventTypes.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Events Grid */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-8 sm:py-12">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 p-5 space-y-4"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-xl" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <div className="flex justify-between pt-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-10 sm:p-16 text-center space-y-3 shadow-xs max-w-xl mx-auto">
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                <CalendarDays className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  No events found
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  {searchTerm || typeFilter !== 'all' || timeFilter !== 'all'
                    ? 'No events match your current filter settings.'
                    : 'There are currently no events published to the calendar.'}
                </p>
              </div>
              {(searchTerm || typeFilter !== 'all' || timeFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setTypeFilter('all')
                    setTimeFilter('all')
                  }}
                  className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
                >
                  Reset All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredEvents.map((event) => {
                const eventDate = new Date(event.event_date)
                const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                const day = eventDate.getDate()
                const year = eventDate.getFullYear()

                return (
                  <article
                    key={event.id}
                    className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between overflow-hidden group"
                  >
                    {/* Optional Event Banner Image */}
                    {event.image_url && (
                      <div className="relative h-44 sm:h-48 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <Image
                          src={event.image_url}
                          alt={event.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                      </div>
                    )}

                    <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-3.5">
                        
                        {/* Header: Date Block + Tag Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#003B5C] dark:text-blue-400 leading-none">
                                {month}
                              </span>
                              <span className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white leading-none mt-1">
                                {day}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 block">
                                {year}
                              </span>
                              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                {eventDate.toLocaleDateString(undefined, { weekday: 'short' })}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${getBadgeStyle(event.event_type)}`}>
                            {event.event_type || 'General'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div className="space-y-1.5">
                          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                            {event.title}
                          </h2>
                          {event.description && (
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Metadata: Time & Location */}
                      <div className="pt-3.5 mt-2 border-t border-slate-100 dark:border-slate-750 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400 shrink-0" />
                          <span className="truncate font-mono">
                            {event.event_time || 'Check schedule'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 min-w-0">
                          <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="truncate max-w-[140px] sm:max-w-[160px]">
                            {event.location || 'School Campus'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <PortalFooter />
    </div>
  )
}