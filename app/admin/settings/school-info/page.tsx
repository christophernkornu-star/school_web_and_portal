'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, School } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function SchoolInfoSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [formData, setFormData] = useState({
    school_name: '',
    school_motto: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    principal_name: '',
    principal_email: '',
    principal_phone: '',
    founded_year: '',
  })

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load current settings
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .single() as { data: any; error: any }

      if (data) {
        setSettingsId(data.id)
        setFormData({
          school_name: data.school_name || '',
          school_motto: data.school_motto || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
          principal_name: data.principal_name || '',
          principal_email: data.principal_email || '',
          principal_phone: data.principal_phone || '',
          founded_year: data.founded_year?.toString() || '',
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
        .from('school_settings')
        .update({
          ...formData,
          founded_year: formData.founded_year ? parseInt(formData.founded_year) : null,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        })
        .eq('id', settingsId)

      if (error) {
        alert('Failed to update settings: ' + error.message)
      } else {
        alert('School information updated successfully!')
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
            <Link href="/admin/settings" className="text-methodist-blue hover:text-blue-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">School Information</h1>
              <p className="text-xs md:text-sm text-gray-600">Update school details and contact information</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <School className="w-6 h-6 text-methodist-blue" />
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Basic Information</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Name *</label>
                <input
                  type="text"
                  required
                  value={formData.school_name}
                  onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Motto</label>
                <input
                  type="text"
                  value={formData.school_motto}
                  onChange={(e) => setFormData({...formData, school_motto: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="P.O. Box, Street, Town, Region"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="info@school.edu.gh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="https://www.school.edu.gh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Founded Year</label>
                <input
                  type="number"
                  value={formData.founded_year}
                  onChange={(e) => setFormData({...formData, founded_year: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="e.g., 1950"
                  min="1800"
                  max={new Date().getFullYear()}
                />
              </div>
            </div>
          </div>

          {/* Principal Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-3 mb-6">
              <School className="w-6 h-6 text-methodist-blue" />
              <h2 className="text-lg md:text-xl font-bold text-gray-800">Principal Information</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Principal Name</label>
                <input
                  type="text"
                  value={formData.principal_name}
                  onChange={(e) => setFormData({...formData, principal_name: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="Mr./Mrs./Ms. Full Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Principal Email</label>
                <input
                  type="email"
                  value={formData.principal_email}
                  onChange={(e) => setFormData({...formData, principal_email: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="principal@school.edu.gh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Principal Phone</label>
                <input
                  type="tel"
                  value={formData.principal_phone}
                  onChange={(e) => setFormData({...formData, principal_phone: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="+233 XX XXX XXXX"
                />
              </div>
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
