'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Plus, Edit, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AdminGalleryPage() {
  const supabase = getSupabaseBrowserClient()
  const [photos, setPhotos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file')
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
    setLoading(true)
    const { data } = await supabase
      .from('gallery_photos')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setPhotos(data)
    setLoading(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      let photoUrl = formData.photo_url

      // If using file upload, upload the file first
      if (uploadMethod === 'file' && selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile)
        if (!uploadedUrl) {
          setUploading(false)
          return
        }
        photoUrl = uploadedUrl
      }

      // Validate that we have a photo URL
      if (!photoUrl) {
        toast.error('Please provide a photo URL or select a file to upload')
        setUploading(false)
        return
      }

      await supabase
        .from('gallery_photos')
        .insert([{ ...formData, photo_url: photoUrl }])

      toast.success('Photo uploaded successfully')
      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        photo_url: '',
        album_name: 'General',
        is_spotlight: false
      })
      setSelectedFile(null)
      setUploadMethod('file')
      fetchPhotos()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this photo?')) {
      try {
        const { error } = await supabase.from('gallery_photos').delete().eq('id', id)
        if (error) throw error
        
        toast.success('Photo deleted successfully')
        fetchPhotos()
      } catch (error: any) {
        toast.error('Failed to delete photo: ' + (error.message || 'Unknown error'))
        console.error(error)
      }
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
      toast.success(currentStatus ? 'Removed from spotlight' : 'Added to spotlight')
    } catch (error: any) {
      toast.error('Error toggling spotlight: ' + error.message)
    }
  }

  const albums = [...new Set(photos.map(p => p.album_name))]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Photo Gallery Management</h1>
                <p className="text-sm text-gray-600">Upload and manage school photos</p>
              </div>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5" />
              <span>Upload Photo</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Total Photos</p>
            <p className="text-2xl font-bold text-gray-800">{photos.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Albums</p>
            <p className="text-2xl font-bold text-blue-600">{albums.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">This Month</p>
            <p className="text-2xl font-bold text-green-600" suppressHydrationWarning>
              {photos.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-sm">Spotlight Photos</p>
            <p className="text-2xl font-bold text-purple-600">
              {photos.filter(p => p.is_spotlight).length}
            </p>
          </div>
        </div>

        {/* Album Filter */}
        <div className="bg-white rounded-lg shadow mb-6 p-4">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-xs md:text-sm font-medium text-gray-700 flex-shrink-0">Albums:</span>
            <button className="px-4 py-2 bg-methodist-blue text-white rounded-lg text-xs md:text-sm">
              All ({photos.length})
            </button>
            {albums.map((album) => (
              <button key={album} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-xs md:text-sm flex-shrink-0">
                {album} ({photos.filter(p => p.album_name === album).length})
              </button>
            ))}
          </div>
        </div>

        {/* Photo Grid */}
        <div className="grid md:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-xl transition-shadow">
              <div className="relative h-48 bg-gray-200">
                <img
                  src={photo.photo_url}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                />
                {photo.is_spotlight && (
                  <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                    SPOTLIGHT
                  </div>
                )}
                <button
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-800 mb-1">{photo.title}</h4>
                {photo.description && (
                  <p className="text-xs md:text-sm text-gray-600 mb-2">{photo.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] md:text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{photo.album_name}</span>
                    <span className="text-[10px] md:text-xs text-gray-500">{new Date(photo.created_at).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => toggleSpotlight(photo.id, photo.is_spotlight)}
                    className={`w-full px-3 py-1 text-[10px] md:text-xs font-medium rounded ${
                      photo.is_spotlight
                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {photo.is_spotlight ? '⭐ Spotlight' : 'Add to Spotlight'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upload Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 my-8 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Upload Photo</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    placeholder="e.g., Sports Day 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    placeholder="Brief description of the photo"
                  />
                </div>
                
                {/* Upload Method Toggle */}
                <div className="border-t border-b py-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Upload Method *</label>
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => setUploadMethod('file')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        uploadMethod === 'file'
                          ? 'border-ghana-green bg-ghana-green text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-ghana-green'
                      }`}
                    >
                      <Upload className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Upload File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMethod('url')}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                        uploadMethod === 'url'
                          ? 'border-ghana-green bg-ghana-green text-white'
                          : 'border-gray-300 bg-white text-gray-700 hover:border-ghana-green'
                      }`}
                    >
                      <ImageIcon className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm font-medium">Image URL</span>
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                {uploadMethod === 'file' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Photo File *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      required={uploadMethod === 'file'}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    />
                    <p className="text-xs text-gray-500 mt-1">Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP</p>
                    {selectedFile && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800">
                          ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* URL Input */}
                {uploadMethod === 'url' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL *</label>
                    <input
                      type="url"
                      required={uploadMethod === 'url'}
                      value={formData.photo_url}
                      onChange={(e) => setFormData({...formData, photo_url: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                      placeholder="https://example.com/photo.jpg"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the direct URL to the image</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Album Name</label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      list="existing-albums"
                      value={formData.album_name}
                      onChange={(e) => setFormData({...formData, album_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                      placeholder="Select existing or type new album name"
                    />
                    <datalist id="existing-albums">
                      {albums.map((album) => (
                        <option key={album} value={album} />
                      ))}
                    </datalist>
                    
                    {/* Quick Select Pills */}
                    {albums.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-xs text-gray-500">Existing albums:</span>
                        {albums.map(album => (
                          <button
                            key={album}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, album_name: album }))}
                            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                              formData.album_name === album
                                ? 'bg-methodist-blue text-white border-methodist-blue'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                            }`}
                          >
                            {album}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Group photos into albums (default: General)</p>
                </div>
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.is_spotlight}
                      onChange={(e) => setFormData({...formData, is_spotlight: e.target.checked})}
                      className="w-5 h-5 text-yellow-500 rounded focus:ring-2 focus:ring-yellow-500"
                    />
                    <span className="text-sm font-medium text-gray-700">⭐ Featured in Homepage Slideshow</span>
                  </label>
                  <p className="text-xs text-gray-500 mt-1 ml-8">Mark this photo to appear in the homepage spotlight slideshow</p>
                </div>
                {uploadMethod === 'url' && formData.photo_url && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <div className="max-h-64 overflow-hidden rounded-lg">
                      <img
                        src={formData.photo_url}
                        alt="Preview"
                        className="w-full h-auto object-contain max-h-64 rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23ddd" width="400" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EInvalid Image URL%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                  </div>
                )}
                {uploadMethod === 'file' && selectedFile && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <div className="max-h-64 overflow-hidden rounded-lg">
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="w-full h-auto object-contain max-h-64 rounded-lg"
                      />
                    </div>
                  </div>
                )}
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setSelectedFile(null)
                      setUploadMethod('file')
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex items-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
