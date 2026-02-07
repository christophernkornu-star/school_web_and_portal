'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Lock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function SecuritySettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [formData, setFormData] = useState({
    session_timeout_minutes: '60',
    password_min_length: '8',
    require_password_change_days: '90',
    max_login_attempts: '5',
    enable_two_factor: false,
    allow_teacher_delete_scores: false,
    allow_student_profile_edit: true,
  })

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data, error } = await supabase
        .from('security_settings')
        .select('*')
        .single() as { data: any; error: any }

      if (data) {
        setSettingsId(data.id)
        setFormData({
          session_timeout_minutes: data.session_timeout_minutes?.toString() || '60',
          password_min_length: data.password_min_length?.toString() || '8',
          require_password_change_days: data.require_password_change_days?.toString() || '90',
          max_login_attempts: data.max_login_attempts?.toString() || '5',
          enable_two_factor: data.enable_two_factor ?? false,
          allow_teacher_delete_scores: data.allow_teacher_delete_scores ?? false,
          allow_student_profile_edit: data.allow_student_profile_edit ?? true,
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
        .from('security_settings')
        .update({
          session_timeout_minutes: parseInt(formData.session_timeout_minutes),
          password_min_length: parseInt(formData.password_min_length),
          require_password_change_days: parseInt(formData.require_password_change_days),
          max_login_attempts: parseInt(formData.max_login_attempts),
          enable_two_factor: formData.enable_two_factor,
          allow_teacher_delete_scores: formData.allow_teacher_delete_scores,
          allow_student_profile_edit: formData.allow_student_profile_edit,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', settingsId)

      if (error) {
        toast.error('Failed to update settings: ' + error.message)
      } else {
        toast.success('Security settings updated successfully!')
        router.push('/admin/settings')
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      toast.error('Failed to update settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div className="flex items-center space-x-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/settings" />
            <div className="flex items-center space-x-3">
              <Lock className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Security & Access</h1>
                <p className="text-xs md:text-sm text-gray-600">Manage security settings and permissions</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Authentication Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Authentication Settings</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input
                  type="number"
                  value={formData.session_timeout_minutes}
                  onChange={(e) => setFormData({...formData, session_timeout_minutes: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  min="5"
                  max="1440"
                />
                <p className="text-[10px] md:text-xs text-gray-500 mt-1">Auto-logout after inactivity</p>
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Max Login Attempts</label>
                <input
                  type="number"
                  value={formData.max_login_attempts}
                  onChange={(e) => setFormData({...formData, max_login_attempts: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  min="3"
                  max="10"
                />
                <p className="text-[10px] md:text-xs text-gray-500 mt-1">Block account after failed attempts</p>
              </div>
            </div>
          </div>

          {/* Password Policy */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Password Policy</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Password Length</label>
                <input
                  type="number"
                  value={formData.password_min_length}
                  onChange={(e) => setFormData({...formData, password_min_length: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  min="6"
                  max="20"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum characters required</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Change Frequency (days)</label>
                <input
                  type="number"
                  value={formData.require_password_change_days}
                  onChange={(e) => setFormData({...formData, require_password_change_days: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  min="0"
                  max="365"
                />
                <p className="text-xs text-gray-500 mt-1">0 = no expiration</p>
              </div>
            </div>
          </div>

          {/* Access Permissions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Access Permissions</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Enable Two-Factor Authentication</p>
                  <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.enable_two_factor}
                  onChange={(e) => setFormData({...formData, enable_two_factor: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Allow Teachers to Delete Scores</p>
                  <p className="text-sm text-gray-600">Teachers can delete entered scores</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_teacher_delete_scores}
                  onChange={(e) => setFormData({...formData, allow_teacher_delete_scores: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Allow Students to Edit Profile</p>
                  <p className="text-sm text-gray-600">Students can update their own information</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_student_profile_edit}
                  onChange={(e) => setFormData({...formData, allow_student_profile_edit: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Warning:</strong> Changing security settings may affect all users. Make sure you understand the implications before saving.
            </p>
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
