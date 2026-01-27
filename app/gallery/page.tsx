'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Image as ImageIcon, Star } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import SiteHeader from '@/components/SiteHeader'

export default function GalleryPage() {
  const supabase = getSupabaseBrowserClient()
  const [albums, setAlbums] = useState<any[]>([])
  const [spotlightPhotos, setSpotlightPhotos] = useState<any[]>([])
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      // Load albums
      const { data: albumsData } = await supabase
        .from('photo_albums')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false })

      // Load spotlight photos
      const { data: spotlightData } = await supabase
        .from('gallery_photos')
        .select('*')
        .eq('is_spotlight', true)
        .order('created_at', { ascending: false })

      if (albumsData) {
        setAlbums(albumsData)
      }
      if (spotlightData) {
        setSpotlightPhotos(spotlightData)
      }
      setLoading(false)
    }

    loadData()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="methodist-gradient text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <ImageIcon className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-4">Photo Gallery</h2>
          <p className="text-xl text-gray-200">
            Capturing memories and celebrating achievements
          </p>
        </div>
      </section>

      {/* Featured/Spotlight Photos */}
      {spotlightPhotos.length > 0 && (
        <section className="py-12 bg-gradient-to-b from-white to-gray-50">
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-center mb-8">
              <Star className="w-8 h-8 text-ghana-gold mr-3" />
              <h2 className="text-3xl font-bold text-gray-800">Featured Photos</h2>
              <Star className="w-8 h-8 text-ghana-gold ml-3" />
            </div>
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {spotlightPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedPhoto(photo)}
                >
                  <div className="relative overflow-hidden rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                    <img
                      src={photo.photo_url}
                      alt={photo.title}
                      className="w-full h-64 object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-ghana-gold text-white px-2 py-1 rounded-full flex items-center text-xs font-bold">
                      <Star className="w-3 h-3 mr-1" />
                      Featured
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                        <h3 className="font-bold text-lg mb-1">{photo.title}</h3>
                        {photo.description && (
                          <p className="text-sm text-gray-200 line-clamp-2">{photo.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Albums Grid */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">Photo Albums</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto"></div>
            </div>
          ) : albums.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No photo albums available yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {albums.map((album) => (
                <Link
                  key={album.id}
                  href={`/gallery/${album.id}`}
                  className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  <div className="h-48 bg-gradient-to-r from-ghana-green to-green-700 flex items-center justify-center">
                    {album.cover_image_url ? (
                      <img
                        src={album.cover_image_url}
                        alt={album.album_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-16 h-16 text-white opacity-50" />
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-ghana-green">
                      {album.album_name}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {album.description || 'View photos from this collection'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center">
                <Star className="w-5 h-5 text-ghana-gold mr-2" />
                <h3 className="text-xl font-bold">{selectedPhoto.title}</h3>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.title}
                className="w-full max-h-[60vh] object-contain rounded-lg mb-4"
              />
              {selectedPhoto.description && (
                <div className="mt-4">
                  <p className="text-gray-700">{selectedPhoto.description}</p>
                </div>
              )}
              <div className="mt-4 text-sm text-gray-500">
                <p>Album: {selectedPhoto.album_name}</p>
                <p>Uploaded: {new Date(selectedPhoto.created_at).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
