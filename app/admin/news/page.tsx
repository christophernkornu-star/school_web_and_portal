'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { 
  Newspaper, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Image as ImageIcon, 
  Upload, 
  Search, 
  X, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  FileText,
  Clock,
  Link as LinkIcon
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface NewsItem {
  id: string
  title: string
  content: string
  summary: string | null
  featured_image: string | null
  category: string
  published: boolean
  created_at: string
}

const CATEGORIES = [
  { value: 'all', label: 'All Articles' },
  { value: 'general', label: 'General' },
  { value: 'academic', label: 'Academic' },
  { value: 'sports', label: 'Sports' },
  { value: 'achievements', label: 'Achievements' },
  { value: 'events', label: 'Events' },
]

export default function AdminNewsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    featured_image: '',
    category: 'general',
    published: false
  })

  useEffect(() => {
    fetchNews()
  }, [])

  const fetchNews = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    try {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setNews(data as NewsItem[])
    } catch (err: any) {
      toast.error('Failed to load news articles')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be under 5MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file (JPG, PNG, WebP)')
        return
      }
      setSelectedFile(file)
    }
  }

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('news-images')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error: any) {
      toast.error('Error uploading image: ' + error.message)
      return null
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      summary: '',
      featured_image: '',
      category: 'general',
      published: false
    })
    setSelectedFile(null)
    setEditingNews(null)
    setUploadMethod('file')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Headline and article content are required')
      return
    }

    setUploading(true)

    try {
      let featuredImage = formData.featured_image

      if (uploadMethod === 'file' && selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile)
        if (uploadedUrl) {
          featuredImage = uploadedUrl
        }
      }

      const dataToSubmit = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        summary: formData.summary.trim() || null,
        featured_image: featuredImage || null,
        category: formData.category,
        published: formData.published
      }

      if (editingNews) {
        const { error } = await supabase
          .from('news')
          .update(dataToSubmit)
          .eq('id', editingNews.id)

        if (error) throw error
        toast.success('Article updated successfully')
      } else {
        const { error } = await supabase
          .from('news')
          .insert([dataToSubmit])

        if (error) throw error
        toast.success('Article created successfully')
      }

      setShowModal(false)
      resetForm()
      fetchNews()
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while saving')
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (newsItem: NewsItem) => {
    setEditingNews(newsItem)
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      summary: newsItem.summary || '',
      featured_image: newsItem.featured_image || '',
      category: newsItem.category,
      published: newsItem.published
    })
    setUploadMethod('url')
    setSelectedFile(null)
    setShowModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedNews) return
    setUploading(true)

    try {
      const { error } = await supabase
        .from('news')
        .delete()
        .eq('id', selectedNews.id)

      if (error) throw error
      toast.success('Article deleted successfully')
      setShowDeleteModal(false)
      setSelectedNews(null)
      fetchNews()
    } catch (error: any) {
      toast.error('Failed to delete article')
    } finally {
      setUploading(false)
    }
  }

  const togglePublish = async (newsItem: NewsItem) => {
    try {
      const { error } = await supabase
        .from('news')
        .update({ published: !newsItem.published })
        .eq('id', newsItem.id)

      if (error) throw error
      fetchNews()
      toast.success(newsItem.published ? 'Article set to draft' : 'Article published live')
    } catch (error: any) {
      toast.error('Failed to update article status')
    }
  }

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
      const query = searchQuery.toLowerCase()
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        item.content.toLowerCase().includes(query) ||
        (item.summary && item.summary.toLowerCase().includes(query)) ||
        item.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [news, selectedCategory, searchQuery])

  const stats = useMemo(() => {
    const publishedCount = news.filter((n) => n.published).length
    const draftCount = news.filter((n) => !n.published).length
    const thisMonthCount = news.filter(
      (n) => new Date(n.created_at).getMonth() === new Date().getMonth() &&
             new Date(n.created_at).getFullYear() === new Date().getFullYear()
    ).length

    return {
      total: news.length,
      published: publishedCount,
      drafts: draftCount,
      thisMonth: thisMonthCount
    }
  }, [news])

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
                    News &amp; Press Releases
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Publish editorial articles, term milestones, and campus press updates
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
              <span className="hidden sm:inline">Add News Article</span>
              <span className="sm:hidden">Add</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-6">
        
        {/* KPI Metrics Row */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Total Articles
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.total}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <Newspaper className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Published Live
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
                Unpublished Drafts
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.drafts}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                This Month
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-[#003B5C] dark:text-blue-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.thisMonth}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </section>

        {/* Search & Category Filter Section */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search articles by title, summary, or keyword..."
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
                <Newspaper className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                <span>{filteredNews.length} of {news.length} Articles</span>
              </span>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs font-bold select-none">
            {CATEGORIES.map((tab) => {
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

        {/* Articles List */}
        {loading ? (
          <div className="space-y-3.5 sm:space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <Skeleton className="w-full md:w-36 h-44 md:h-28 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <Skeleton className="h-5 w-2/3 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-4 w-1/3 rounded-md" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-14 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <Newspaper className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {searchQuery || selectedCategory !== 'all' ? 'No matching news articles' : 'No news articles posted yet'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedCategory !== 'all'
                  ? 'Try adjusting your search query or selecting a different category filter.'
                  : 'Start keeping the community informed by writing your first campus news bulletin.'}
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
                <span>Write First Article</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5 sm:space-y-4">
            {filteredNews.map((item) => (
              <article
                key={item.id}
                className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-5 md:p-6 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="flex flex-col md:flex-row items-start gap-4">
                  
                  {/* Article Thumbnail */}
                  {item.featured_image ? (
                    <div className="w-full md:w-40 h-44 md:h-28 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 relative border border-slate-200/60 dark:border-slate-700">
                      <Image
                        src={item.featured_image}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 160px"
                      />
                    </div>
                  ) : (
                    <div className="w-full md:w-40 h-28 bg-slate-100 dark:bg-slate-800/60 rounded-xl flex flex-col items-center justify-center text-slate-400 shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                      <ImageIcon className="w-6 h-6 opacity-40 mb-1" />
                      <span className="text-[10px] font-medium uppercase tracking-wider">No Image</span>
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="flex-1 min-w-0 space-y-2 w-full">
                    
                    {/* Badges Cluster */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider border ${
                          item.published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                            : 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50'
                        }`}
                      >
                        {item.published ? <CheckCircle2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{item.published ? 'Published' : 'Draft'}</span>
                      </span>

                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[10px] sm:text-[11px] font-bold capitalize">
                        {item.category}
                      </span>
                    </div>

                    {/* Headline */}
                    <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-snug group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h2>

                    {/* Summary / Snippet */}
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {item.summary || item.content}
                    </p>

                    {/* Date Stamp */}
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Posted: {new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                  </div>

                  {/* Actions Column */}
                  <div className="flex md:flex-col items-center justify-end md:justify-start gap-1.5 w-full md:w-auto shrink-0 pt-2.5 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => togglePublish(item)}
                      className={`flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 border ${
                        item.published
                          ? 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-100'
                      }`}
                      title={item.published ? 'Set to Draft' : 'Publish Article'}
                    >
                      {item.published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{item.published ? 'Unpublish' : 'Publish'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedNews(item)
                        setShowDeleteModal(true)
                      }}
                      className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>

                </div>
              </article>
            ))}
          </div>
        )}

      </main>

      {/* Modal: Create / Edit News */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:text-blue-300 flex items-center justify-center">
                  <Newspaper className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {editingNews ? 'Edit News Article' : 'Compose News Article'}
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
                  Article Headline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Biriwa Methodist 'C' Triumphs at Regional Debate"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Summary / Excerpt
                </label>
                <input
                  type="text"
                  placeholder="A short punchy teaser displayed on card previews..."
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Full Content */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Full Article Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write the full news story here..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] resize-none transition"
                />
              </div>

              {/* Featured Image Management */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Featured Media
                </label>

                {/* Upload Method Switcher */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                      uploadMethod === 'file'
                        ? 'bg-[#003B5C] text-white border-[#003B5C] shadow-xs dark:bg-blue-600 dark:border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                      uploadMethod === 'url'
                        ? 'bg-[#003B5C] text-white border-[#003B5C] shadow-xs dark:bg-blue-600 dark:border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>Direct Image URL</span>
                  </button>
                </div>

                {uploadMethod === 'file' ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#003B5C]/10 file:text-[#003B5C] dark:file:bg-blue-900/40 dark:file:text-blue-300 hover:file:bg-[#003B5C]/20 cursor-pointer"
                    />
                    <p className="text-[11px] text-slate-400">Max size: 5MB (JPG, PNG, WebP supported)</p>
                    {selectedFile && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">Ready: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      placeholder="https://example.com/press-image.jpg"
                      value={formData.featured_image}
                      onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                    />
                  </div>
                )}
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition cursor-pointer"
                  >
                    <option value="general">General</option>
                    <option value="academic">Academic</option>
                    <option value="sports">Sports</option>
                    <option value="achievements">Achievements</option>
                    <option value="events">Events</option>
                  </select>
                </div>

                <div className="flex items-end pb-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                      className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                    />
                    <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Publish immediately to live portals
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  disabled={uploading}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingNews ? 'Update Article' : 'Publish Article'}</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && selectedNews && (
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
                Delete News Article
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete <strong>&ldquo;{selectedNews.title}&rdquo;</strong>? This item will be removed from all public feeds and archives.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedNews(null)
                }}
                disabled={uploading}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={uploading}
                className="w-full sm:w-1/2 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50"
              >
                {uploading ? (
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