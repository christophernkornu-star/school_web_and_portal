'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { 
  Image as ImageIcon, 
  Camera, 
  Layers, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Calendar, 
  Award, 
  FolderOpen,
  Users,
  ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import SiteHeader from '@/components/SiteHeader'
import { PortalFooter } from '@/components/PortalFooter'
import { Skeleton } from '@/components/ui/skeleton'

interface GalleryPhoto {
  id: string
  title: string
  description?: string
  photo_url: string
  album_name?: string
  is_spotlight?: boolean
  created_at: string
}

interface VirtualAlbum {
  id: string
  album_name: string
  cover_image_url?: string
  photoCount: number
}

export default function GalleryPage() {
  const supabase = getSupabaseBrowserClient()
  const [allPhotos, setAllPhotos] = useState<GalleryPhoto[]>([])
  const [selectedAlbumName, setSelectedAlbumName] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const { data: photosData } = await supabase
          .from('gallery_photos')
          .select('*')
          .order('created_at', { ascending: false })

        if (photosData) {
          setAllPhotos(photosData as GalleryPhoto[])
        }
      } catch (err) {
        console.error('Failed to load gallery data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Aggregate virtual albums from photo metadata
  const albums = useMemo(() => {
    const albumMap: Record<string, VirtualAlbum> = {}
    allPhotos.forEach((photo) => {
      const albumName = photo.album_name?.trim() || 'General Campus Life'
      if (!albumMap[albumName]) {
        albumMap[albumName] = {
          id: albumName,
          album_name: albumName,
          cover_image_url: photo.photo_url,
          photoCount: 0
        }
      }
      albumMap[albumName].photoCount++
    })
    return Object.values(albumMap)
  }, [allPhotos])

  // Featured Spotlight Photos
  const spotlightPhotos = useMemo(() => {
    return allPhotos.filter((p) => p.is_spotlight)
  }, [allPhotos])

  // Photos belonging to the currently selected album
  const currentAlbumPhotos = useMemo(() => {
    if (!selectedAlbumName) return []
    return allPhotos.filter(
      (p) => (p.album_name?.trim() || 'General Campus Life') === selectedAlbumName
    )
  }, [allPhotos, selectedAlbumName])

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white py-12 sm:py-16 md:py-20 border-b border-white/10">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-72 w-72 sm:h-96 sm:w-96 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-amber-300 text-xs sm:text-sm font-black uppercase tracking-widest shadow-inner">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Visual Archive &amp; Memories</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
              Campus Photo Gallery
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto font-medium leading-relaxed">
              Capturing daily moments, academic milestones, sports competitions, and cultural celebrations at Biriwa Methodist &apos;C&apos; Basic School.
            </p>
          </div>
        </section>

        {/* Leadership Promo Card */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 -mt-6 sm:-mt-8 relative z-20">
          <div className="bg-white dark:bg-slate-800/95 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 sm:p-7 md:p-8 backdrop-blur-md">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
              <div className="space-y-1.5 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  <Award className="w-4 h-4" />
                  <span>Administration &amp; Governance</span>
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Meet Our School Leadership &amp; Teaching Staff
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  Get acquainted with the Headteacher, faculty educators, and student prefect corps steering our school toward academic and moral excellence.
                </p>
              </div>

              <Link 
                href="/leadership" 
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm px-6 py-3.5 rounded-xl shadow-md transition active:scale-95 shrink-0"
              >
                <Users className="w-4 h-4" />
                <span>View Leadership Profiles</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Featured / Spotlight Photos Section */}
        {!selectedAlbumName && spotlightPhotos.length > 0 && (
          <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-10 sm:pt-14">
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Featured Highlights
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {spotlightPhotos.length} Featured
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                {spotlightPhotos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setSelectedPhoto(photo)}
                    className="group relative cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                  >
                    <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                      <img
                        src={photo.photo_url}
                        alt={photo.title || 'Campus highlight'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-amber-400 text-[#003B5C] font-black text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>Featured</span>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                        <span className="text-white text-xs font-bold truncate">
                          {photo.title}
                        </span>
                        {photo.description && (
                          <span className="text-slate-300 text-[10px] line-clamp-1 mt-0.5">
                            {photo.description}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {photo.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">
                        {new Date(photo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Albums & Main Photo Grid Section */}
        <section className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-6 sm:space-y-8">
          {selectedAlbumName ? (
            /* Detailed Album Photos View */
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAlbumName(null)}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#003B5C] hover:bg-slate-50 transition active:scale-95 shadow-2xs"
                    title="Back to All Albums"
                    aria-label="Back to All Albums"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      {selectedAlbumName}
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {currentAlbumPhotos.length} {currentAlbumPhotos.length === 1 ? 'Photograph' : 'Photographs'} in this collection
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedAlbumName(null)}
                  className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline self-start sm:self-auto"
                >
                  View All Albums
                </button>
              </div>

              {currentAlbumPhotos.length === 0 ? (
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center space-y-2">
                  <FolderOpen className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p className="text-xs sm:text-sm text-slate-400 font-medium">No photos found in this album.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
                  {currentAlbumPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setSelectedPhoto(photo)}
                      className="group relative cursor-pointer bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/80 shadow-2xs hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                    >
                      <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        <img
                          src={photo.photo_url}
                          alt={photo.title || 'Campus photograph'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                          <span className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-900 font-bold text-xs shadow-sm backdrop-blur-xs">
                            View Full Photo
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 sm:p-3 bg-white dark:bg-slate-800">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {photo.title || 'Untitled Photo'}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block mt-0.5">
                          {new Date(photo.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Albums Overview Grid */
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#003B5C] dark:bg-blue-400 rounded-full shrink-0" />
                  <h2 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wider text-slate-900 dark:text-white">
                    Photo Collections
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-400 font-mono">
                  {albums.length} {albums.length === 1 ? 'Album' : 'Albums'}
                </span>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700 p-4 space-y-3">
                      <Skeleton className="h-44 w-full rounded-xl" />
                      <Skeleton className="h-5 w-3/4 rounded-lg" />
                      <Skeleton className="h-3 w-1/4 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : albums.length === 0 ? (
                <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center space-y-3 shadow-xs max-w-lg mx-auto">
                  <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      No photo albums available
                    </h3>
                    <p className="text-xs text-slate-400">
                      Gallery collections will appear here once photographs are uploaded.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {albums.map((album) => (
                    <div
                      key={album.id}
                      onClick={() => setSelectedAlbumName(album.id)}
                      className="group cursor-pointer bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 overflow-hidden flex flex-col justify-between active:scale-[0.98]"
                    >
                      <div className="relative aspect-16/10 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        {album.cover_image_url ? (
                          <img
                            src={album.cover_image_url}
                            alt={album.album_name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
                            <ImageIcon className="w-12 h-12" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                        
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/50 backdrop-blur-xs text-[11px] font-bold border border-white/10">
                            <Layers className="w-3.5 h-3.5 text-amber-400" />
                            <span>{album.photoCount} {album.photoCount === 1 ? 'Photo' : 'Photos'}</span>
                          </span>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                            {album.album_name}
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Click to explore album
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors shrink-0">
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Photo Lightbox Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-2xl sm:rounded-3xl max-w-4xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Top Header */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-750 flex items-center justify-between gap-3 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                    {selectedPhoto.title || 'Photograph'}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 font-medium">
                    <span>{selectedPhoto.album_name || 'General Collection'}</span>
                    <span>&bull;</span>
                    <span className="font-mono">
                      {new Date(selectedPhoto.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                  aria-label="Close photo preview"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body with Image */}
              <div className="flex-1 bg-slate-950/40 p-2 sm:p-4 flex items-center justify-center overflow-hidden min-h-[260px] sm:min-h-[380px]">
                <img
                  src={selectedPhoto.photo_url}
                  alt={selectedPhoto.title || 'Enlarged photo'}
                  className="max-h-[60vh] sm:max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-md"
                />
              </div>

              {/* Modal Footer Description */}
              {selectedPhoto.description && (
                <div className="p-4 sm:p-5 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-750 shrink-0">
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedPhoto.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <PortalFooter />
    </div>
  )
}