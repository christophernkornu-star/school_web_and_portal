'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Save, Globe, BookOpen, TrendingUp, ArrowRight, 
  Edit2, X, ChevronDown, Calendar, Clock, AlertCircle, 
  CheckCircle2, ShieldCheck, Sliders, Bell, Sparkles, Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { formatDateDDMMYYYY, formatDateDDMMMYYYY } from '@/lib/date-utils'
import { isValidAcademicYear } from '@/lib/academic-utils'

export default function GeneralSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [upperPrimaryModel, setUpperPrimaryModel] = useState('class_teacher')
  const [currentTermId, setCurrentTermId] = useState<string>('')
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameData, setRenameData] = useState({ name: '', academic_year: '' })
  const [yearError, setYearError] = useState('')
  const [renameYearError, setRenameYearError] = useState('')
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
    allow_teacher_class_score_entry: true,
    class_score_percentage: 40,
    exam_score_percentage: 60,
    progress_alert_threshold: 90,
  })

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load settings from academic_settings table
      const { data: academicSettings } = await supabase
        .from('academic_settings')
        .select('*')
        .single()

      if (academicSettings?.id) {
        setSettingsId(academicSettings.id)
      }

      // Load system_settings
      const { data: systemSettingsData } = await supabase
        .from('system_settings')
        .select('*') as { data: any[] | null }

      const systemSettingsMap = new Map(systemSettingsData?.map((s: any) => [s.setting_key, s.setting_value]) || [])

      const activeTermId = systemSettingsMap.get('current_term')
      if (activeTermId) setCurrentTermId(activeTermId)
      let currentTermName = academicSettings?.current_term || ''
      let currentAcademicYear = academicSettings?.current_academic_year || ''

      if (activeTermId) {
        const { data: termData } = await supabase
          .from('academic_terms')
          .select('name, academic_year')
          .eq('id', activeTermId)
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
          allow_teacher_class_score_entry: systemSettingsMap.get('allow_teacher_class_score_entry') !== 'false',
          class_score_percentage: Number(systemSettingsMap.get('class_score_percentage')) || 40,
          exam_score_percentage: Number(systemSettingsMap.get('exam_score_percentage')) || 60,
          progress_alert_threshold: Number(systemSettingsMap.get('progress_alert_threshold')) || 90,
        })
      }
      
      setUpperPrimaryModel(systemSettingsMap.get('upper_primary_teaching_model') || 'class_teacher')
      setLoading(false)
    }
    loadSettings()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValidAcademicYear(formData.current_academic_year)) {
      setYearError('Academic year must be in YYYY/YY format (e.g. 2026/27).')
      toast.error('Academic year must be in YYYY/YY format (e.g. 2026/27).')
      return
    }
    setYearError('')
    setSaving(true)

    try {
      // 1. Update academic_settings table
      const { error: academicError } = await supabase
        .from('academic_settings')
        .update({
          current_academic_year: formData.current_academic_year,
          current_term: formData.current_term,
          term_start_date: formData.term_start_date || null,
          term_end_date: formData.term_end_date || null,
          next_term_starts: formData.next_term_starts || null,
          school_reopening_date: formData.term_start_date || null,
          vacation_start_date: formData.term_end_date || null,
          allow_online_admission: formData.allow_online_admission,
          allow_result_viewing: formData.allow_result_viewing,
          updated_at: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (academicError) throw new Error('Failed to update academic settings: ' + academicError.message)

      // 1.5 Sync system_settings (current_term ID)
      const { data: existingTerm } = await supabase
        .from('academic_terms')
        .select('id')
        .eq('name', formData.current_term)
        .eq('academic_year', formData.current_academic_year)
        .maybeSingle()

      let termId = existingTerm?.id

      if (!termId && formData.current_term && formData.current_academic_year) {
        const { data: newTerm, error: createTermError } = await supabase
          .from('academic_terms')
          .insert({
            name: formData.current_term,
            academic_year: formData.current_academic_year,
            start_date: formData.term_start_date || new Date().toISOString().split('T')[0],
            end_date: formData.term_end_date || new Date().toISOString().split('T')[0],
            vacation_date: formData.term_end_date || null,
            reopening_date: formData.term_start_date || null,
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

      if (termId) {
        const { error: sysError } = await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'current_term',
            setting_value: termId,
            description: 'Current Academic Term ID',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'setting_key' })

        if (sysError) {
          throw new Error('Failed to sync current term to system settings.')
        }

        await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'current_academic_year',
            setting_value: formData.current_academic_year,
            description: 'Current academic year',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'setting_key' })

        await supabase
          .from('academic_terms')
          .update({ is_current: false })
          .neq('id', termId)
          
        await supabase
          .from('academic_terms')
          .update({ 
            is_current: true,
            start_date: formData.term_start_date || null,
            end_date: formData.term_end_date || null,
            vacation_date: formData.term_end_date || null,
            reopening_date: formData.term_start_date || null
          })
          .eq('id', termId)
      } else {
        throw new Error('Could not find or create the specified academic term.')
      }

      // 2. Teaching model
      const { error: modelError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'upper_primary_teaching_model',
          setting_value: upperPrimaryModel,
          description: 'Teaching model for Upper Primary',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (modelError) throw new Error('Failed to update teaching model: ' + modelError.message)

      // 3. Cumulative download
      const { error: cumulativeError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'allow_cumulative_download',
          setting_value: String(formData.allow_cumulative_download),
          description: 'Allow students to download cumulative records',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (cumulativeError) throw new Error('Failed to update cumulative download setting: ' + cumulativeError.message)

      // 4. Class score entry
      const { error: classScoreEntryError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'allow_teacher_class_score_entry',
          setting_value: String(formData.allow_teacher_class_score_entry),
          setting_type: 'boolean',
          description: 'Allow teachers to manually enter class scores on the Exam Scores page',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (classScoreEntryError) throw new Error('Failed to update class score entry setting: ' + classScoreEntryError.message)

      // 5. Class score percentage
      const { error: classScoreError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'class_score_percentage',
          setting_value: String(formData.class_score_percentage),
          setting_type: 'number',
          description: 'Percentage weight for class score',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (classScoreError) throw new Error('Failed to update class score percentage: ' + classScoreError.message)

      // 6. Exam score percentage
      const { error: examScoreError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'exam_score_percentage',
          setting_value: String(formData.exam_score_percentage),
          setting_type: 'number',
          description: 'Percentage weight for exam score',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (examScoreError) throw new Error('Failed to update exam score percentage: ' + examScoreError.message)

      // 7. Progress alert threshold
      const { error: thresholdError } = await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'progress_alert_threshold',
          setting_value: String(formData.progress_alert_threshold),
          setting_type: 'number',
          description: 'Term progress percentage to trigger alerts',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' })

      if (thresholdError) throw new Error('Failed to update progress alert threshold: ' + thresholdError.message)

      toast.success('General settings updated successfully!')
    } catch (error: any) {
      console.error('Error updating settings:', error)
      toast.error(error.message || 'Failed to update settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentTermId) return

    if (!isValidAcademicYear(renameData.academic_year)) {
      setRenameYearError('Academic year must be in YYYY/YY format (e.g. 2026/27).')
      toast.error('Academic year must be in YYYY/YY format (e.g. 2026/27).')
      return
    }
    setRenameYearError('')

    setSaving(true)
    try {
      const { error: termError } = await supabase
        .from('academic_terms')
        .update({
          name: renameData.name,
          academic_year: renameData.academic_year
        })
        .eq('id', currentTermId)

      if (termError) throw new Error('Failed to update term: ' + termError.message)

      if (settingsId) {
        await supabase
          .from('academic_settings')
          .update({
            current_academic_year: renameData.academic_year,
            current_term: renameData.name
          })
          .eq('id', settingsId)
      }

      await supabase
        .from('system_settings')
        .update({ setting_value: renameData.academic_year })
        .eq('setting_key', 'current_academic_year')

      setFormData(prev => ({
        ...prev,
        current_academic_year: renameData.academic_year,
        current_term: renameData.name
      }))

      toast.success('Active term renamed successfully!')
      setShowRenameModal(false)
    } catch (error: any) {
      console.error('Error renaming term:', error)
      toast.error(error.message || 'Failed to rename term.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-28 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Top Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
              <BackButton href="/admin/settings" className="shrink-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>General System Settings</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Configure session calendars, teaching structures, and system policies
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="hidden sm:inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-7">
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-7">

          {/* Section 1: Academic Year & Term Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                    Active Academic Year & Session
                  </h2>
                  <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                    Controls global session context for grade recording and reports
                  </p>
                </div>
              </div>

              {currentTermId && (
                <button
                  type="button"
                  onClick={() => {
                    setRenameData({
                      name: formData.current_term,
                      academic_year: formData.current_academic_year
                    })
                    setRenameYearError('')
                    setShowRenameModal(true)
                  }}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/10 hover:bg-[#003B5C]/20 border border-[#003B5C]/20 transition active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Rename Active Term</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Current Academic Year <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.current_academic_year}
                  onChange={(e) => {
                    setFormData({...formData, current_academic_year: e.target.value})
                    if (isValidAcademicYear(e.target.value)) setYearError('')
                  }}
                  className={`w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition ${
                    yearError ? 'border-rose-500 dark:border-rose-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="2026/27"
                />
                {yearError ? (
                  <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">{yearError}</p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-gray-400 font-medium">Standard GES Format: YYYY/YY (e.g. 2026/27)</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Current Term <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={formData.current_term}
                    onChange={(e) => setFormData({...formData, current_term: e.target.value})}
                    className="w-full pl-3.5 sm:pl-4 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Select active term</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="mt-1.5 text-[11px] text-gray-400 font-medium">Select active term session</p>
              </div>
            </div>
          </div>

          {/* Section 2: Term Dates */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  Term Milestones & Vacation Calendar
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                  Populates report cards, student portal dashboards, and SMS alerts
                </p>
              </div>
            </div>

            <div className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-xl p-3 sm:p-4 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
              <span>
                Dates convert automatically on student report cards (e.g. <strong className="font-bold">08/Nov/2026</strong>).
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {/* Term Start Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Term Start / Reopening Date
                </label>
                <input
                  type="date"
                  value={formData.term_start_date}
                  onChange={(e) => setFormData({...formData, term_start_date: e.target.value})}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Formatted: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{formatDateDDMMYYYY(formData.term_start_date)}</span>
                </p>
              </div>

              {/* Term End Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Term End / Vacation Date
                </label>
                <input
                  type="date"
                  value={formData.term_end_date}
                  onChange={(e) => setFormData({...formData, term_end_date: e.target.value})}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Formatted: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{formatDateDDMMYYYY(formData.term_end_date)}</span>
                </p>
              </div>

              {/* Next Term Starts */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Next Term Reopening Date
                </label>
                <input
                  type="date"
                  value={formData.next_term_starts}
                  onChange={(e) => setFormData({...formData, next_term_starts: e.target.value})}
                  className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                />
                <p className="mt-1.5 text-[11px] text-gray-400">
                  Formatted: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{formatDateDDMMYYYY(formData.next_term_starts)}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Teaching Model Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  Upper Primary (P4-P6) Teaching Model
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                  Configures subject assignment and score entry boundaries for Basic 4 through 6
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
              {/* Option A: Class Teacher */}
              <div 
                onClick={() => setUpperPrimaryModel('class_teacher')}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  upperPrimaryModel === 'class_teacher'
                    ? 'border-[#003B5C] bg-[#003B5C]/5 dark:bg-[#003B5C]/15 shadow-sm'
                    : 'border-gray-200/80 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    upperPrimaryModel === 'class_teacher' ? 'border-[#003B5C] bg-[#003B5C]' : 'border-gray-300'
                  }`}>
                    {upperPrimaryModel === 'class_teacher' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      Class Teacher Model
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      One main teacher manages and scores <strong>all subjects</strong> in the assigned classroom.
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-750 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Full grade entry across all class subjects</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Single point of attendance and broadsheet tracking</span>
                  </p>
                </div>
              </div>

              {/* Option B: Subject Teacher */}
              <div 
                onClick={() => setUpperPrimaryModel('subject_teacher')}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  upperPrimaryModel === 'subject_teacher'
                    ? 'border-[#003B5C] bg-[#003B5C]/5 dark:bg-[#003B5C]/15 shadow-sm'
                    : 'border-gray-200/80 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition ${
                    upperPrimaryModel === 'subject_teacher' ? 'border-[#003B5C] bg-[#003B5C]' : 'border-gray-300'
                  }`}>
                    {upperPrimaryModel === 'subject_teacher' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">
                      Subject Teacher Model
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                      Teachers are assigned to specific subjects (similar to JHS model).
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-gray-100 dark:border-gray-750 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Subject teachers only access assigned subjects</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Class teachers retain overview & attendance authority</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Grading Weightage Configuration */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                4
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  Assessment Weightage Ratio
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                  Combined score must equal 100% (Standard GES: 40% Continuous Assessment / 60% Exam)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Class Assessment Ratio (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.class_score_percentage}
                    onChange={(e) => setFormData({...formData, class_score_percentage: Number(e.target.value)})}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">%</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Terminal Exam Ratio (%) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formData.exam_score_percentage}
                    onChange={(e) => setFormData({...formData, exam_score_percentage: Number(e.target.value)})}
                    className="w-full px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold font-mono border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">%</span>
                </div>
              </div>
            </div>

            {formData.class_score_percentage + formData.exam_score_percentage !== 100 ? (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Total percentage must equal 100%. (Currently: {formData.class_score_percentage + formData.exam_score_percentage}%)
                </span>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Ratios balanced correctly: {formData.class_score_percentage}% Class Score + {formData.exam_score_percentage}% Exam Score = 100%</span>
              </div>
            )}
          </div>

          {/* Section 5: System Policies & Student Preferences */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
            <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                5
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  System Policies & Security Controls
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                  Portal visibility toggles and threshold alert settings
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Online Admission */}
              <label className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition cursor-pointer gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Allow Online Admission</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enable applicant registration on public portal</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_online_admission}
                  onChange={(e) => setFormData({...formData, allow_online_admission: e.target.checked})}
                  className="w-5 h-5 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300 dark:border-gray-600 shrink-0 cursor-pointer"
                />
              </label>

              {/* Result Viewing */}
              <label className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition cursor-pointer gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Allow Student Result Viewing</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Enables parent/student terminal report checks</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_result_viewing}
                  onChange={(e) => setFormData({...formData, allow_result_viewing: e.target.checked})}
                  className="w-5 h-5 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300 dark:border-gray-600 shrink-0 cursor-pointer"
                />
              </label>

              {/* Cumulative Download */}
              <label className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition cursor-pointer gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Cumulative Transcript Downloads</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">Permits learners to download cumulative multi-term academic history</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_cumulative_download}
                  onChange={(e) => setFormData({...formData, allow_cumulative_download: e.target.checked})}
                  className="w-5 h-5 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300 dark:border-gray-600 shrink-0 cursor-pointer"
                />
              </label>

              {/* Teacher Class Score Entry */}
              <label className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 hover:bg-gray-50/60 dark:hover:bg-gray-750/50 transition cursor-pointer gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Manual Class Score Entry for Teachers</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    When disabled, teachers can only input exams; class score scales automatically from recorded tasks.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.allow_teacher_class_score_entry}
                  onChange={(e) => setFormData({...formData, allow_teacher_class_score_entry: e.target.checked})}
                  className="w-5 h-5 rounded text-[#003B5C] focus:ring-[#003B5C] border-gray-300 dark:border-gray-600 shrink-0 cursor-pointer"
                />
              </label>

              {/* Progress Alert Threshold */}
              <div className="p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850">
                <div className="min-w-0">
                  <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Term Progress Alert Threshold</p>
                  <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Notifies portal admins when term elapsed calendar days hit this percentage
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formData.progress_alert_threshold}
                    onChange={(e) => setFormData({...formData, progress_alert_threshold: parseInt(e.target.value) || 90})}
                    className="w-20 px-3 py-1.5 text-center font-bold font-mono text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                  <span className="text-xs font-bold text-gray-400">%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 6: Academic Year Transition Banner */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-indigo-100 dark:border-indigo-900/40 p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500" />
            <div className="space-y-1 min-w-0">
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>End-of-Year Class Promotion & Transition</span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Promote students to new cohorts, archive previous session records, and graduate JHS 3 cohorts.
              </p>
            </div>

            <Link
              href="/admin/settings/year-transition"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold transition shadow-sm shrink-0"
            >
              <span>Transition Wizard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Desktop Form Save Action */}
          <div className="hidden sm:flex items-center justify-end gap-3 pt-2">
            <Link
              href="/admin/settings"
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving Changes...' : 'Save All Settings'}</span>
            </button>
          </div>
        </form>
      </main>

      {/* Floating Bottom Bar on Mobile */}
      <div className="fixed bottom-4 left-4 right-4 z-40 sm:hidden animate-in slide-in-from-bottom-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3.5 px-6 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-2xl font-black text-sm shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Configurations...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Rename Term Modal (Responsive Bottom-Sheet on Mobile, Centered on Tablet/Desktop) */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl p-5 sm:p-6 space-y-4 border-t sm:border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-3">
              <h3 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                Rename Active Term Record
              </h3>
              <button
                type="button"
                onClick={() => setShowRenameModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <span>
                Use this strictly to correct typos in the current session without creating duplicated term rows.
              </span>
            </div>

            <form onSubmit={handleRenameSubmit} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Academic Year
                </label>
                <input
                  type="text"
                  required
                  value={renameData.academic_year}
                  onChange={(e) => {
                    setRenameData({ ...renameData, academic_year: e.target.value })
                    if (isValidAcademicYear(e.target.value)) setRenameYearError('')
                  }}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] ${
                    renameYearError ? 'border-rose-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                  placeholder="2026/27"
                />
                {renameYearError && (
                  <p className="mt-1 text-xs text-rose-600 font-medium">{renameYearError}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Term Designation
                </label>
                <input
                  type="text"
                  required
                  value={renameData.name}
                  onChange={(e) => setRenameData({ ...renameData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  placeholder="Term 1"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-750">
                <button
                  type="button"
                  onClick={() => setShowRenameModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Update Term Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}