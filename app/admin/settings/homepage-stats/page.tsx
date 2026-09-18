'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  TrendingUp, 
  Save, 
  RefreshCw, 
  Calendar, 
  GraduationCap, 
  Award, 
  Users, 
  BookOpen, 
  CheckCircle2, 
  ShieldCheck, 
  Loader2, 
  Sparkles, 
  Eye,
  Sliders,
  Building2,
  Percent
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

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
    const { data } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'stats_title', 
        'stats_subtitle', 
        'founding_year', 
        'teacher_student_ratio', 
        'bece_participation', 
        'bece_pass_rate', 
        'grade_levels'
      ]) as { data: any[] | null; error: any }

    if (data) {
      const settingsObj: any = {}
      data.forEach((s: any) => {
        settingsObj[s.setting_key] = s.setting_value
      })
      setSettings({
        stats_title: settingsObj.stats_title || 'Our Impact in Numbers',
        stats_subtitle: settingsObj.stats_subtitle || 'Building academic excellence and moral leadership for over six decades',
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
      toast.success('Homepage metrics saved successfully! Public site updated.')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error('Error saving settings: ' + (error.message || 'Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  const computedYearsOfExcellence = useMemo(() => {
    const parsed = parseInt(settings.founding_year, 10)
    const currentYear = new Date().getFullYear()
    if (isNaN(parsed) || parsed > currentYear) return 60
    return Math.max(1, currentYear - parsed)
  }, [settings.founding_year])

  if (loading) {
    return <HomepageStatsSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/settings" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Homepage Showcase Statistics
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Configure public impact highlights, BECE performance rates, and heritage metrics
                </p>
              </div>
            </div>

            {/* Desktop / Tablet Header Controls */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={loadSettings}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{saving ? 'Updating...' : 'Save Changes'}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-28 sm:pb-12">
        
        {/* Informational Guidance Callout */}
        <section className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Institutional Public Marketing Metrics
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              These figures appear directly on the public school landing page to prospective parents, alumni, and educational inspectors. Years of service automatically increment every academic year based on your recorded founding date.
            </p>
          </div>
        </section>

        {/* Content Configuration Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5">
          
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Content &amp; Milestone Data
                </h3>
                <p className="text-[11px] text-slate-400">Headings, institutional milestones, and academic statistics</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            
            {/* Title & Subtitle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4.5">
              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Showcase Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={settings.stats_title}
                  onChange={(e) => setSettings({ ...settings, stats_title: e.target.value })}
                  placeholder="e.g. Our Impact in Numbers"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                  Founding Year <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    required
                    value={settings.founding_year}
                    onChange={(e) => setSettings({ ...settings, founding_year: e.target.value })}
                    placeholder="1960"
                    className="w-full pl-10 pr-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Showcase Tagline / Subtitle <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={settings.stats_subtitle}
                onChange={(e) => setSettings({ ...settings, stats_subtitle: e.target.value })}
                placeholder="e.g. Building excellence in education for over six decades"
                className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:text-slate-400"
              />
            </div>

            {/* Academic KPIs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
              
              {/* BECE Pass Rate */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    BECE Pass Rate (%)
                  </label>
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={settings.bece_pass_rate}
                    onChange={(e) => setSettings({ ...settings, bece_pass_rate: e.target.value })}
                    placeholder="85"
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">%</span>
                </div>
              </div>

              {/* BECE Participation */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Participation
                  </label>
                  <Percent className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <input
                  type="text"
                  required
                  value={settings.bece_participation}
                  onChange={(e) => setSettings({ ...settings, bece_participation: e.target.value })}
                  placeholder="100%"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                />
              </div>

              {/* Teacher-Student Ratio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Staff/Pupil Ratio
                  </label>
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <input
                  type="text"
                  required
                  value={settings.teacher_student_ratio}
                  onChange={(e) => setSettings({ ...settings, teacher_student_ratio: e.target.value })}
                  placeholder="1:15"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                />
              </div>

              {/* Grade Levels */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block truncate">
                    Grade Levels
                  </label>
                  <Building2 className="w-3.5 h-3.5 text-purple-500" />
                </div>
                <input
                  type="text"
                  required
                  value={settings.grade_levels}
                  onChange={(e) => setSettings({ ...settings, grade_levels: e.target.value })}
                  placeholder="9"
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans placeholder:text-slate-400"
                />
              </div>

            </div>

          </div>
        </section>

        {/* Live Public Website Showcase Preview */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 md:p-8 shadow-xs space-y-5 overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Live Public Website Preview
              </h3>
            </div>
            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
              Interactive Mockup
            </span>
          </div>

          <div className="rounded-2xl sm:rounded-3xl p-5 sm:p-8 md:p-10 border border-slate-200/80 dark:border-slate-700/70 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/70 dark:from-slate-900 dark:via-slate-850 dark:to-slate-900 space-y-6 sm:space-y-8">
            
            {/* Header Titles */}
            <div className="text-center space-y-2 max-w-2xl mx-auto">
              <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/10 dark:bg-blue-500/20 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Our Track Record</span>
              </span>

              <h4 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                {settings.stats_title || 'Our Impact in Numbers'}
              </h4>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {settings.stats_subtitle || 'Building excellence in education for over six decades'}
              </p>
            </div>

            {/* Primary Numbers Grid: 2 cols on mobile, 4 cols on desktop */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              
              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs text-center space-y-1">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                  {computedYearsOfExcellence}+
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                  Years of Excellence
                </div>
                <p className="text-[10px] text-slate-400">Founded {settings.founding_year || 1960}</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs text-center space-y-1">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                  500+
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                  Active Learners
                </div>
                <p className="text-[10px] text-slate-400">Enrolled pupils</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs text-center space-y-1">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-amber-500 dark:text-amber-400">
                  25+
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                  Certified Faculty
                </div>
                <p className="text-[10px] text-slate-400">Dedicated teachers</p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-xs text-center space-y-1">
                <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {settings.bece_pass_rate || 85}%
                </div>
                <div className="text-[11px] sm:text-xs font-bold text-slate-600 dark:text-slate-300">
                  BECE Pass Rate
                </div>
                <p className="text-[10px] text-slate-400">National standards</p>
              </div>

            </div>

            {/* Secondary KPIs: 1 col on mobile, 3 cols on tablet/desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
              
              <div className="bg-white/90 dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700 text-center">
                <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                  {settings.teacher_student_ratio || '1:15'}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Teacher-Student Ratio
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700 text-center">
                <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                  {settings.bece_participation || '100%'}
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  BECE Candidacy Rate
                </div>
              </div>

              <div className="bg-white/90 dark:bg-slate-800/80 p-3 sm:p-4 rounded-xl border border-slate-200/70 dark:border-slate-700 text-center">
                <div className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                  {settings.grade_levels || '9'} Grades
                </div>
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
                  Span (KG1 – JHS3)
                </div>
              </div>

            </div>

          </div>

        </section>

      </main>

      {/* Floating Sticky Mobile Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={loadSettings}
            disabled={saving}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{saving ? 'Updating...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      <PortalFooter />
    </div>
  )
}

function HomepageStatsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <Skeleton className="h-9 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-72 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}