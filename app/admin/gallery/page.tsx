'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Upload, 
  Search, 
  X, 
  Star, 
  Calendar, 
  Folder, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Link as LinkIcon,
  Sparkles,
  Layers
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'

interface GalleryPhoto {
  id: string
  title: string
  description?: string | null
  photo_url: string
  album_name: string
  is_spotlight: boolean
  created_at: string
}

export default function AdminGalleryPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAlbum, setSelectedAlbum] = useState('all')

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    photo_url: '',
    album_name: 'General',
    is_spotlight: false
  })

  useEffect(() => {
    fetchPhotos()
  }, [])

  const fetchPhotos = async () => {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setPhotos(data as GalleryPhoto[])
    } catch (err: any) {
      toast.error('Failed to load gallery photos')
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
        toast.error('Please select an image file (JPG, PNG, WebP)')
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
        .from('gallery-photos')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('gallery-photos')
        .getPublicUrl(filePath)

      return data.publicUrl
    } catch (error: any) {
      toast.error('Error uploading file: ' + error.message)
      return null
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      photo_url: '',
      album_name: 'General',
      is_spotlight: false
    })
    setSelectedFile(null)
    setUploadMethod('file')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) {
      toast.error('Photo title is required')
      return
    }

    setUploading(true)

    try {
      let photoUrl = formData.photo_url

      if (uploadMethod === 'file' && selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile)
        if (!uploadedUrl) {
          setUploading(false)
          return
        }
        photoUrl = uploadedUrl
      }

      if (!photoUrl) {
        toast.error('Please provide a photo URL or select an image file')
        setUploading(false)
        return
      }

      const { error } = await supabase
        .from('gallery_photos')
        .insert([{
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          photo_url: photoUrl,
          album_name: formData.album_name.trim() || 'General',
          is_spotlight: formData.is_spotlight
        }])

      if (error) throw error

      toast.success('Photo added to gallery')
      setShowModal(false)
      resetForm()
      fetchPhotos()
    } catch (error: any) {
      toast.error(error.message || 'Error saving photo')
    } finally {
      setUploading(false)
    }
  }

  const confirmDelete = async () => {
    if (!selectedPhoto) return
    setUploading(true)

    try {
      const { error } = await supabase
        .from('gallery_photos')
        .delete()
        .eq('id', selectedPhoto.id)

      if (error) throw error
      
      toast.success('Photo deleted successfully')
      setShowDeleteModal(false)
      setSelectedPhoto(null)
      fetchPhotos()
    } catch (error: any) {
      toast.error('Failed to delete photo: ' + (error.message || 'Unknown error'))
    } finally {
      setUploading(false)
    }
  }

  const toggleSpotlight = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('gallery_photos')
        .update({ is_spotlight: !currentStatus })
        .eq('id', id)

      if (error) throw error
      fetchPhotos()
      toast.success(currentStatus ? 'Removed from homepage spotlight' : 'Added to homepage spotlight')
    } catch (error: any) {
      toast.error('Error toggling spotlight: ' + error.message)
    }
  }

  const albums = useMemo(() => {
    return Array.from(new Set(photos.map(p => p.album_name || 'General'))).filter(Boolean)
  }, [photos])

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      const matchesAlbum = 
        selectedAlbum === 'all' 
          ? true 
          : selectedAlbum === 'spotlight' 
          ? photo.is_spotlight 
          : (photo.album_name || 'General') === selectedAlbum

      const query = searchQuery.toLowerCase()
      const matchesSearch = 
        photo.title.toLowerCase().includes(query) ||
        (photo.description && photo.description.toLowerCase().includes(query)) ||
        photo.album_name.toLowerCase().includes(query)

      return matchesAlbum && matchesSearch
    })
  }, [photos, selectedAlbum, searchQuery])

  const stats = useMemo(() => {
    const spotlightCount = photos.filter(p => p.is_spotlight).length
    const thisMonth = photos.filter(p => {
      const d = new Date(p.created_at)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return {
      total: photos.length,
      albums: albums.length,
      spotlight: spotlightCount,
      thisMonth
    }
  }, [photos, albums])

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
                    Photo Gallery Management
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Curate institutional photo albums, campus archives, and homepage spotlight reels
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
              <span className="hidden sm:inline">Upload Photo</span>
              <span className="sm:hidden">Upload</span>
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
                Total Photos
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.total}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Photo Albums
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-[#003B5C] dark:text-blue-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.albums}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <Folder className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Spotlight Reels
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.spotlight}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <Star className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Uploaded This Month
              </span>
              <div className="text-xl sm:text-3xl font-black font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
                {loading ? <Skeleton className="h-7 w-12 rounded-lg" /> : stats.thisMonth}
              </div>
            </div>
            <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </section>

        {/* Search & Album Filter Tabs Strip */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3.5 sm:p-5 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search gallery by photo title, description, or album..."
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
                <ImageIcon className="w-3.5 h-3.5 text-[#003B5C] dark:text-blue-400" />
                <span>{filteredPhotos.length} of {photos.length} Photos</span>
              </span>
            </div>
          </div>

          {/* Album Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar text-xs font-bold select-none">
            <button
              type="button"
              onClick={() => setSelectedAlbum('all')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 ${
                selectedAlbum === 'all'
                  ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              All Photos ({photos.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedAlbum('spotlight')}
              className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 flex items-center gap-1.5 ${
                selectedAlbum === 'spotlight'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Spotlight ({photos.filter(p => p.is_spotlight).length})</span>
            </button>

            {albums.map((album) => {
              const count = photos.filter(p => (p.album_name || 'General') === album).length
              const isActive = selectedAlbum === album
              return (
                <button
                  key={album}
                  type="button"
                  onClick={() => setSelectedAlbum(album)}
                  className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all duration-150 active:scale-95 ${
                    isActive
                      ? 'bg-[#003B5C] text-white shadow-xs dark:bg-blue-600'
                      : 'bg-slate-100/80 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                  }`}
                >
                  {album} ({count})
                </button>
              )
            })}
          </div>
        </section>

        {/* Photos Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-4 space-y-3">
                <Skeleton className="h-44 w-full rounded-xl" />
                <Skeleton className="h-5 w-3/4 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
              </div>
            ))}
          </div>
        ) : filteredPhotos.length === 0 ? (
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-10 sm:p-14 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {searchQuery || selectedAlbum !== 'all' ? 'No matching photos found' : 'No photos uploaded yet'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                {searchQuery || selectedAlbum !== 'all'
                  ? 'Try clearing your search query or selecting a different album category.'
                  : 'Start publishing visual highlights of campus life, academic activities, and celebrations.'}
              </p>
            </div>
            {searchQuery || selectedAlbum !== 'all' ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedAlbum('all')
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
                <span>Upload First Photo</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
            {filteredPhotos.map((photo) => (
              <div
                key={photo.id}
                className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-3 sm:p-3.5 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  
                  {/* Photo Container */}
                  <div className="relative h-44 sm:h-48 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60">
                    <img
                      src={photo.photo_url}
                      alt={photo.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f1f5f9" width="400" height="300"/%3E%3Ctext fill="%2394a3b8" x="50%25" y="50%25" text-anchor="middle" font-family="sans-serif" font-size="12"%3EUnavailable%3C/text%3E%3C/svg%3E'
                      }}
                    />

                    {/* Spotlight Badge */}
                    {photo.is_spotlight && (
                      <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                        <Star className="w-3 h-3 fill-white" />
                        <span>Spotlight</span>
                      </div>
                    )}

                    {/* Quick Delete Floating Trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPhoto(photo)
                        setShowDeleteModal(true)
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-950/70 hover:bg-rose-600 text-white transition backdrop-blur-xs opacity-90 hover:opacity-100"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 px-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold truncate max-w-[120px]">
                        {photo.album_name || 'General'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(photo.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate pt-0.5 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                      {photo.title}
                    </h2>

                    {photo.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {photo.description}
                      </p>
                    )}
                  </div>

                </div>

                {/* Spotlight Toggle Action */}
                <div className="pt-2.5 mt-2.5 border-t border-slate-100 dark:border-slate-800 px-1">
                  <button
                    type="button"
                    onClick={() => toggleSpotlight(photo.id, photo.is_spotlight)}
                    className={`w-full py-1.5 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95 border ${
                      photo.is_spotlight
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${photo.is_spotlight ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    <span>{photo.is_spotlight ? 'Featured in Spotlight' : 'Add to Spotlight'}</span>
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}

      </main>

      {/* Modal: Upload Photo */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 max-w-lg w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 sm:p-7 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:text-blue-300 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  Upload Gallery Media
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
                  Photo Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Inter-House Athletics Opening March"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Description / Caption
                </label>
                <textarea
                  rows={2}
                  placeholder="Context about this photo or featured students..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] resize-none transition"
                />
              </div>

              {/* Upload Method Selector */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Media Source <span className="text-rose-500">*</span>
                </label>

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
                    <span>Upload File</span>
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
                    <span>Image URL</span>
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
                        <span className="truncate">Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="url"
                      placeholder="https://example.com/event-photo.jpg"
                      value={formData.photo_url}
                      onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                      className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                    />
                  </div>
                )}
              </div>

              {/* Album Selection & Quick Select */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Album Name
                </label>
                <input
                  type="text"
                  list="existing-albums"
                  placeholder="e.g. Sports, Graduation, Class of 2026"
                  value={formData.album_name}
                  onChange={(e) => setFormData({ ...formData, album_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                />
                <datalist id="existing-albums">
                  {albums.map((alb) => (
                    <option key={alb} value={alb} />
                  ))}
                </datalist>

                {albums.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center pt-1">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Existing:</span>
                    {albums.map((alb) => (
                      <button
                        key={alb}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, album_name: alb }))}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition ${
                          formData.album_name === alb
                            ? 'bg-[#003B5C] text-white border-[#003B5C]'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {alb}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Spotlight Toggle */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.is_spotlight}
                    onChange={(e) => setFormData({ ...formData, is_spotlight: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-300 dark:border-slate-700 dark:bg-slate-900"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    <span>Feature in Homepage Spotlight Carousel</span>
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
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Save Photo</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {showDeleteModal && selectedPhoto && (
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
                Delete Gallery Photo
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Are you sure you want to remove <strong>&ldquo;{selectedPhoto.title}&rdquo;</strong> from the {selectedPhoto.album_name} album? This image will be permanently removed from public galleries.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedPhoto(null)
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