'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Settings as SettingsIcon, 
  School, 
  Bell, 
  Lock, 
  Globe, 
  Calendar, 
  TrendingUp, 
  Archive, 
  ChevronRight, 
  Wrench, 
  RefreshCw, 
  KeyRound, 
  UserX, 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  Sparkles, 
  Building2,
  Sliders,
  AlertTriangle,
  ArrowRight
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { PortalFooter } from '@/components/PortalFooter'

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
    systemStatus: 'Operational'
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
        .maybeSingle()

      // Load academic settings
      const { data: academicData } = await supabase
        .from('academic_settings')
        .select('current_academic_year, current_term')
        .maybeSingle()

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
    if (!confirm('This will regenerate usernames for ALL students based on the standard format (First 3 letters of first name + Last 3 letters of surname). Proceed?')) {
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
    return <SettingsSkeleton />
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/admin/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    System Settings &amp; Preferences
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Institutional profiles, academic sessions, security, and administrative utilities
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs font-bold shrink-0 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{overview.systemStatus}</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-5 sm:space-y-7">
        
        {/* Active Configuration Overview Cards */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
          
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
              Institution
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={overview.schoolName}>
              {overview.schoolName}
            </p>
            <span className="text-[10px] text-slate-400 truncate">Official GES registered name</span>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
              Academic Year
            </span>
            <p className="text-base sm:text-xl font-black font-mono text-[#003B5C] dark:text-blue-400 truncate">
              {overview.academicYear}
            </p>
            <span className="text-[10px] text-slate-400 truncate">Active school year</span>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
              Active Term Session
            </span>
            <p className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
              {overview.currentTerm}
            </p>
            <span className="text-[10px] text-slate-400 truncate">Current reporting term</span>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex flex-col justify-between space-y-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
              Platform Status
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <p className="text-sm sm:text-base font-black text-emerald-600 dark:text-emerald-400 truncate">
                {overview.systemStatus}
              </p>
            </div>
            <span className="text-[10px] text-slate-400 truncate">Supabase DB connected</span>
          </div>

        </section>

        {/* Configuration Modules Section */}
        <section className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Configuration Modules
              </h2>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-400">
              {settingsSections.length} Sections
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-4.5">
            {settingsSections.map((section, index) => {
              const IconComponent = section.icon
              return (
                <Link
                  key={index}
                  href={section.href}
                  className="group bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2.5 sm:p-3 rounded-2xl border ${section.badgeColor} group-hover:scale-105 transition-transform shrink-0`}>
                        <IconComponent className="w-5 h-5 sm:w-5 sm:h-5" />
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                    </div>

                    <div>
                      <h3 className="font-bold text-xs sm:text-sm md:text-base text-slate-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors leading-snug">
                        {section.title}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                        {section.description}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 mt-3.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs font-bold text-[#003B5C] dark:text-blue-300">
                    <span>Manage Settings</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* System Maintenance & Data Utility Toolkit */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 p-4 sm:p-6 md:p-7 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm md:text-base font-black text-slate-900 dark:text-white">
                  Automated Maintenance &amp; Sanity Toolkit
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium">
                  Run bulk administrative scripts to sanitize student credentials, authentication, and duplicate records
                </p>
              </div>
            </div>

            <span className="self-start sm:self-auto text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
              Admin Exclusive
            </span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            
            {/* Tool 1: Regenerate Usernames */}
            <div className="py-4 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Batch Regenerate Student Usernames
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Re-indexes all student credentials to the canonical format: First 3 letters of first name + last 3 letters of surname (e.g. <span className="font-mono font-bold text-slate-700 dark:text-slate-300">formah</span>).
                </p>
              </div>

              <button
                type="button"
                onClick={handleFixUsernames}
                disabled={fixingUsernames}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {fixingUsernames ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Regenerate Usernames</span>
                )}
              </button>
            </div>

            {/* Tool 2: Reset Passwords to DOB */}
            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-500 shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Reset Student Passwords to Date of Birth
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Resets passwords for all active learners to their recorded Date of Birth in <span className="font-mono font-bold text-slate-700 dark:text-slate-300">DD-MM-YYYY</span> format. Helpful at the start of new academic terms.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFixPasswords}
                disabled={fixingPasswords}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {fixingPasswords ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <span>Reset All Passwords</span>
                )}
              </button>
            </div>

            {/* Tool 3: Deduplicate Records */}
            <div className="py-4 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4 text-amber-500 shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                    Prune Duplicate Student Records
                  </h3>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
                  Scans the student database for identical names and birthdates, merging assessment links and retaining the full profile containing complete middle names.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFixDuplicates}
                disabled={fixingDuplicates}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-[#003B5C] rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {fixingDuplicates ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#003B5C]" />
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

      {/* Footer */}
      <PortalFooter />
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-48 rounded-md" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-8 w-44 rounded-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-44 rounded-2xl sm:rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-56 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}