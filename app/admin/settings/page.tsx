'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Settings as SettingsIcon, School, Bell, Lock, Globe, Calendar, 
  TrendingUp, Archive, ChevronRight, Wrench, RefreshCw, KeyRound, 
  UserX, Loader2, ShieldCheck, CheckCircle2, Sparkles, Building2,
  Sliders
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface OverviewState {
  schoolName: string
  academicYear: string
  currentTerm: string
  systemStatus: string
}

export default function SettingsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<OverviewState>({
    schoolName: '',
    academicYear: '',
    currentTerm: '',
    systemStatus: 'Active'
  })
  const [fixingUsernames, setFixingUsernames] = useState(false)
  const [fixingPasswords, setFixingPasswords] = useState(false)
  const [fixingDuplicates, setFixingDuplicates] = useState(false)

  useEffect(() => {
    async function loadOverview() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load school settings
      const { data: schoolData } = await supabase
        .from('school_settings')
        .select('school_name')
        .single() as { data: any }

      // Load academic settings
      const { data: academicData } = await supabase
        .from('academic_settings')
        .select('current_academic_year, current_term')
        .single() as { data: any }

      setOverview({
        schoolName: schoolData?.school_name || "Biriwa Methodist 'C' Basic School",
        academicYear: academicData?.current_academic_year || '2026/27',
        currentTerm: academicData?.current_term || 'Term 1',
        systemStatus: 'Operational'
      })

      setLoading(false)
    }
    loadOverview()
  }, [router, supabase])

  async function handleFixUsernames() {
    if (!confirm('This will regenerate usernames for ALL students based on the standard format (First 3 letters + Last 3 letters). Proceed?')) {
      return
    }

    setFixingUsernames(true)
    try {
      const response = await fetch('/api/admin/fix-usernames')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update usernames')
      toast.success(`Success! Updated ${data.updated_count} students. Total processed: ${data.total_students}.`)
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while updating usernames')
    } finally {
      setFixingUsernames(false)
    }
  }

  async function handleFixPasswords() {
    if (!confirm('This will reset ALL student passwords to their Date of Birth in DD-MM-YYYY format. This action cannot be undone. Proceed?')) {
      return
    }

    setFixingPasswords(true)
    try {
      const response = await fetch('/api/admin/fix-passwords')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update passwords')
      toast.success(`Success! Reset credentials for ${data.updated_count} students.`)
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while updating passwords')
    } finally {
      setFixingPasswords(false)
    }
  }

  async function handleFixDuplicates() {
    if (!confirm('This will scan and prune duplicate student profiles matching the same Name and Date of Birth. Proceed?')) {
      return
    }

    setFixingDuplicates(true)
    try {
      const response = await fetch('/api/admin/fix-duplicates')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to remove duplicates')
      toast.success(`Success! Removed ${data.duplicates_found} duplicate records.`)
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while removing duplicates')
    } finally {
      setFixingDuplicates(false)
    }
  }

  const settingsSections = [
    {
      title: 'School Information',
      description: 'Institutional identity, GES registration, crest logo, and contact info',
      icon: School,
      badgeColor: 'bg-blue-50 text-[#003B5C] dark:bg-blue-950/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-900/40',
      href: '/admin/settings/school-info'
    },
    {
      title: 'General Settings',
      description: 'Active academic year, term calendar, GES weighting ratio, and teaching models',
      icon: Globe,
      badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/40',
      href: '/admin/settings/general'
    },
    {
      title: 'Attendance Settings',
      description: 'Expected term meeting days, holiday exclusions, and roll call thresholds',
      icon: Calendar,
      badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-900/40',
      href: '/admin/settings/attendance'
    },
    {
      title: 'Promotion Criteria',
      description: 'Benchmarks for class progression: pass marks, core subject requirements, and attendance',
      icon: TrendingUp,
      badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/40',
      href: '/admin/settings/promotion-criteria'
    },
    {
      title: 'Security & Access',
      description: 'Staff account permissions, role-based controls, and portal authentication',
      icon: Lock,
      badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200/60 dark:border-rose-900/40',
      href: '/admin/settings/security'
    },
    {
      title: 'Notifications & Alerts',
      description: 'Configure SMS gateway, guardian announcements, and staff reminders',
      icon: Bell,
      badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/40',
      href: '/admin/settings/notifications'
    },
    {
      title: 'Historical Reports',
      description: 'Graduate archive retention window, broadsheet archives, and data purge controls',
      icon: Archive,
      badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200/60 dark:border-purple-900/40',
      href: '/admin/settings/historical-reports'
    },
    {
      title: 'Homepage Statistics',
      description: 'Public enrollment figures, teacher counts, and school achievement badges',
      icon: SettingsIcon,
      badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200/60 dark:border-cyan-900/40',
      href: '/admin/settings/homepage-stats'
    },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full rounded-2xl sm:rounded-3xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/admin/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <SettingsIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>System Settings & Preferences</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Configure school profiles, academic sessions, security, and administrative utilities
                </p>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{overview.systemStatus}</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 sm:space-y-8">
        {/* Active Configuration Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Institution</span>
            <p className="text-xs sm:text-sm md:text-base font-bold text-gray-900 dark:text-white mt-1 line-clamp-1">
              {overview.schoolName}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Active Academic Year</span>
            <p className="text-base sm:text-lg lg:text-xl font-black text-[#003B5C] dark:text-blue-400 mt-1">
              {overview.academicYear}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Active Term Session</span>
            <p className="text-base sm:text-lg lg:text-xl font-black text-gray-900 dark:text-white mt-1">
              {overview.currentTerm}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm flex flex-col justify-between">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400">Platform Status</span>
            <p className="text-base sm:text-lg lg:text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>{overview.systemStatus}</span>
            </p>
          </div>
        </div>

        {/* Settings Modules Grid */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
              <span>Configuration Modules</span>
            </h2>
            <span className="text-xs text-gray-400 font-medium">{settingsSections.length} modules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 md:gap-5">
            {settingsSections.map((section, index) => {
              const IconComponent = section.icon
              return (
                <Link
                  key={index}
                  href={section.href}
                  className="group bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-2xl border ${section.badgeColor} group-hover:scale-105 transition-transform shrink-0`}>
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
                        {section.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-4 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs font-bold text-[#003B5C] dark:text-blue-300">
                    <span>Configure Settings</span>
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* System Maintenance & Data Utility Toolkit */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-750 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                  Automated Maintenance Toolkit
                </h2>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                  Run bulk batch scripts to sanitize student authentication, identifiers, and duplicate records
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-900/40">
              Admin Exclusive
            </span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-750">
            {/* Tool 1: Regenerate Usernames */}
            <div className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                    Batch Regenerate Student Usernames
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
                  Re-indexes all student credentials to the canonical format: First 3 letters of first name + last 3 letters of surname (e.g. <span className="font-mono font-bold text-gray-700 dark:text-gray-300">formah</span>).
                </p>
              </div>

              <button
                type="button"
                onClick={handleFixUsernames}
                disabled={fixingUsernames}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                {fixingUsernames ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Regenerate Usernames</span>
                )}
              </button>
            </div>

            {/* Tool 2: Reset Passwords to DOB */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-500 shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                    Reset Student Passwords to DOB
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
                  Resets passwords for all active learners to their Date of Birth in <span className="font-mono font-bold text-gray-700 dark:text-gray-300">DD-MM-YYYY</span> format. Helpful at the start of new sessions.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFixPasswords}
                disabled={fixingPasswords}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                {fixingPasswords ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset All Passwords</span>
                )}
              </button>
            </div>

            {/* Tool 3: Deduplicate Records */}
            <div className="py-4 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-rose-500 shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                    Prune Duplicate Student Records
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
                  Scans the student database for identical names and birthdates, merging assessment links and retaining the full profile containing middle names.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFixDuplicates}
                disabled={fixingDuplicates}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-300 rounded-xl text-xs sm:text-sm font-bold border border-rose-200 dark:border-rose-900/40 transition active:scale-95 disabled:opacity-50 shrink-0"
              >
                {fixingDuplicates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Scanning Database...</span>
                  </>
                ) : (
                  <span>Prune Duplicates</span>
                )}
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}