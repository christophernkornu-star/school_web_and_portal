'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { Megaphone, AlertCircle, Calendar, Bell, Info } from 'lucide-react'

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadAnnouncements()
  }, [])

  async function loadAnnouncements() {
    try {
      const { data } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .eq('show_on_homepage', true)
        .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3)

      if (data) {
        setAnnouncements(data)
      }
    } catch (error) {
      console.error('Error loading announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityGradient = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-gradient-to-r from-red-600 to-red-700'
      case 'high':
        return 'bg-gradient-to-r from-orange-600 to-orange-700'
      default:
        return 'bg-gradient-to-r from-blue-600 to-blue-700'
    }
  }

  const getPriorityAccent = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500'
      case 'high':
        return 'border-orange-500'
      default:
        return 'border-blue-500'
    }
  }

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent') {
      return <AlertCircle className="w-6 h-6" />
    }
    if (priority === 'high') {
      return <Bell className="w-6 h-6" />
    }
    return <Info className="w-6 h-6" />
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'URGENT'
      case 'high':
        return 'IMPORTANT'
      default:
        return 'NOTICE'
    }
  }

  if (loading || announcements.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">Latest Announcements</h2>
          <p className="text-gray-600 text-lg">Stay informed with important updates from the school</p>
        </div>
        <div className="space-y-6">
          {announcements.map((announcement) => (
        <div
          key={announcement.id}
          className={`relative overflow-hidden rounded-xl border-2 ${getPriorityAccent(announcement.priority)} bg-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
        >
          {/* Priority Header Bar */}
          <div className={`${getPriorityGradient(announcement.priority)} px-6 py-3 flex items-center justify-between`}>
            <div className="flex items-center space-x-3 text-white">
              {getPriorityIcon(announcement.priority)}
              <span className="font-bold text-sm tracking-wider">{getPriorityLabel(announcement.priority)}</span>
            </div>
            {announcement.expires_at && (
              <div className="flex items-center space-x-2 text-white text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">
                <Calendar className="w-4 h-4" />
                <span>Until {new Date(announcement.expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{announcement.title}</h3>
            <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
            
            {/* Category Badge */}
            <div className="mt-4 flex items-center space-x-2">
              <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full uppercase">
                {announcement.category}
              </span>
              <span className="text-xs text-gray-500">
                Posted {new Date(announcement.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Decorative Corner Accent */}
          <div className={`absolute top-0 right-0 w-24 h-24 ${getPriorityGradient(announcement.priority)} opacity-10 transform rotate-45 translate-x-12 -translate-y-12`}></div>
        </div>
          ))}
        </div>
      </div>
    </section>
  )
}
