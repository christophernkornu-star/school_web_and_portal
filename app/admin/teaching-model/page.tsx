'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Save, Settings } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function TeachingModelConfigPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [upperPrimaryModel, setUpperPrimaryModel] = useState<'class_teacher' | 'subject_teacher'>('class_teacher')

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load current teaching model setting
      const settingsResult = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'upper_primary_teaching_model')
        .single()
      const data = settingsResult.data as any

      if (data) {
        setUpperPrimaryModel(data.setting_value as 'class_teacher' | 'subject_teacher')
      }

      setLoading(false)
    }

    loadSettings()
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'upper_primary_teaching_model',
          setting_value: upperPrimaryModel,
          description: 'Teaching model for Basic 4-6: class_teacher or subject_teacher'
        }, {
          onConflict: 'setting_key'
        })

      if (error) throw error

      toast.success('Teaching model configuration saved successfully!')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 bg-opacity-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl space-y-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/dashboard" />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-800">Teaching Model Configuration</h1>
              <p className="text-xs md:text-sm text-gray-600">Configure how classes are organized across school levels</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8 max-w-4xl">
        {/* Lower Primary Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-6 h-6 text-methodist-blue" />
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Lower Primary (Basic 1-3)</h2>
          </div>
          <div className="bg-blue-50 border-l-4 border-methodist-blue p-4 rounded">
            <p className="text-sm font-semibold text-blue-900 mb-2">Fixed: Class Teacher Model</p>
            <p className="text-sm text-blue-800">
              One teacher teaches all subjects to their class. This model cannot be changed for Lower Primary.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-blue-700">
              <li>✅ Teacher has full access to all subjects</li>
              <li>✅ Teacher marks attendance</li>
              <li>✅ Teacher enters student names and manages class</li>
            </ul>
          </div>
        </div>

        {/* Upper Primary Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-6 h-6 text-ghana-green" />
            <h2 className="text-xl font-bold text-gray-800">Upper Primary (Basic 4-6)</h2>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Choose how Basic 4-6 classes are organized:
          </p>

          <div className="space-y-4">
            {/* Class Teacher Model Option */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              upperPrimaryModel === 'class_teacher'
                ? 'border-ghana-green bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="upperPrimaryModel"
                  value="class_teacher"
                  checked={upperPrimaryModel === 'class_teacher'}
                  onChange={(e) => setUpperPrimaryModel(e.target.value as 'class_teacher')}
                  className="mt-1 w-5 h-5 text-ghana-green"
                />
                <div className="ml-3 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Class Teacher Model</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    One teacher assigned to teach all subjects in the class. Similar to Lower Primary model.
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>✅ Teacher has full access to all subjects</li>
                    <li>✅ Teacher marks attendance</li>
                    <li>✅ Ideal when teacher availability is limited</li>
                  </ul>
                </div>
              </div>
            </label>

            {/* Subject Teacher Model Option */}
            <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
              upperPrimaryModel === 'subject_teacher'
                ? 'border-ghana-green bg-green-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="upperPrimaryModel"
                  value="subject_teacher"
                  checked={upperPrimaryModel === 'subject_teacher'}
                  onChange={(e) => setUpperPrimaryModel(e.target.value as 'subject_teacher')}
                  className="mt-1 w-5 h-5 text-ghana-green"
                />
                <div className="ml-3 flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">Subject Teacher Model</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Multiple teachers assigned to teach specific subjects in the class. Similar to JHS model.
                  </p>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>✅ One teacher designated as Class Teacher</li>
                    <li>✅ Class teacher marks attendance and manages students</li>
                    <li>✅ Class teacher views all subjects, edits only assigned</li>
                    <li>✅ Subject teachers only see their subjects</li>
                    <li>✅ Ideal for subject specialization</li>
                  </ul>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* JHS Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-6 h-6 text-methodist-gold" />
            <h2 className="text-xl font-bold text-gray-800">Junior High School (JHS 1-3)</h2>
          </div>
          <div className="bg-yellow-50 border-l-4 border-methodist-gold p-4 rounded">
            <p className="text-sm font-semibold text-yellow-900 mb-2">Fixed: Subject Teacher Model</p>
            <p className="text-sm text-yellow-800">
              Multiple teachers teach different subjects. This model cannot be changed for JHS.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-yellow-700">
              <li>✅ One teacher designated as Class Teacher per class</li>
              <li>✅ Class teacher marks attendance and manages students</li>
              <li>✅ Subject teachers only see and edit their assigned subjects</li>
              <li>✅ Enables subject specialization</li>
            </ul>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-ghana-green text-white rounded-lg hover:bg-green-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>

        {/* Important Note */}
        <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Important</h3>
          <p className="text-sm text-red-700">
            Changing the teaching model affects how teachers are assigned and what they can access.
            Make sure to update teacher assignments after changing this setting.
          </p>
        </div>
      </main>
    </div>
  )
}
