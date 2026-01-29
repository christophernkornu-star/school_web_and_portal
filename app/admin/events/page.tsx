'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar as CalendarIcon, Plus, MapPin, Clock, Edit, Trash2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

export default function EventsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_date: '',
    event_time: '',
    location: '',
    event_type: 'academic',
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

    const { data } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true })

    if (data) setEvents(data)
    setLoading(false)
  }

  function openAddModal() {
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
    setShowModal(true)
  }

  function openEditModal(event: any) {
    setEditingId(event.id)
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || '',
      event_time: event.event_time || '',
      location: event.location || '',
      event_type: event.event_type || 'academic',
      published: event.published ?? true,
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      if (editingId) {
        const { error } = await supabase
          .from('events')
          .update(formData)
          .eq('id', editingId)

        if (error) throw error
        toast.success('Event updated successfully!')
      } else {
        const { error } = await supabase
          .from('events')
          .insert([formData])

        if (error) throw error
        toast.success('Event created successfully!')
      }

      setShowModal(false)
      loadData()
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error

      setEvents(prev => prev.filter(e => e.id !== id))
      toast.success('Event deleted successfully!')
    } catch (error: any) {
      toast.error('Error: ' + error.message)
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
    } catch (error: any) {
      toast.error('Error: ' + error.message)
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'academic': return 'bg-blue-100 text-blue-600'
      case 'sports': return 'bg-green-100 text-green-600'
      case 'cultural': return 'bg-purple-100 text-purple-600'
      case 'religious': return 'bg-yellow-100 text-yellow-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const getEventIconBg = (type: string) => {
    switch (type) {
      case 'academic': return 'bg-blue-100'
      case 'sports': return 'bg-green-100'
      case 'cultural': return 'bg-purple-100'
      case 'religious': return 'bg-yellow-100'
      default: return 'bg-gray-100'
    }
  }

  const getEventIconColor = (type: string) => {
    switch (type) {
      case 'academic': return 'text-blue-600'
      case 'sports': return 'text-green-600'
      case 'cultural': return 'text-purple-600'
      case 'religious': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 md:space-x-4">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div>
                  <Skeleton className="h-8 w-32 mb-1" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start space-x-4">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-4" />
                    <div className="flex justify-between pt-4 border-t">
                      <Skeleton className="h-8 w-20 rounded" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </div>
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 md:space-x-4">
              <BackButton href="/admin/dashboard" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">School Events</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage and schedule school events</p>
              </div>
            </div>
            <button 
              onClick={openAddModal}
              className="bg-ghana-green text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Event</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {events.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 md:p-12 text-center">
            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-6">Create your first event to display on the website</p>
            <button
              onClick={openAddModal}
              className="inline-flex items-center px-4 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Event
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start space-x-4">
                  <div className={`${getEventIconBg(event.event_type)} p-3 rounded-lg`}>
                    <CalendarIcon className={`w-6 h-6 ${getEventIconColor(event.event_type)}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-base md:text-lg text-gray-800">{event.title}</h3>
                      <span className={`px-2 py-1 ${getEventColor(event.event_type)} text-[10px] md:text-xs font-semibold rounded-full capitalize`}>
                        {event.event_type}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-xs md:text-sm text-gray-600 mb-3">{event.description}</p>
                    )}
                    <div className="space-y-2 text-xs md:text-sm text-gray-600">
                      <div className="flex items-center">
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {new Date(event.event_date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </div>
                      {event.event_time && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2" />
                          {event.event_time}
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2" />
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <button
                        onClick={() => togglePublished(event.id, event.published)}
                        className={`px-3 py-1 text-sm font-medium rounded ${
                          event.published
                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {event.published ? 'Published' : 'Publish'}
                      </button>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => openEditModal(event)}
                          className="p-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(event.id)}
                          className="p-2 bg-red-50 text-red-600 rounded hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">
                {editingId ? 'Edit Event' : 'Create New Event'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    placeholder="e.g., Inter-House Sports Competition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    placeholder="Brief description of the event..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.event_date}
                      onChange={(e) => setFormData({...formData, event_date: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Event Time</label>
                    <input
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => setFormData({...formData, event_time: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                    placeholder="e.g., School Field, School Hall"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({...formData, event_type: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ghana-green"
                  >
                    <option value="academic">Academic</option>
                    <option value="sports">Sports</option>
                    <option value="cultural">Cultural</option>
                    <option value="religious">Religious</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.published}
                      onChange={(e) => setFormData({...formData, published: e.target.checked})}
                      className="w-5 h-5 text-ghana-green rounded focus:ring-2 focus:ring-ghana-green"
                    />
                    <span className="text-sm font-medium text-gray-700">Publish to website</span>
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    disabled={saving}
                    className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-ghana-green text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : editingId ? 'Update Event' : 'Create Event'}
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
