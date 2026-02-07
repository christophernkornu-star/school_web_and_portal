'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, RefreshCw, TrendingUp } from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function HomepageStatsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    stats_title: '',
    stats_subtitle: '',
    founding_year: '',
    teacher_student_ratio: '',
    bece_participation: '',
    bece_pass_rate: '',
    grade_levels: ''
  })

  useEffect(() => {
    async function init() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }
      loadSettings()
    }
    init()
  }, [router])

  const loadSettings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['stats_title', 'stats_subtitle', 'founding_year', 'teacher_student_ratio', 'bece_participation', 'bece_pass_rate', 'grade_levels']) as { data: any[] | null; error: any }

    if (data) {
      const settingsObj: any = {}
      data.forEach((s: any) => {
        settingsObj[s.setting_key] = s.setting_value
      })
      setSettings({
        stats_title: settingsObj.stats_title || 'Our Impact in Numbers',
        stats_subtitle: settingsObj.stats_subtitle || 'Building excellence in education for over six decades',
        founding_year: settingsObj.founding_year || '1960',
        teacher_student_ratio: settingsObj.teacher_student_ratio || '1:15',
        bece_participation: settingsObj.bece_participation || '100%',
        bece_pass_rate: settingsObj.bece_pass_rate || '85',
        grade_levels: settingsObj.grade_levels || '9'
      })
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      // Update each setting
      const updates = Object.entries(settings).map(([key, value]) => 
        supabase
          .from('system_settings')
          .upsert({
            setting_key: key,
            setting_value: value,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'setting_key'
          })
      )

      await Promise.all(updates)
      toast.success('Settings saved successfully! Changes will appear on the homepage.')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Error saving settings. Please try again.')
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
              <div>
                <Skeleton className="h-8 w-64 mb-1" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-96 w-full rounded-lg" />
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
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Homepage Statistics</h1>
              <p className="text-xs md:text-sm text-gray-600">Edit statistics displayed on the public website</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Statistics Section */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center space-x-3 mb-6">
              <TrendingUp className="w-6 h-6 text-methodist-gold" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">Statistics Content</h2>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section Title
                </label>
                <input
                  type="text"
                  value={settings.stats_title}
                  onChange={(e) => setSettings({ ...settings, stats_title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                  placeholder="Our Impact in Numbers"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Section Subtitle
                </label>
                <input
                  type="text"
                  value={settings.stats_subtitle}
                  onChange={(e) => setSettings({ ...settings, stats_subtitle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                  placeholder="Building excellence in education for over six decades"
                />
              </div>

              {/* Founding Year */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Founding Year
                </label>
                <input
                  type="number"
                  value={settings.founding_year}
                  onChange={(e) => setSettings({ ...settings, founding_year: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                  placeholder="1960"
                />
                <p className="text-xs text-gray-500 mt-1">Used to calculate years of operation (automatically updates annually)</p>
              </div>

              {/* Three Columns for Secondary Stats */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Teacher-Student Ratio */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Teacher-Student Ratio
                  </label>
                  <input
                    type="text"
                    value={settings.teacher_student_ratio}
                    onChange={(e) => setSettings({ ...settings, teacher_student_ratio: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                    placeholder="1:15"
                  />
                </div>

                {/* BECE Participation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    BECE Participation
                  </label>
                  <input
                    type="text"
                    value={settings.bece_participation}
                    onChange={(e) => setSettings({ ...settings, bece_participation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                    placeholder="100%"
                  />
                </div>

                {/* Grade Levels */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Grade Levels
                  </label>
                  <input
                    type="text"
                    value={settings.grade_levels}
                    onChange={(e) => setSettings({ ...settings, grade_levels: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                    placeholder="9"
                  />
                  <p className="text-xs text-gray-500 mt-1">e.g., "9" for KG1-JHS3</p>
                </div>
              </div>

              {/* BECE Pass Rate - Full Width */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  BECE Pass Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.bece_pass_rate}
                  onChange={(e) => setSettings({ ...settings, bece_pass_rate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-methodist-blue focus:border-transparent"
                  placeholder="85"
                />
                <p className="text-xs text-gray-500 mt-1">Enter the most recent BECE pass rate percentage (e.g., 85 for 85%)</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={loadSettings}
                disabled={saving}
                className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reset</span>
              </button>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center space-x-2 px-6 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Preview</h3>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-8 border-2 border-gray-200">
              <div className="text-center mb-8">
                <h4 className="text-3xl font-bold text-methodist-blue mb-2">
                  {settings.stats_title}
                </h4>
                <p className="text-gray-600">{settings.stats_subtitle}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="text-4xl font-bold text-methodist-blue mb-1" suppressHydrationWarning>
                    {new Date().getFullYear() - parseInt(settings.founding_year || '1960')}+
                  </div>
                  <div className="text-xs text-gray-600">Years of Excellence</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="text-4xl font-bold text-ghana-green mb-1">500</div>
                  <div className="text-xs text-gray-600">Active Students</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="text-4xl font-bold text-methodist-gold mb-1">25</div>
                  <div className="text-xs text-gray-600">Qualified Teachers</div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                  <div className="text-4xl font-bold text-ghana-red mb-1">{settings.bece_pass_rate}%</div>
                  <div className="text-xs text-gray-600">BECE Pass Rate</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-methodist-blue mb-1">{settings.teacher_student_ratio}</div>
                  <div className="text-xs text-gray-600">Teacher-Student Ratio</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-methodist-blue mb-1">{settings.bece_participation}</div>
                  <div className="text-xs text-gray-600">BECE Participation</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-sm text-center">
                  <div className="text-2xl font-bold text-methodist-blue mb-1">{settings.grade_levels}</div>
                  <div className="text-xs text-gray-600">Grade Levels (KG-JHS)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
