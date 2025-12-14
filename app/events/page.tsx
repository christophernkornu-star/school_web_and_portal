'use client'

import { useEffect, useState } from 'react'
import { Calendar, MapPin, Clock } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import SiteHeader from '@/components/SiteHeader'

export default function EventsPage() {
  const supabase = getSupabaseBrowserClient()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadEvents() {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('published', true)
        .order('event_date', { ascending: true })

      if (data) {
        setEvents(data)
      }
      setLoading(false)
    }

    loadEvents()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <SiteHeader />

      {/* Hero Section */}
      <section className="methodist-gradient text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <Calendar className="w-16 h-16 mx-auto mb-4" />
          <h2 className="text-4xl font-bold mb-4">School Events</h2>
          <p className="text-xl text-gray-200">
            Stay updated with our school activities and programs
          </p>
        </div>
      </section>

      {/* Events List */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-methodist-blue mx-auto"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming events at the moment.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {events.map((event) => (
                <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                  {event.image_url && (
                    <div className="h-48 bg-gradient-to-r from-methodist-blue to-blue-700"></div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-3 py-1 bg-ghana-green text-white text-xs font-semibold rounded-full">
                        {event.event_type || 'General'}
                      </span>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(event.event_date).toLocaleDateString('en-GB')}
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2">{event.title}</h3>
                    <p className="text-gray-600 mb-4 line-clamp-3">{event.description}</p>
                    <div className="space-y-2 text-sm text-gray-600">
                      {event.event_time && (
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-methodist-blue" />
                          <span>{event.event_time}</span>
                        </div>
                      )}
                      {event.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-methodist-blue" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
