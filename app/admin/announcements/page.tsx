'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  Megaphone, 
  Plus, 
  Send, 
  Trash2, 
  Edit3, 
  Search, 
  X, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Globe, 
  EyeOff, 
  Loader2,
  ChevronRight,
  Filter
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface Announcement {
  id: string
  title: string
  content: string
  category: string
  priority: 'normal' | 'high' | 'urgent'
  target_audience: string[]
  published: boolean
  show_on_homepage: boolean
  expires_at: string | null
  created_at: string
}

export default function AnnouncementsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'normal' as 'normal' | 'high' | 'urgent',
    target_audience: ['all'],
    published: true,
    show_on_homepage: true,
    expires_at: ''
  })

  useEffect(() => {
    loadAnnouncements()
  }, [])

  const loadAnnouncements = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setAnnouncements(data as Announcement[])
    } catch (err: any) {
      toast.error('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({ 
      title: '', 
      content: '', 
      category: 'general',
      priority: 'normal', 
      target_audience: ['all'],
      published: true,
      show_on_homepage: true,
      expires_at: ''
    })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Title and message content are required')
      return
    }

    setSaving(true)
    const user = await getCurrentUser()
    if (!user) return

    try {
      const announcementData = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        category: formData.category,
        priority: formData.priority,
        target_audience: formData.target_audience,
        published: formData.published,
        show_on_homepage: formData.show_on_homepage,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
        created_by: editingId ? undefined : user.id,
      }

      if (editingId) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', editingId)
        
        if (error) throw error
        toast.success('Announcement updated successfully!')
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert([announcementData])
        
        if (error) throw error
        toast.success('Announcement posted successfully!')
      }

      setShowModal(false)
      resetForm()
      loadAnnouncements()
    } catch (error: any) {
      toast.error(error.message || 'Failed to save announcement')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (announcement: Announcement) => {
    setEditingId(announcement.id)
    setFormData({
      title: announcement.title,
      content: announcement.content,
      category: announcement.category,
      priority: announcement.priority,
      target_audience: announcement.target_audience || ['all'],
      published: announcement.published,
      show_on_homepage: announcement.show_on_homepage,
      expires_at: announcement.expires_at ? announcement.expires_at.split('T')[0] : ''
    })
    setShowModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedAnnouncement) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', selectedAnnouncement.id)

      if (error) throw error
      toast.success('Announcement deleted successfully!')
      setShowDeleteModal(false)
      setSelectedAnnouncement(null)
      loadAnnouncements()
    } catch (err: any) {
      toast.error('Failed to delete announcement')
    } finally {
      setSaving(false)
    }
  }

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        item.title.toLowerCase().includes(query) || 
        item.content.toLowerCase().includes(query) ||
        item.priority.toLowerCase().includes(query)
      
      return matchesCategory && matchesSearch
    })
  }, [announcements, selectedCategory, searchQuery])

  const getPriorityBadge = (priority: Announcement['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50'
      case 'high':
        return 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50'
      case 'normal':
      default:
        return 'bg-blue-50 text-[#003B5C] border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50'
    }
  }

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
                    School Announcements
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Publish campus bulletins, emergency broadcasts, and notices to portals
                </p>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                resetForm()
                setShowModal(true)
              }}
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">New Announcement</span>
              <span className="sm:hidden">New</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* Search & Category Filter */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search announcements by headline, keyword, or priority..."
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
                <Megaphone className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                <span>{filteredAnnouncements.length} of {announcements.length} Notices</span>
              </span>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs font-bold select-none">
            {[
              { value: 'all', label: 'All Categories' },
              { value: 'general', label: 'General' },
              { value: 'academic', label: 'Academic' },
              { value: 'event', label: 'Events' },
              { value: 'urgent', label: 'Urgent Notices' }
            ].map(tab => {
              const isActive = selectedCategory === tab.value
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setSelectedCategory(tab.value)}
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

        {/* Announcements List Container */}
        {loading ? (
          <div className="space-y-3.5 sm:space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-5 sm:p-6 space-y-3">
                <div className="flex items-start gap-4">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/3 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-2/3 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-14 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Megaphone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {searchQuery || selectedCategory !== 'all' ? 'No matching announcements' : 'No announcements published yet'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try modifying your search terms or selecting another category filter.'
                  : 'Broadcast your first academic circular or school announcement to learners, guardians, and faculty.'}
              </p>
            </div>
            {searchQuery || selectedCategory !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('all')
                }}
                className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline pt-1"
              >
                Clear Active Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  resetForm()
                  setShowModal(true)
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold transition active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Create First Notice</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {filteredAnnouncements.map(item => (
              <div 
                key={item.id}
                className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 md:p-6 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 sm:gap-4">
                  
                  {/* Left: Icon & Content */}
                  <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0 mt-0.5">
                      <Megaphone className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-2">
                      
                      {/* Badges Cluster */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${getPriorityBadge(item.priority)}`}>
                          {item.priority}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-[11px] font-bold capitalize">
                          {item.category}
                        </span>

                        {item.show_on_homepage && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50 text-[10px] font-bold">
                            <Globe className="w-3 h-3" />
                            <span>Public Website</span>
                          </span>
                        )}

                        {!item.published && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[10px] font-bold">
                            <EyeOff className="w-3 h-3" />
                            <span>Draft</span>
                          </span>
                        )}
                      </div>

                      {/* Headline */}
                      <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                        {item.title}
                      </h2>

                      {/* Content Body */}
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {item.content}
                      </p>

                      {/* Meta Information (Dates & Targets) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Posted: {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>

                        {item.expires_at && (
                          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Expires: {new Date(item.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        )}

                        <div>
                          <span>Audience: </span>
                          <span className="text-slate-700 dark:text-slate-300 font-semibold capitalize">
                            {item.target_audience?.join(', ') || 'All'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center justify-end sm:justify-start gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAnnouncement(item)
                        setShowDeleteModal(true)
                      }}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Modal: Create / Edit Announcement */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:text-blue-300 flex items-center justify-center">
                  <Megaphone className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {editingId ? 'Edit Announcement' : 'Draft New Announcement'}
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
              
              {/* Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Headline / Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. End of Term Examination Schedule Released"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Message Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide comprehensive details, instructions, or directives..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] resize-none transition"
                />
              </div>

              {/* Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer"
                  >
                    <option value="general">General Notice</option>
                    <option value="academic">Academic Circular</option>
                    <option value="event">School Event</option>
                    <option value="urgent">Urgent Broadcast</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Critical</option>
                  </select>
                </div>
              </div>

              {/* Target Audience */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Target Audience
                </label>
                <div className="flex flex-wrap gap-2.5 sm:gap-3.5 pt-0.5">
                  {['all', 'students', 'teachers', 'parents', 'public'].map(audience => (
                    <label 
                      key={audience}
                      className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={formData.target_audience.includes(audience)}
                        onChange={(e) => {
                          const newAudience = e.target.checked
                            ? [...formData.target_audience, audience]
                            : formData.target_audience.filter(a => a !== audience)
                          setFormData({ ...formData, target_audience: newAudience })
                        }}
                        className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                      />
                      <span className="capitalize">{audience}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Expiration Date */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Checkbox Toggles */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.published}
                    onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Publish immediately (Visible in portals)
                  </span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.show_on_homepage}
                    onChange={(e) => setFormData({ ...formData, show_on_homepage: e.target.checked })}
                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Display on public homepage banner
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
                    <>
                      <Send className="w-4 h-4" />
                      <span>{editingId ? 'Update Notice' : 'Post Notice'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && selectedAnnouncement && (
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
                Delete Announcement
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove <strong>&ldquo;{selectedAnnouncement.title}&rdquo;</strong>? This bulletin will no longer be visible to students or the public.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedAnnouncement(null)
                }}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
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
                  <span>Confirm Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}