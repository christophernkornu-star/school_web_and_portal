'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, Upload } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import Image from 'next/image'

export default function AdminNewsPage() {
  const supabase = getSupabaseBrowserClient()
  const [news, setNews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingNews, setEditingNews] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('file')
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
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setNews(data)
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
        .from('news-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('news-images')
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
      let featuredImage = formData.featured_image

      // If using file upload and not editing, upload the file first
      if (uploadMethod === 'file' && selectedFile && !editingNews) {
        const uploadedUrl = await uploadFile(selectedFile)
        if (uploadedUrl) {
          featuredImage = uploadedUrl
        }
      }

      const dataToSubmit = { ...formData, featured_image: featuredImage }

      if (editingNews) {
        await supabase
          .from('news')
          .update(dataToSubmit)
          .eq('id', editingNews.id)
        toast.success('News updated successfully')
      } else {
        await supabase
          .from('news')
          .insert([dataToSubmit])
        toast.success('News created successfully')
      }

      setShowModal(false)
      setEditingNews(null)
      setFormData({
        title: '',
        content: '',
        summary: '',
        featured_image: '',
        category: 'general',
        published: false
      })
      setSelectedFile(null)
      setUploadMethod('file')
      fetchNews()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const handleEdit = (newsItem: any) => {
    setEditingNews(newsItem)
    setFormData({
      title: newsItem.title,
      content: newsItem.content,
      summary: newsItem.summary || '',
      featured_image: newsItem.featured_image || '',
      category: newsItem.category,
      published: newsItem.published
    })
    setUploadMethod('url') // Default to URL when editing
    setSelectedFile(null)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this news item?')) {
      try {
        await supabase.from('news').delete().eq('id', id)
        toast.success('News deleted successfully')
        fetchNews()
      } catch (error) {
        toast.error('Failed to delete news')
      }
    }
  }

  const togglePublish = async (newsItem: any) => {
    try {
      await supabase
        .from('news')
        .update({ published: !newsItem.published })
        .eq('id', newsItem.id)
      fetchNews()
      toast.success(newsItem.published ? 'News unpublished' : 'News published')
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <Skeleton className="w-full md:w-32 h-48 md:h-24 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">News Management</h1>
                <p className="text-xs md:text-sm text-gray-600">Create and manage school news</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingNews(null)
                setFormData({
                  title: '',
                  content: '',
                  summary: '',
                  featured_image: '',
                  category: 'general',
                  published: false
                })
                setShowModal(true)
              }}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 w-full md:w-auto"
            >
              <Plus className="w-5 h-5" />
              <span>Add News</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Total News</p>
            <p className="text-lg md:text-2xl font-bold text-gray-800">{news.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Published</p>
            <p className="text-lg md:text-2xl font-bold text-green-600">{news.filter(n => n.published).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">Drafts</p>
            <p className="text-lg md:text-2xl font-bold text-yellow-600">{news.filter(n => !n.published).length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-gray-600 text-xs md:text-sm">This Month</p>
            <p className="text-lg md:text-2xl font-bold text-blue-600">
              {news.filter(n => new Date(n.created_at).getMonth() === new Date().getMonth()).length}
            </p>
          </div>
        </div>

        {/* News List */}
        <div className="space-y-4">
          {news.map((newsItem) => (
            <div key={newsItem.id} className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row items-start gap-4">
                {newsItem.featured_image && (
                  <div className="w-full md:w-32 h-48 md:h-24 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image 
                      src={newsItem.featured_image} 
                      alt={newsItem.title} 
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 128px"
                    />
                  </div>
                )}
                <div className="flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mr-2">{newsItem.title}</h3>
                    <span className={`px-2 py-1 text-[10px] md:text-xs font-semibold rounded-full ${
                      newsItem.published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {newsItem.published ? 'Published' : 'Draft'}
                    </span>
                    <span className="px-2 py-1 text-[10px] md:text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {newsItem.category}
                    </span>
                  </div>
                  <p className="text-gray-600 text-xs md:text-sm mb-3">{newsItem.summary || newsItem.content.substring(0, 150) + '...'}</p>
                  <p className="text-[10px] md:text-xs text-gray-500">Created: {new Date(newsItem.created_at).toLocaleString()}</p>
                </div>
                <div className="flex space-x-2 w-full md:w-auto justify-end mt-2 md:mt-0">
                  <button
                    onClick={() => togglePublish(newsItem)}
                    className={`p-2 rounded-lg ${
                      newsItem.published 
                        ? 'text-yellow-600 hover:bg-yellow-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={newsItem.published ? "Unpublish" : "Publish"}
                  >
                    {newsItem.published ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleEdit(newsItem)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Edit"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(newsItem.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">
                {editingNews ? 'Edit News' : 'Add News'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
                  <input
                    type="text"
                    value={formData.summary}
                    onChange={(e) => setFormData({...formData, summary: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    placeholder="Brief summary for preview"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                  />
                </div>
                
                {/* Upload Method Toggle */}
                <div className="border-t border-b py-4">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Featured Image</label>
                  <div className="flex space-x-4 mb-4">
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

                  {/* File Upload */}
                  {uploadMethod === 'file' && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
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
                      <input
                        type="url"
                        value={formData.featured_image}
                        onChange={(e) => setFormData({...formData, featured_image: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                        placeholder="https://example.com/image.jpg"
                      />
                      <p className="text-xs text-gray-500 mt-1">Enter the direct URL to the image</p>
                    </div>
                  )}

                  {/* Preview */}
                  {uploadMethod === 'url' && formData.featured_image && (
                    <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <img
                        src={formData.featured_image}
                        alt="Preview"
                        className="w-full h-auto max-h-48 object-contain rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"%3E%3Crect fill="%23ddd" width="400" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EInvalid Image URL%3C/text%3E%3C/svg%3E'
                        }}
                      />
                    </div>
                  )}
                  {uploadMethod === 'file' && selectedFile && (
                    <div className="mt-3 border rounded-lg p-3 bg-gray-50">
                      <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt="Preview"
                        className="w-full h-auto max-h-48 object-contain rounded-lg"
                      />
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    >
                      <option value="general">General</option>
                      <option value="academic">Academic</option>
                      <option value="sports">Sports</option>
                      <option value="achievements">Achievements</option>
                      <option value="events">Events</option>
                    </select>
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.published}
                        onChange={(e) => setFormData({...formData, published: e.target.checked})}
                        className="w-5 h-5 text-ghana-green focus:ring-ghana-green"
                      />
                      <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                    </label>
                  </div>
                </div>
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
                      <span>{editingNews ? 'Update' : 'Create'} News</span>
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
