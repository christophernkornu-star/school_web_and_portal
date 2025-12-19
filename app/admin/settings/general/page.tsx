'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Globe, BookOpen, TrendingUp, ArrowRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function GeneralSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [upperPrimaryModel, setUpperPrimaryModel] = useState('class_teacher')
  // const [academicTerms, setAcademicTerms] = useState<any[]>([]) // Removed dynamic terms
  const [formData, setFormData] = useState({
    current_academic_year: '',
    current_term: '',
    term_start_date: '',
    term_end_date: '',
    next_term_starts: '',
    school_reopening_date: '',
    vacation_start_date: '',
    allow_online_admission: true,
    allow_result_viewing: true,
    allow_cumulative_download: false,
  })

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load settings from academic_settings table (for dates and flags)
      const { data: academicSettings } = await supabase
        .from('academic_settings')
        .select('*')
        .single()

      // Load system_settings for other configs
      const { data: systemSettingsData } = await supabase
        .from('system_settings')
        .select('*') as { data: any[] | null }

      const systemSettingsMap = new Map(systemSettingsData?.map((s: any) => [s.setting_key, s.setting_value]) || [])

      // Check if we have a current term ID in system settings (source of truth for other portals)
      const currentTermId = systemSettingsMap.get('current_term')
      let currentTermName = academicSettings?.current_term || ''
      let currentAcademicYear = academicSettings?.current_academic_year || ''

      if (currentTermId) {
        const { data: termData } = await supabase
          .from('academic_terms')
          .select('name, academic_year')
          .eq('id', currentTermId)
          .single()
        
        if (termData) {
          currentTermName = termData.name
          currentAcademicYear = termData.academic_year
        }
      }

      if (academicSettings) {
        setFormData({
          current_academic_year: currentAcademicYear,
          current_term: currentTermName,
          term_start_date: academicSettings.term_start_date || '',
          term_end_date: academicSettings.term_end_date || '',
          next_term_starts: academicSettings.next_term_starts || '',
          school_reopening_date: academicSettings.school_reopening_date || '',
          vacation_start_date: academicSettings.vacation_start_date || '',
          allow_online_admission: academicSettings.allow_online_admission ?? true,
          allow_result_viewing: academicSettings.allow_result_viewing ?? true,
          allow_cumulative_download: systemSettingsMap.get('allow_cumulative_download') === 'true',
        })
      }
      
      setUpperPrimaryModel(systemSettingsMap.get('upper_primary_teaching_model') || 'class_teacher')

      setLoading(false)
    }
    loadSettings()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const user = await getCurrentUser()
      
      // 1. Update academic_settings table
      const { error: academicError } = await supabase
        .from('academic_settings')
        .update({
          current_academic_year: formData.current_academic_year,
          current_term: formData.current_term,
          term_start_date: formData.term_start_date || null,
          term_end_date: formData.term_end_date || null,
          next_term_starts: formData.next_term_starts || null,
          // Simplify: Reopening date is same as term start, Vacation start is same as term end
          school_reopening_date: formData.term_start_date || null,
          vacation_start_date: formData.term_end_date || null,
          allow_online_admission: formData.allow_online_admission,
          allow_result_viewing: formData.allow_result_viewing,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all rows (should be only one)

      if (academicError) throw new Error('Failed to update academic settings: ' + academicError.message)

      // 1.5 Sync system_settings (current_term ID)
      // Find the term ID for the selected name and year
      const { data: existingTerm } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('name', formData.current_term)
        .eq('academic_year', formData.current_academic_year)
        .maybeSingle()

      let termId = existingTerm?.id

      // If term doesn't exist, create it
      if (!termId && formData.current_term && formData.current_academic_year) {
        const { data: newTerm, error: createTermError } = await supabase
          .from('academic_terms')
          .insert({
            name: formData.current_term,
            academic_year: formData.current_academic_year,
            start_date: formData.term_start_date || new Date().toISOString().split('T')[0],
            end_date: formData.term_end_date || new Date().toISOString().split('T')[0],
            is_current: true
          })
          .select('id')
          .single()
        
        if (createTermError) {
          console.error('Error creating term:', createTermError)
        } else {
          termId = newTerm.id
        }
      }

      // Update system_settings with the term ID
      if (termId) {
        await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'current_term',
            setting_value: termId,
            description: 'Current Academic Term ID',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'setting_key' })
          
        // Also ensure is_current flag is set correctly in academic_terms
        await supabase
          .from('academic_terms')
          .update({ is_current: false })
          .neq('id', termId)
          
        await supabase
          .from('academic_terms')
          .update({ is_current: true })
          .eq('id', termId)
      }

      // 2. Update system_settings for teaching model
      const { error: modelError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'upper_primary_teaching_model',
          setting_value: upperPrimaryModel,
          description: 'Teaching model for Upper Primary',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (modelError) throw new Error('Failed to update teaching model: ' + modelError.message)

      // 3. Update system_settings for allow_cumulative_download
      const { error: cumulativeError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'allow_cumulative_download',
          setting_value: String(formData.allow_cumulative_download),
          description: 'Allow students to download cumulative records',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (cumulativeError) throw new Error('Failed to update cumulative download setting: ' + cumulativeError.message)

      // 4. Sync academic year in terms (optional but good for consistency)
      if (formData.current_academic_year) {
        await supabase
          .from('academic_terms')
          .update({ academic_year: formData.current_academic_year })
          .neq('academic_year', formData.current_academic_year)
      }

      alert('General settings updated successfully!')
      router.push('/admin/settings')
    } catch (error: any) {
      console.error('Error updating settings:', error)
      alert(error.message || 'Failed to update settings. Please try again.')
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
              <Globe className="w-8 h-8 text-ghana-green" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">General Settings</h1>
                <p className="text-xs md:text-sm text-gray-600">Configure academic year and system preferences</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-6">
          {/* Academic Year Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-base md:text-lg font-bold text-gray-800 mb-4">Academic Year & Term</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Current Academic Year *</label>
                <input
                  type="text"
                  required
                  value={formData.current_academic_year}
                  onChange={(e) => setFormData({...formData, current_academic_year: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  placeholder="2024/2025"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 mb-2">Current Term *</label>
                <select
                  required
                  value={formData.current_term}
                  onChange={(e) => setFormData({...formData, current_term: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                >
                  <option value="">Select Term</option>
                  <option value="Term 1">Term 1</option>
                  <option value="Term 2">Term 2</option>
                  <option value="Term 3">Term 3</option>
                </select>
                <p className="mt-1 text-[10px] md:text-xs text-gray-500">
                  Current active term for the school year
                </p>
              </div>
            </div>
          </div>

          {/* Term Dates */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Term Dates</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term Start Date (Reopening)</label>
                <input
                  type="date"
                  value={formData.term_start_date}
                  onChange={(e) => setFormData({...formData, term_start_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
                <p className="mt-1 text-[10px] md:text-xs text-gray-500">
                  Also sets the School Reopening Date
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Term End Date (Vacation)</label>
                <input
                  type="date"
                  value={formData.term_end_date}
                  onChange={(e) => setFormData({...formData, term_end_date: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
                <p className="mt-1 text-[10px] md:text-xs text-gray-500">
                  Also sets the Vacation Start Date
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Term Starts</label>
                <input
                  type="date"
                  value={formData.next_term_starts}
                  onChange={(e) => setFormData({...formData, next_term_starts: e.target.value})}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                />
              </div>
            </div>
          </div>

          {/* Teaching Model Configuration */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Teaching Model Configuration</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This setting determines how Upper Primary (P4-P6) classes are organized.
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upper Primary (P4-P6) Teaching Model
              </label>

              {/* Class Teacher Model */}
              <div className={`border rounded-lg p-4 transition-all cursor-pointer ${
                upperPrimaryModel === 'class_teacher' 
                  ? 'border-ghana-green bg-green-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setUpperPrimaryModel('class_teacher')}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="teaching_model"
                    value="class_teacher"
                    checked={upperPrimaryModel === 'class_teacher'}
                    onChange={(e) => setUpperPrimaryModel(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Class Teacher Model</div>
                    <div className="text-sm text-gray-600 mt-1">
                      One teacher assigned to teach <strong>all subjects</strong> in the class. Similar to Lower Primary model.
                    </div>
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      <div>✅ Teacher has full access to all subjects</div>
                      <div>✅ Teacher marks attendance</div>
                      <div>✅ Ideal when teacher availability is limited</div>
                    </div>
                  </div>
                </label>
              </div>

              {/* Subject Teacher Model */}
              <div className={`border rounded-lg p-4 transition-all cursor-pointer ${
                upperPrimaryModel === 'subject_teacher' 
                  ? 'border-ghana-green bg-green-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
              onClick={() => setUpperPrimaryModel('subject_teacher')}>
                <label className="flex items-start space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="teaching_model"
                    value="subject_teacher"
                    checked={upperPrimaryModel === 'subject_teacher'}
                    onChange={(e) => setUpperPrimaryModel(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900">Subject Teacher Model</div>
                    <div className="text-sm text-gray-600 mt-1">
                      Multiple teachers assigned to teach <strong>specific subjects</strong> in the class. Similar to JHS model.
                    </div>
                    <div className="text-xs text-gray-500 mt-2 space-y-1">
                      <div>✅ Class teacher views all subjects, edits only assigned</div>
                      <div>✅ Subject teachers only see their subjects</div>
                      <div>✅ Class teacher marks attendance</div>
                      <div>✅ Ideal for subject specialization</div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Reference Info */}
            <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Teaching Models by Level:</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <div>• <strong>Lower Primary (P1-P3):</strong> Always Class Teacher Model</div>
                <div>• <strong>Upper Primary (P4-P6):</strong> <span className="font-semibold text-ghana-green">Configurable (setting above)</span></div>
                <div>• <strong>JHS (JHS 1-3):</strong> Always Subject Teacher Model</div>
              </div>
            </div>
          </div>

          {/* System Preferences */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">System Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Allow Online Admission</p>
                  <p className="text-sm text-gray-600">Enable online admission form on website</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_online_admission}
                  onChange={(e) => setFormData({...formData, allow_online_admission: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
              
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Allow Result Viewing</p>
                  <p className="text-sm text-gray-600">Students can view their results online</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_result_viewing}
                  onChange={(e) => setFormData({...formData, allow_result_viewing: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <div>
                  <p className="font-medium text-gray-800">Allow Cumulative Record Download</p>
                  <p className="text-sm text-gray-600">Students can download their full academic history</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_cumulative_download}
                  onChange={(e) => setFormData({...formData, allow_cumulative_download: e.target.checked})}
                  className="w-5 h-5 text-methodist-blue rounded focus:ring-2 focus:ring-methodist-blue"
                />
              </label>
            </div>
          </div>

          {/* Academic Year Transition */}
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>Academic Year Transition</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Promote students to new academic year (30+ average auto-promoted)
                </p>
              </div>
              <Link 
                href="/admin/settings/year-transition"
                className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 flex items-center space-x-2 text-sm font-medium"
              >
                <span>Configure</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
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
