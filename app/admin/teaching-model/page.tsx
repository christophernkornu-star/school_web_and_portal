'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Settings, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  GraduationCap, 
  BookOpen, 
  Users, 
  Sparkles, 
  ShieldCheck, 
  Loader2,
  Layers,
  HelpCircle,
  ArrowRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import BackButton from '@/components/ui/back-button'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

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
      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'upper_primary_teaching_model')
        .maybeSingle()

      if (data?.setting_value) {
        setUpperPrimaryModel(data.setting_value as 'class_teacher' | 'subject_teacher')
      }

      setLoading(false)
    }

    loadSettings()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert(
          {
            setting_key: 'upper_primary_teaching_model',
            setting_value: upperPrimaryModel,
            description: 'Teaching model for Basic 4-6: class_teacher or subject_teacher'
          }, 
          { onConflict: 'setting_key' }
        )

      if (error) throw error

      toast.success('Teaching model configuration saved successfully!')
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings: ' + (error.message || 'Please try again'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <TeachingModelSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header with Action Bar */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Academic Teaching Models
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Classroom organizational structure and subject allocation rules
                </p>
              </div>
            </div>

            {/* Desktop / Tablet Save Action */}
            <div className="hidden sm:flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Save className="w-4 h-4 text-amber-400" />
                )}
                <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6 pb-28 sm:pb-12">
        
        {/* Informational Guidance Callout */}
        <div className="bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 rounded-2xl p-3.5 sm:p-4.5 flex items-start gap-3 text-xs text-blue-900 dark:text-blue-200 shadow-2xs">
          <ShieldCheck className="w-5 h-5 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h2 className="font-bold text-xs sm:text-sm text-[#003B5C] dark:text-blue-300">
              Curriculum Allocation Architecture
            </h2>
            <p className="text-[11px] sm:text-xs opacity-90">
              This system configures how lesson registers, continuous assessment score entries, and terminal broadsheets are partitioned among staff members across each tier of basic education.
            </p>
          </div>
        </div>

        {/* Tier 1: Lower Primary Card (Fixed) */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Lower Primary (Basic 1 – 3)
                </h3>
                <p className="text-[11px] text-slate-400">Foundational Stage</p>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-blue-50 text-[#003B5C] border border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50 w-fit">
              Fixed: Class Teacher Model
            </span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              In accordance with Ghana Education Service standards, one designated teacher delivers all curriculum subjects to their assigned cohort to ensure holistic developmental monitoring.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Full access to all subjects</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Roll call attendance authority</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Consolidated report remarks</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tier 2: Upper Primary Card (Configurable) */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border-2 border-[#003B5C]/20 dark:border-blue-500/30 p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Upper Primary (Basic 4 – 6)
                </h3>
                <p className="text-[11px] text-slate-400">Intermediate Stage</p>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 w-fit">
              Configurable Preference
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
            Select the instructional delivery model that matches the school&apos;s current staff deployment:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
            
            {/* Option A: Class Teacher Model */}
            <label 
              className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] select-none ${
                upperPrimaryModel === 'class_teacher'
                  ? 'border-[#003B5C] bg-[#003B5C]/5 dark:border-blue-400 dark:bg-blue-950/30 shadow-xs'
                  : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="upperPrimaryModel"
                      value="class_teacher"
                      checked={upperPrimaryModel === 'class_teacher'}
                      onChange={() => setUpperPrimaryModel('class_teacher')}
                      className="w-4 h-4 text-[#003B5C] focus:ring-[#003B5C] border-slate-300 cursor-pointer"
                    />
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Class Teacher Model
                    </span>
                  </div>

                  {upperPrimaryModel === 'class_teacher' && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#003B5C] text-white dark:bg-blue-500">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  A single teacher is assigned to each class and takes responsibility for all subjects. Recommended when faculty size is compact.
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>One master gradebook per teacher</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Complete roll call &amp; report ownership</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Simplifies teacher scheduling</span>
                  </div>
                </div>
              </div>
            </label>

            {/* Option B: Subject Teacher Model */}
            <label 
              className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.99] select-none ${
                upperPrimaryModel === 'subject_teacher'
                  ? 'border-[#003B5C] bg-[#003B5C]/5 dark:border-blue-400 dark:bg-blue-950/30 shadow-xs'
                  : 'border-slate-200/80 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="radio"
                      name="upperPrimaryModel"
                      value="subject_teacher"
                      checked={upperPrimaryModel === 'subject_teacher'}
                      onChange={() => setUpperPrimaryModel('subject_teacher')}
                      className="w-4 h-4 text-[#003B5C] focus:ring-[#003B5C] border-slate-300 cursor-pointer"
                    />
                    <span className="font-black text-xs sm:text-sm text-slate-900 dark:text-white">
                      Subject Teacher Model
                    </span>
                  </div>

                  {upperPrimaryModel === 'subject_teacher' && (
                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-[#003B5C] text-white dark:bg-blue-500">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Different subject specialists rotate across classes (e.g. Science, Maths, ICT). Prepares learners for the JHS transition.
                </p>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Specialized marks per instructor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Designated Class Teacher coordinates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>Restricts edits to allocated subjects</span>
                  </div>
                </div>
              </div>
            </label>

          </div>
        </section>

        {/* Tier 3: Junior High School Card (Fixed) */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 shadow-xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Junior High School (JHS 1 – 3)
                </h3>
                <p className="text-[11px] text-slate-400">Secondary Preparation Stage</p>
              </div>
            </div>

            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 w-fit">
              Fixed: Subject Specialist Model
            </span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-900/50 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Subject teachers only manage assessment records for their assigned disciplines. One master Class Teacher oversees attendance and overall conduct.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Departmental specialization</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Subject score integrity locks</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>BECE candidate tracking ready</span>
              </div>
            </div>
          </div>
        </section>

        {/* Administrative Impact Warning */}
        <div className="bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <h4 className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-300">
              Administrative Impact Notice
            </h4>
            <p className="text-[11px] sm:text-xs">
              Modifying the Upper Primary model recalculates teacher dashboard permissions and portal navigation views. Remember to review and update your <strong>Subject Allocations</strong> under the Admin Management panel whenever this setting is altered.
            </p>
          </div>
        </div>

      </main>

      {/* Floating Sticky Mobile Bottom Action Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 p-3 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
              Selected Structure
            </span>
            <span className="text-xs font-black text-[#003B5C] dark:text-blue-400 truncate block">
              {upperPrimaryModel === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            ) : (
              <Save className="w-4 h-4 text-amber-400" />
            )}
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </div>

      <PortalFooter />
    </div>
  )
}

function TeachingModelSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-44 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}