'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  BookOpen, 
  BarChart3, 
  Calendar, 
  LogOut, 
  User, 
  FileText, 
  Bell, 
  Award, 
  DollarSign,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Lock,
  TrendingUp,
  ClipboardList,
  ChevronDown
} from 'lucide-react'
import { signOut } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useStudent } from '@/components/providers/StudentContext'
import { Skeleton } from '@/components/ui/skeleton'
import { PortalFooter } from '@/components/PortalFooter'

interface Announcement {
  id: string
  title: string
  content: string
  target_audience: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  category?: string
}

export default function StudentDashboard() {
  const router = useRouter()
  const { user, student, loading: contextLoading, dashboardData, fetchDashboardData } = useStudent()
  
  const [loading, setLoading] = useState(!dashboardData)
  const [error, setError] = useState<string | null>(null)
  const [allowCumulativeDownload, setAllowCumulativeDownload] = useState(dashboardData?.allowCumulativeDownload || false)
  const [announcements, setAnnouncements] = useState<Announcement[]>(dashboardData?.announcements || [])
  const [stats, setStats] = useState(dashboardData?.stats || {
    currentTerm: 'Active Term',
    attendance: 'No Data',
    averageScore: 0,
    classPosition: 'N/A'
  })
  const [studentSection, setStudentSection] = useState<any>(null)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    if (contextLoading) return

    if (!user) {
      router.push('/login?portal=student')
      return
    }

    if (!student) {
      setError('No student record found for your account. Please contact the school administration.')
      setLoading(false)
      return
    }

    if (dashboardData) {
      setAllowCumulativeDownload(dashboardData.allowCumulativeDownload)
      setAnnouncements(dashboardData.announcements)
      setStats(dashboardData.stats)
      setLoading(false)

      if (Date.now() - dashboardData.lastFetched > 60 * 1000) {
        fetchDashboardData()
      }
    } else {
      fetchDashboardData().then(() => setLoading(false))
    }

    if (student?.id) {
      supabase
        .from('student_sections')
        .select('section_id, sections(id, name, colour, emblem_url)')
        .eq('student_id', student.id)
        .maybeSingle()
        .then((response: { data: any }) => {
          if (response?.data?.sections) setStudentSection(response.data.sections)
        })
    }
  }, [user, student, contextLoading, dashboardData, fetchDashboardData, router, supabase])

  // Click outside to close profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=student')
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': 
        return 'text-rose-700 bg-rose-50 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40'
      case 'high': 
        return 'text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40'
      default: 
        return 'text-[#003B5C] bg-blue-50 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
    }
  }

  const studentName = student?.first_name 
    ? `${student.first_name} ${student.last_name || ''}`.trim()
    : 'Student'

  const studentInitials = student?.first_name && student?.last_name
    ? `${student.first_name[0]}${student.last_name[0]}`.toUpperCase()
    : student?.first_name
    ? student.first_name.slice(0, 2).toUpperCase()
    : 'ST'

  const isBasic9 = student?.classes?.name && (
    student.classes.name.toLowerCase().includes('basic 9') || 
    student.classes.name.toLowerCase().includes('jhs 3')
  )

  if (loading) return <StudentDashboardSkeleton />

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-inner ring-8 ring-rose-500/10">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Portal Notice</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{error}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full py-2.5 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs sm:text-sm rounded-xl transition active:scale-95 shadow-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Header with Circular School Logo */}
      <header className="sticky top-0 z-40 w-full select-none shadow-md flex-none">
        {/* Top Dark Red Stripe */}
        <div className="h-2 w-full bg-[#BA1B1D]" />
        
        {/* Thin Orange Divider Line */}
        <div className="h-[2px] w-full bg-[#EA580C]" />

        {/* Methodist-Yellow Bar (#EAA812) */}
        <div className="bg-[#EAA812] text-[#003B5C] border-b border-[#C7870A]">
          <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2 sm:py-2.5">
            <div className="flex items-center justify-between gap-2.5 sm:gap-4">
              
              {/* Left: Round School Crest & Name */}
              <Link href="/student/dashboard" className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1 group">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white border-2 border-amber-600/50 p-1 shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
                  <Image
                    src="/school_crest.png"
                    alt="Biriwa Methodist 'C' Logo"
                    width={48}
                    height={48}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-[#003B5C] tracking-tight truncate leading-tight">
                    Biriwa Methodist &apos;C&apos;
                  </h1>

                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-[#003B5C] uppercase tracking-wider mt-0.5 truncate">
                    <span>BASIC SCHOOL</span>
                    <span className="text-[#003B5C]/60">•</span>
                    <span className="italic font-semibold capitalize tracking-normal text-[#003B5C]/90">
                      &ldquo;Discipline with Hardwork&rdquo;
                    </span>
                  </div>
                </div>
              </Link>

              {/* Right: Learner Profile & Menu */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-[#003B5C]/10 transition-colors active:scale-95"
                    aria-label="Student profile menu"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#003B5C] text-amber-300 flex items-center justify-center font-bold text-xs shadow-xs ring-1 ring-white/30 shrink-0">
                      {studentInitials}
                    </div>

                    <div className="hidden lg:block text-left min-w-0 max-w-[130px]">
                      <p className="text-xs font-black text-[#003B5C] truncate leading-tight">
                        {studentName}
                      </p>
                      <p className="text-[10px] font-bold text-[#003B5C]/80 uppercase tracking-wider truncate">
                        ID: {student?.student_id || 'Learner'}
                      </p>
                    </div>

                    <ChevronDown className="w-3.5 h-3.5 text-[#003B5C]/70 hidden sm:block" />
                  </button>

                  {/* Profile Dropdown */}
                  {profileDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 bg-transparent sm:hidden" 
                        onClick={() => setProfileDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {studentName}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            ID: {student?.student_id || '---'} • {student?.classes?.name || 'Class'}
                          </p>
                        </div>

                        <div className="py-1">
                          <Link
                            href="/student/profile"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span>My Profile</span>
                          </Link>
                          <Link
                            href="/student/report-card"
                            onClick={() => setProfileDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                          >
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            <span>Terminal Report Card</span>
                          </Link>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 lg:py-8 space-y-5 sm:space-y-6 lg:space-y-8">
        
        {/* Welcome Hero Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white p-4 sm:p-7 md:p-8 lg:p-9 border border-white/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5 sm:space-y-3.5 max-w-2xl min-w-0">
              <div className="space-y-1 sm:space-y-1.5">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                  Welcome back, {student?.first_name}!
                </h2>
                <p className="text-blue-200/90 text-xs sm:text-sm md:text-base flex items-center gap-2 font-medium flex-wrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Ready to check your attendance, exam grades, and broadsheet positions?
                </p>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-mono font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                  <span>ID: {student?.student_id || '---'}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                  <BookOpen className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{student?.classes?.name || 'Class Cohort'}</span>
                </span>

                {studentSection && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                    <span 
                      className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/50" 
                      style={{ backgroundColor: studentSection.colour || '#F2A900' }} 
                    />
                    <span>{studentSection.name}</span>
                  </span>
                )}

                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-400/20 border border-amber-400/30 text-amber-300 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{stats.currentTerm}</span>
                </span>
              </div>
            </div>

            {/* Attendance Callout */}
            <div className="w-full md:w-auto shrink-0 pt-1 md:pt-0">
              <div className="bg-white/10 backdrop-blur-xl p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-white/15 shadow-inner flex md:flex-col justify-between items-center md:items-start gap-2">
                <span className="text-[10px] sm:text-xs text-blue-200/90 font-bold uppercase tracking-wider">
                  Term Attendance
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl sm:text-2xl md:text-3xl font-black text-amber-400 font-mono tracking-tight">
                    {stats.attendance}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-300 font-bold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5 shrink-0" /> Roll Call
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Results Withheld Warning */}
        {student?.results_withheld && (
          <section className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 shadow-2xs">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <h3 className="font-bold text-xs sm:text-sm text-rose-800 dark:text-rose-300">
                Terminal Examination Results Withheld
              </h3>
              <p className="text-[11px] sm:text-xs opacity-90">
                Your terminal scores are currently withheld by the administration.
                {student.withheld_reason ? ` Reason: ${student.withheld_reason}.` : ' Please settle outstanding school obligations or consult the administration office for clearance.'}
              </p>
            </div>
          </section>
        )}

        {/* Simple & Clean KPI Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Academic Session
              </span>
              <div className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                {stats.currentTerm}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Current term</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Days Present
              </span>
              <div className="text-base sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 truncate">
                {stats.attendance}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Presence tally</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Average Mark
              </span>
              <div className="text-base sm:text-xl font-black font-mono text-[#003B5C] dark:text-blue-400 truncate">
                {student?.results_withheld ? '---' : stats.averageScore > 0 ? `${stats.averageScore}%` : 'Pending'}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Active subjects</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs flex items-center justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block truncate">
                Class Position
              </span>
              <div className="text-base sm:text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
                {student?.results_withheld ? '---' : stats.classPosition}
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Cohort rank</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
        </section>

        {/* Core Services Section */}
        <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Academic Services &amp; Records</span>
            </h2>
            <span className="text-[11px] sm:text-xs text-blue-200/80 font-medium hidden sm:inline">
              Student Portals
            </span>
          </div>

          <div className="p-3.5 sm:p-5 md:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
              
              <StudentActionCard 
                href="/student/report-card"
                title="Terminal Report"
                description="View grades, Stanine & remarks"
                icon={BookOpen}
                disabled={Boolean(student?.results_withheld)}
              />

              {isBasic9 && (
                <StudentActionCard 
                  href="/student/mock-results"
                  title="Mock Results"
                  description="BECE trial marks & rankings"
                  icon={Award}
                />
              )}

              <StudentActionCard 
                href="/student/assessments"
                title="Online Quizzes"
                description="Homework & class tests"
                icon={ClipboardList}
              />

              <StudentActionCard 
                href="/student/performance"
                title="Progress Chart"
                description="Subject performance trends"
                icon={TrendingUp}
              />

              <StudentActionCard 
                href="/student/attendance"
                title="Roll Call Record"
                description="Presence register history"
                icon={Calendar}
              />

              <StudentActionCard 
                href="/student/fees"
                title="School Fees"
                description="Account balance & receipts"
                icon={DollarSign}
              />

              {allowCumulativeDownload ? (
                <StudentActionCard 
                  href="/student/cumulative"
                  title="Cumulative Record"
                  description="Multi-term broadsheet file"
                  icon={FileText}
                />
              ) : (
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/70 dark:bg-slate-800/40 opacity-70 flex flex-col justify-between min-h-[95px] sm:min-h-[110px]">
                  <div>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center mb-2.5 sm:mb-3 shrink-0">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h3 className="font-bold text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
                      Cumulative Record
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      Released upon clearance
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pt-2 mt-1">
                    Locked by Admin
                  </span>
                </div>
              )}

              <StudentActionCard 
                href="/student/profile"
                title="My Profile"
                description="Personal bio & guardian info"
                icon={User}
              />

            </div>
          </div>
        </section>

        {/* Notice Board Section */}
        <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400 shrink-0" />
              <span>School Notice Board</span>
            </h3>
            <span className="text-[11px] sm:text-xs text-blue-200/80 font-medium">
              Official Directives
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Bell className="w-6 h-6 opacity-30" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  No Active Announcements
                </p>
                <p className="text-[11px] text-slate-400 max-w-sm">
                  School bulletins and term updates will appear here once published by administration.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {announcements.map((announcement) => (
                  <div key={announcement.id} className="py-3.5 sm:py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${getPriorityBadge(announcement.priority)}`}>
                          {announcement.priority || 'Notice'}
                        </span>
                        {announcement.category && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {announcement.category}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 font-mono shrink-0">
                        {formatTimeAgo(announcement.created_at)}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                      {announcement.title}
                    </h4>

                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Shared Portal Footer */}
      <PortalFooter />
    </div>
  )
}

interface StudentActionCardProps {
  href: string
  title: string
  description: string
  icon: any
  disabled?: boolean
}

function StudentActionCard({ 
  href, 
  title, 
  description, 
  icon: Icon,
  disabled
}: StudentActionCardProps) {
  if (disabled) {
    return (
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 opacity-60 flex flex-col justify-between min-h-[95px] sm:min-h-[110px] cursor-not-allowed">
        <div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center mb-2.5 sm:mb-3 shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-slate-500 dark:text-slate-400 line-clamp-1">
            {title}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
        <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider pt-2 mt-1">
          Withheld
        </span>
      </div>
    )
  }

  return (
    <Link href={href} className="block group h-full">
      <div className="h-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 shadow-2xs hover:shadow-sm hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98] min-h-[95px] sm:min-h-[110px]">
        <div>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center mb-2.5 sm:mb-3 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-[10px] sm:text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
        
        <div className="pt-2 mt-1 flex items-center text-[10px] sm:text-xs font-bold text-[#003B5C] dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Open</span>
          <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function StudentDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <div className="h-2 w-full bg-[#BA1B1D]" />
      <div className="h-[2px] w-full bg-[#EA580C]" />
      <div className="h-16 bg-[#EAA812] border-b border-[#C7870A]" />
      <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <Skeleton className="h-44 sm:h-52 w-full rounded-2xl sm:rounded-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24 sm:h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-2xl sm:rounded-3xl" />
      </div>
    </div>
  )
}