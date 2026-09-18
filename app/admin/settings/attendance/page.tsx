'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Calendar, 
  Save, 
  Clock, 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Info,
  CalendarDays,
  Plus,
  Minus
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

interface Term {
  id: string
  name: string
  academic_year: string
  start_date: string
  end_date: string
  total_days: number
  is_current: boolean
}

export default function AttendanceSettings() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [terms, setTerms] = useState<Term[]>([])
  const [editingTerms, setEditingTerms] = useState<{ [key: string]: number }>({})

  useEffect(() => {
    async function loadSettings() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      await loadTerms()
      setLoading(false)
    }
    loadSettings()
  }, [router])

  async function loadTerms() {
    const { data, error } = await supabase
      .from('academic_terms')
      .select('*')
      .order('academic_year', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading terms:', error)
      toast.error('Failed to load academic terms')
      return
    }

    if (data) {
      setTerms(data as Term[])
      const initial: { [key: string]: number } = {}
      data.forEach((term: any) => {
        initial[term.id] = term.total_days || 0
      })
      setEditingTerms(initial)
    }
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const updates = Object.entries(editingTerms).map(([termId, totalDays]) =>
        supabase
          .from('academic_terms')
          .update({ 
            total_days: Number(totalDays) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', termId)
      )

      const results = await Promise.all(updates)
      const hasError = results.some(r => r.error)

      if (hasError) {
        toast.error('Error updating some term thresholds. Please try again.')
      } else {
        toast.success('Attendance meeting days saved successfully!')
        await loadTerms()
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings. Please verify connection.')
    } finally {
      setSaving(false)
    }
  }

  const updateTermDays = (termId: string, days: number) => {
    setEditingTerms(prev => ({
      ...prev,
      [termId]: Math.max(0, Math.min(366, isNaN(days) ? 0 : days))
    }))
  }

  const adjustDays = (termId: string, delta: number) => {
    const current = editingTerms[termId] || 0
    updateTermDays(termId, current + delta)
  }

  const currentTerm = useMemo(() => terms.find(t => t.is_current), [terms])

  if (loading) {
    return <AttendanceSettingsSkeleton />
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
                    Attendance Calendar Thresholds
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Set statutory school meeting days for terminal roll call and broadsheet percentage calculations
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
          <div className="space-y-1.5 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Terminal Attendance Computation Standard
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] sm:text-xs opacity-90 pt-0.5">
              <p>• <strong>Denominator Benchmark:</strong> Total days configured here serve as the official statutory divisor across all class registers.</p>
              <p>• <strong>Report Card Metric:</strong> Terminal percentage is automatically derived as <code>(Days Present / Total Term Days) × 100%</code>.</p>
            </div>
          </div>
        </section>

        {/* Term Attendance Days Card */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Academic Term Days
                </h3>
                <p className="text-[11px] text-slate-400">Total operational school meeting days per session</p>
              </div>
            </div>

            {currentTerm && (
              <span className="hidden xs:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/70 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span>{currentTerm.name} ({currentTerm.academic_year})</span>
              </span>
            )}
          </div>

          <div className="p-3.5 sm:p-6 space-y-3">
            {terms.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Calendar className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300">No academic terms found</p>
                <p className="text-[11px]">Configure terms in General Settings before allocating attendance day limits.</p>
              </div>
            ) : (
              terms.map(term => {
                const daysValue = editingTerms[term.id] ?? 0
                const isCurrent = term.is_current

                return (
                  <div
                    key={term.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all gap-3 ${
                      isCurrent
                        ? 'border-[#003B5C]/30 bg-blue-50/40 dark:border-blue-500/30 dark:bg-blue-950/20 shadow-2xs'
                        : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/60'
                    }`}
                  >
                    {/* Left: Term Metadata */}
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isCurrent 
                          ? 'bg-[#003B5C] text-white shadow-xs' 
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-400 dark:text-slate-300'
                      }`}>
                        <Calendar className="w-4 h-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {term.name} • {term.academic_year}
                          </h4>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                              Active Current Term
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {term.start_date ? new Date(term.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '---'}
                          {' '}&ndash;{' '}
                          {term.end_date ? new Date(term.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '---'}
                        </p>
                      </div>
                    </div>

                    {/* Right: Days Stepper & Input */}
                    <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 sm:hidden">
                        Total Days:
                      </span>

                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => adjustDays(term.id, -1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-95 transition"
                          aria-label="Decrease days"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          max="366"
                          inputMode="numeric"
                          value={daysValue}
                          onChange={(e) => updateTermDays(term.id, parseInt(e.target.value) || 0)}
                          className="w-16 px-1 py-1 text-center font-mono font-black text-sm text-slate-900 dark:text-white bg-transparent outline-none focus:ring-1 focus:ring-[#003B5C] rounded-md"
                        />

                        <button
                          type="button"
                          onClick={() => adjustDays(term.id, 1)}
                          className="w-7 h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center border border-slate-200 dark:border-slate-700 active:scale-95 transition"
                          aria-label="Increase days"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-slate-400 hidden sm:inline">Days</span>
                    </div>

                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Uniform Institutional Analytics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 border border-[#003B5C]/15 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Class Broadsheet Roll
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Enables class teachers to log daily presence and monitor class-wide attendance trends over time.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 border border-[#003B5C]/15 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Gender Disaggregation
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Calculates parity indices between boys and girls for administrative reporting and GES compliance.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 border border-[#003B5C]/15 dark:border-blue-500/30 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Terminal Report Card Sync
              </h3>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Feeds individual student attendance rates straight into official terminal report card summaries.
            </p>
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
            onClick={handleSave}
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

function AttendanceSettingsSkeleton() {
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </main>

      <PortalFooter />
    </div>
  )
}