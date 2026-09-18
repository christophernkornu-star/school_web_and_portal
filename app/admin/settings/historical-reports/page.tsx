'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Archive, 
  Save, 
  Trash2, 
  Users, 
  GraduationCap, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Loader2, 
  Sliders,
  Calendar,
  Eye,
  Info,
  ArrowRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

export default function HistoricalReportsSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [purging, setPurging] = useState(false)
  const [settingsId, setSettingsId] = useState<string>('')
  const [retentionYears, setRetentionYears] = useState('5')
  const [enabled, setEnabled] = useState(true)
  const [studentPortalShowHistory, setStudentPortalShowHistory] = useState(false)
  const [activeCount, setActiveCount] = useState(0)
  const [graduatedCount, setGraduatedCount] = useState(0)

  useEffect(() => {
    async function load() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      const { data } = await supabase
        .from('historical_reports_settings')
        .select('*')
        .maybeSingle() as { data: any }

      if (data) {
        setSettingsId(data.id)
        setRetentionYears(String(data.retention_years ?? 5))
        setEnabled(data.enabled ?? true)
        setStudentPortalShowHistory(data.student_portal_show_history === true)
      }

      // Count graduated students
      const { count: grad } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'graduated')
      setGraduatedCount(grad || 0)

      // Count active enrolled students
      const { count: act } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active')
      setActiveCount(act || 0)

      setLoading(false)
    }
    load()
  }, [router, supabase])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setSaving(true)
    try {
      const user = await getCurrentUser()
      const retention = Math.max(1, Math.min(50, parseInt(retentionYears, 10) || 5))

      const payload = {
        retention_years: retention,
        enabled,
        student_portal_show_history: studentPortalShowHistory,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }

      if (settingsId) {
        const { error } = await supabase
          .from('historical_reports_settings')
          .update(payload)
          .eq('id', settingsId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('historical_reports_settings')
          .insert(payload)
        if (error) throw error
      }

      toast.success('Historical reports & retention policy saved!')
      router.push('/admin/settings')
    } catch (error: any) {
      console.error(error)
      toast.error('Failed to save settings: ' + (error?.message || 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handlePurge = async () => {
    if (!confirm(`This will PERMANENTLY purge historical records for alumni whose graduation date exceeds the retention threshold (${retentionYears} years). This action cannot be undone. Continue?`)) {
      return
    }

    setPurging(true)
    try {
      const { data, error } = await supabase.rpc('purge_graduated_history')
      if (error) throw error
      toast.success(`Purge completed: ${data?.students_purged ?? 0} students (${data?.scores_purged ?? 0} scores, ${data?.remarks_purged ?? 0} remarks purged)`)
      
      // Refresh count state
      const { count: grad } = await supabase
        .from('students')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'graduated')
      setGraduatedCount(grad || 0)
    } catch (error: any) {
      console.error(error)
      toast.error('Purge execution failed: ' + (error?.message || 'Unknown error'))
    } finally {
      setPurging(false)
    }
  }

  if (loading) {
    return <HistoricalSettingsSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/settings" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Historical Reports &amp; Retention
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Manage alumni archive windows, report access controls, and automated record purging
                </p>
              </div>
            </div>

            {/* Desktop / Tablet Save Action */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <Link
                href="/admin/settings"
                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{saving ? 'Updating...' : 'Save Settings'}</span>
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
              Institutional Archive &amp; Retention Safeguards
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              Retention limits strictly protect database storage by cleaning expired records for <strong>graduated alumni</strong> only. Enrolled, active student history is immutable and retained indefinitely throughout their enrollment lifecycle.
            </p>
          </div>
        </section>

        {/* Current Enrollment Status Overview */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Active Enrolled Learners
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-[#003B5C] dark:text-blue-400">
                {activeCount}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>History preserved indefinitely</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 border border-[#003B5C]/15 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Graduated Alumni Records
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-800 dark:text-white">
                {graduatedCount}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Retained up to {retentionYears} years</span>
              </p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

        </section>

        {/* Configuration Form Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-5">
          
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Archive Retention Policies
                </h3>
                <p className="text-[11px] text-slate-400">Specify data lifespan and student portal visibility rules</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Retention Period in Years */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                    Alumni Retention Span <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">1 – 50 Years</span>
                </div>

                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={50}
                    required
                    value={retentionYears}
                    onChange={(e) => setRetentionYears(e.target.value)}
                    placeholder="5"
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm font-semibold font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition placeholder:font-sans"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Years</span>
                </div>
                <p className="text-[10px] text-slate-400">GES default recommendation is 5 years post-graduation.</p>
              </div>

              {/* Master Archive Access Toggle */}
              <div className="flex flex-col justify-end">
                <label className="flex items-start justify-between p-3 sm:p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none gap-3">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Enable Historical Reports Access
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      Allow staff to view archived broadsheets within the retained years
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 mt-0.5"
                  />
                </label>
              </div>

            </div>

            {/* Student Portal Historical Reports Option */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-start justify-between p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer select-none gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0 mt-0.5">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      Student Portal: Allow Access to Past Academic Years
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      By default, learners only inspect their <strong>current academic session</strong> terminal report. Enabling this lets enrolled students browse reports from their previous grades.
                    </p>
                  </div>
                </div>

                <input
                  type="checkbox"
                  checked={studentPortalShowHistory}
                  onChange={(e) => setStudentPortalShowHistory(e.target.checked)}
                  className="w-4 h-4 rounded text-[#003B5C] focus:ring-[#003B5C] border-slate-300 dark:border-slate-700 cursor-pointer shrink-0 mt-1"
                />
              </label>
            </div>

            {/* Desktop Form Save Trigger */}
            <div className="hidden sm:flex items-center justify-end gap-2.5 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-6 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-4 h-4 text-amber-400" />
                )}
                <span>Save Retention Policy</span>
              </button>
            </div>

          </form>
        </section>

        {/* Destructive Maintenance Purge Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-rose-200/80 dark:border-rose-900/50 p-4 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex items-center gap-2.5 border-b border-rose-100 dark:border-rose-950 pb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">
                Purge Expired Alumni Archive
              </h3>
              <p className="text-[11px] text-slate-400">Permanently delete historical database records exceeding the window</p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            <p>
              Executes a database cleanup job to permanently erase terminal marks, remarks, and audit trails for graduated students whose departure is older than <strong>{retentionYears} years</strong>.
            </p>

            <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>This operation is irreversible. Active student records are completely shielded and will never be purged.</span>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={handlePurge}
                disabled={purging}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {purging ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Executing Database Purge...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Run Alumni Purge Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Sticky Mobile Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/admin/settings"
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold text-center"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Save className="w-4 h-4 text-amber-400" />
            )}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <PortalFooter />
    </div>
  )
}

function HistoricalSettingsSkeleton() {
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}