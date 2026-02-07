'use client'

import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Megaphone, Plus, Send, Trash2, Edit, AlertCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AnnouncementsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
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
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setAnnouncements(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const user = await getCurrentUser()
    if (!user) return

    try {
      const announcementData = {
        ...formData,
        expires_at: formData.expires_at || null,
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
        toast.success('Announcement created successfully!')
      }

      setShowModal(false)
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
      loadAnnouncements()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (announcement: any) => {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (!error) {
      toast.success('Announcement deleted!')
      loadAnnouncements()
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-white shadow sticky top-0 z-10">
            <div className="container mx-auto px-4 md:px-6 py-4">
                <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <div>
                            <Skeleton className="w-48 h-6 mb-1" />
                            <Skeleton className="w-32 h-4" />
                        </div>
                    </div>
                    <Skeleton className="w-32 h-10 rounded-lg" />
                </div>
            </div>
        </div>

        <div className="container mx-auto px-4 md:px-6 py-8">
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6">
                        <div className="flex justify-between items-start mb-4">
                             <div className="flex items-start gap-4 w-full">
                                 <Skeleton className="w-10 h-10 rounded-lg" />
                                 <div className="flex-1">
                                     <Skeleton className="w-1/3 h-6 mb-2" />
                                     <Skeleton className="w-full h-4 mb-2" />
                                     <Skeleton className="w-2/3 h-4" />
                                 </div>
                             </div>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t">
                             <Skeleton className="w-24 h-4" />
                             <div className="flex gap-2">
                                 <Skeleton className="w-8 h-8 rounded" />
                                 <Skeleton className="w-8 h-8 rounded" />
                             </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
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
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Announcements</h1>
                <p className="text-xs md:text-sm text-gray-600">Create and manage school announcements</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setEditingId(null)
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
                setShowModal(true)
              }}
              className="bg-methodist-blue text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>New Announcement</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Megaphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements yet</h3>
            <p className="text-gray-600 mb-6">Create your first announcement to keep everyone informed</p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Announcement
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <div key={announcement.id} className="bg-white rounded-lg shadow p-4 md:p-6 hover:shadow-lg transition-shadow">
                <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0">
                  <div className="flex items-start space-x-3 md:space-x-4 flex-1 w-full">
                    <div className={`p-2 md:p-3 rounded-lg flex-shrink-0 ${
                      announcement.priority === 'urgent' ? 'bg-red-100' : 
                      announcement.priority === 'high' ? 'bg-orange-100' : 
                      'bg-blue-100'
                    }`}>
                      <Megaphone className={`w-5 h-5 md:w-6 md:h-6 ${
                        announcement.priority === 'urgent' ? 'text-red-600' :
                        announcement.priority === 'high' ? 'text-orange-600' :
                        'text-blue-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="font-bold text-base md:text-lg text-gray-800 break-words">{announcement.title}</h3>
                        <span className={`px-2 py-0.5 md:py-1 text-[10px] md:text-xs font-semibold rounded-full whitespace-nowrap ${
                          announcement.priority === 'urgent' ? 'bg-red-100 text-red-600' :
                          announcement.priority === 'high' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                        </span>
                        {!announcement.published && (
                          <span className="px-2 py-0.5 md:py-1 bg-gray-100 text-gray-600 text-[10px] md:text-xs font-semibold rounded-full whitespace-nowrap">
                            Draft
                          </span>
                        )}
                        {announcement.show_on_homepage && (
                          <span className="px-2 py-0.5 md:py-1 bg-green-100 text-green-600 text-[10px] md:text-xs font-semibold rounded-full whitespace-nowrap">
                            Homepage
                          </span>
                        )}
                      </div>
                      <p className="text-sm md:text-base text-gray-600 mb-3 whitespace-pre-wrap break-words">{announcement.content}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs md:text-sm text-gray-500">
                        <span className="capitalize px-2 py-0.5 bg-gray-100 rounded-full">{announcement.category}</span>
                        <div className="flex items-center space-x-1">
                          <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                        </div>
                        {announcement.expires_at && (
                          <div className="flex items-center space-x-1">
                            <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end space-x-2 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 mt-2 md:mt-0">
                    <button 
                      onClick={() => handleEdit(announcement)}
                      className="p-2 bg-blue-50 text-methodist-blue rounded hover:bg-blue-100 flex-1 md:flex-none flex justify-center"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="md:hidden ml-2 text-sm">Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDelete(announcement.id)}
                      className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100 flex-1 md:flex-none flex justify-center"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="md:hidden ml-2 text-sm">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" suppressHydrationWarning>
            <div className="bg-white rounded-lg max-w-2xl w-full p-4 md:p-6 overflow-y-auto max-h-[90vh]">
              <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4 sticky top-0 bg-white pb-2 border-b">
                {editingId ? 'Edit Announcement' : 'Create New Announcement'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="Announcement title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="Announcement content..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    >
                      <option value="general">General</option>
                      <option value="academic">Academic</option>
                      <option value="event">Event</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({...formData, priority: e.target.value as any})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
                  <div className="flex flex-wrap gap-4">
                    {['all', 'students', 'teachers', 'parents', 'public'].map((audience) => (
                      <label key={audience} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.target_audience.includes(audience)}
                          onChange={(e) => {
                            const newAudience = e.target.checked
                              ? [...formData.target_audience, audience]
                              : formData.target_audience.filter(a => a !== audience)
                            setFormData({...formData, target_audience: newAudience})
                          }}
                          className="w-4 h-4 text-methodist-blue rounded focus:ring-methodist-blue"
                        />
                        <span className="capitalize text-sm text-gray-700">{audience}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expires On (Optional)</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  />
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({...formData, published: e.target.checked})}
                      className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                    />
                    <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.show_on_homepage}
                      onChange={(e) => setFormData({...formData, show_on_homepage: e.target.checked})}
                      className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                    />
                    <span className="text-sm font-medium text-gray-700">Show on homepage</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingId(null)
                    }}
                    disabled={saving}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : editingId ? 'Update' : 'Create'}</span>
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
