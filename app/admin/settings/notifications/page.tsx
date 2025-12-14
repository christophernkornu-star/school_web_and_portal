'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Bell } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function NotificationSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [formData, setFormData] = useState({
    email_enabled: true,
    sms_enabled: false,
    email_host: '',
    email_port: '',
    email_username: '',
    email_password: '',
    sms_api_key: '',
    sms_sender_id: '',
    notify_attendance: true,
    notify_results: true,
    notify_fees: true,
    notify_announcements: true,
  })

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .single() as { data: any; error: any }

      if (data) {
        setSettingsId(data.id)
        setFormData({
          email_enabled: data.email_enabled ?? true,
          sms_enabled: data.sms_enabled ?? false,
          email_host: data.email_host || '',
          email_port: data.email_port?.toString() || '',
          email_username: data.email_username || '',
          email_password: data.email_password || '',
          sms_api_key: data.sms_api_key || '',
          sms_sender_id: data.sms_sender_id || '',
          notify_attendance: data.notify_attendance ?? true,
          notify_results: data.notify_results ?? true,
          notify_fees: data.notify_fees ?? true,
          notify_announcements: data.notify_announcements ?? true,
        })
      }

      setLoading(false)
    }
    loadSettings()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const user = await getCurrentUser()
      
      const { error } = await supabase
        .from('notification_settings')
        .update({
          ...formData,
          email_port: formData.email_port ? parseInt(formData.email_port) : null,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', settingsId)

      if (error) {
        alert('Failed to update settings: ' + error.message)
      } else {
        alert('Notification settings updated successfully!')
        router.push('/admin/settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      alert('Failed to update settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-methodist-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/settings" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div className="flex items-center space-x-3">
              <Bell className="w-8 h-8 text-yellow-600" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Notification Settings</h1>
                <p className="text-xs md:text-sm text-gray-600">Configure email and SMS notifications</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Email Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-gray-800">Email Notifications</h2>
              <label className="flex items-center cursor-pointer">
                <span className="mr-3 text-xs md:text-sm text-gray-700">Enable Email</span>
                <input
                  type="checkbox"
                  checked={formData.email_enabled}
                  onChange={(e) => setFormData({...formData, email_enabled: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
            </div>
            
            {formData.email_enabled && (
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                  <input
                    type="text"
                    value={formData.email_host}
                    onChange={(e) => setFormData({...formData, email_host: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="smtp.gmail.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                  <input
                    type="number"
                    value={formData.email_port}
                    onChange={(e) => setFormData({...formData, email_port: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="587"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Username</label>
                  <input
                    type="email"
                    value={formData.email_username}
                    onChange={(e) => setFormData({...formData, email_username: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="noreply@school.edu.gh"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Password</label>
                  <input
                    type="password"
                    value={formData.email_password}
                    onChange={(e) => setFormData({...formData, email_password: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
          </div>

          {/* SMS Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800">SMS Notifications</h2>
              <label className="flex items-center cursor-pointer">
                <span className="mr-3 text-sm text-gray-700">Enable SMS</span>
                <input
                  type="checkbox"
                  checked={formData.sms_enabled}
                  onChange={(e) => setFormData({...formData, sms_enabled: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
            </div>
            
            {formData.sms_enabled && (
              <div className="grid md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">SMS API Key</label>
                  <input
                    type="text"
                    value={formData.sms_api_key}
                    onChange={(e) => setFormData({...formData, sms_api_key: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="Your SMS gateway API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sender ID</label>
                  <input
                    type="text"
                    value={formData.sms_sender_id}
                    onChange={(e) => setFormData({...formData, sms_sender_id: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                    placeholder="SCHOOL"
                    maxLength={11}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notification Types */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Notification Types</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Attendance Notifications</p>
                  <p className="text-sm text-gray-600">Notify parents about student attendance</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_attendance}
                  onChange={(e) => setFormData({...formData, notify_attendance: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Results Notifications</p>
                  <p className="text-sm text-gray-600">Notify students when results are published</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_results}
                  onChange={(e) => setFormData({...formData, notify_results: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Fee Notifications</p>
                  <p className="text-sm text-gray-600">Notify parents about fee payments and reminders</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_fees}
                  onChange={(e) => setFormData({...formData, notify_fees: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Announcement Notifications</p>
                  <p className="text-sm text-gray-600">Notify users about new announcements</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.notify_announcements}
                  onChange={(e) => setFormData({...formData, notify_announcements: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-4">
            <Link href="/admin/settings" className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
