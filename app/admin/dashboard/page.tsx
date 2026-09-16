'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import {
  Users,
  GraduationCap, 
  Building2,
  FileText,
  Plus,
  CalendarDays,
  Activity,
  Palette,
  Calendar,
  Clock,
  ArrowRight,
  ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { StudentStatsModal } from '@/components/admin/StudentStatsModal'        
import { TeacherStatsModal } from '@/components/admin/TeacherStatsModal'        

const fetchDashboardStats = async () => {
  const supabase = getSupabaseBrowserClient()
  const [
    studentsRes, 
    teachersRes, 
    classesRes, 
    eventsRes, 
    termsRes, 
    recentStudentsRes, 
    thresholdRes, 
    sectionsRes, 
    sectionCountsRes
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'active'), 
    supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('classes').select('id', { count: 'exact', head: true }),  
    supabase.from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(3),
    supabase.from('academic_terms')
      .select('*')
      .eq('is_current', true)
      .single(),
    supabase.from('students')
      .select('id, first_name, last_name, created_at, classes:class_id(name)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'progress_alert_threshold')
      .maybeSingle(),
    supabase.from('sections')
      .select('id, name, colour, is_active, sort_order')
      .order('sort_order')
      .order('name'),
    supabase.from('student_sections')
      .select('section_id')
  ])

  return {
    stats: {
      totalStudents: studentsRes.count || 0,
      totalTeachers: teachersRes.count || 0,
      totalClasses: classesRes.count || 0,
      activeEnrollments: (studentsRes.count || 0),
      pendingAdmissions: 0,
    },
    upcomingEvents: eventsRes.data || [],
    currentTerm: termsRes.data || null,
    recentActivities: recentStudentsRes.data || [],
    alertThreshold: thresholdRes.data?.setting_value ? Number(thresholdRes.data.setting_value) : 90,
    sections: sectionsRes.data || [],
    totalSectionAssignments: sectionCountsRes.data?.length || 0,
    sectionsWithCounts: sectionsRes.data ? sectionsRes.data.map((section: any) => ({
      ...section,
      student_count: (sectionCountsRes.data || []).filter(
        (ss: any) => ss.section_id === section.id
      ).length
    })) : []
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: contextLoading } = useAdmin()
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    if (!contextLoading && !user) {
      router.push('/login?portal=admin')
    }
  }, [user, contextLoading, router])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const { data, isLoading } = useSWR(
    user && !contextLoading ? 'adminDashboardStats' : null, 
    fetchDashboardStats,
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  )

  if (contextLoading || isLoading || !data) {
    return <DashboardSkeleton />
  }

  const { stats, upcomingEvents, currentTerm, recentActivities, totalSectionAssignments, sectionsWithCounts } = data

  const hour = currentTime.getHours()
  let greeting = 'Good evening'
  if (hour < 12) greeting = 'Good morning'
  else if (hour < 18) greeting = 'Good afternoon'

  let termProgress = 0
  if (currentTerm) {
    const start = new Date(currentTerm.start_date)
    const end = new Date(currentTerm.end_date)
    const totalDays = differenceInDays(end, start)
    const daysPassed = differenceInDays(currentTime, start)
    termProgress = Math.min(Math.max(Math.round((daysPassed / (totalDays || 1)) * 100), 0), 100)
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 pb-16 sm:pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-5 sm:space-y-6 lg:space-y-8 pt-3.5 sm:pt-6">

        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white p-4 sm:p-7 md:p-8 lg:p-9 border border-white/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 sm:gap-6">
            <div className="space-y-2.5 sm:space-y-4 max-w-2xl min-w-0">
              <div className="space-y-1 sm:space-y-1.5">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                  {greeting}, Administrator
                </h1>
                <p className="text-blue-200/90 text-xs sm:text-sm md:text-base flex items-center gap-2 font-medium flex-wrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Directing school operations, staff assignments, and institutional records.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                  <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-400/20 border border-amber-400/30 text-amber-300 shadow-2xs">
                  <span className="truncate max-w-[140px] sm:max-w-none">{currentTerm ? currentTerm.name || currentTerm.term_name || 'Active Session' : 'Active Session'}</span>
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <Link 
                href="/admin/enrollments" 
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl sm:rounded-2xl border border-white/15 shadow-inner transition-all active:scale-[0.98] group"
              >
                <div className="bg-white text-[#003B5C] rounded-lg sm:rounded-xl p-1.5 sm:p-2 group-hover:scale-105 transition-transform shadow-xs shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-[10px] sm:text-[11px] text-blue-200 uppercase tracking-wider font-bold">Admissions</p>
                  <p className="text-xs sm:text-sm font-bold text-white leading-tight truncate">Enroll New Learner</p>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-200 ml-auto md:ml-2 group-hover:translate-x-0.5 transition-transform shrink-0" />
              </Link>
            </div>
          </div>
        </section>

        {/* Primary KPI Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
          <div onClick={() => setShowStatsModal(true)} className="h-full">
            <StatsCard 
              title="Total Learners" 
              value={stats.totalStudents} 
              icon={Users} 
              badge="+2.5% vs term" 
              description="Active on register" 
            />
          </div>

          <div onClick={() => setShowTeacherModal(true)} className="h-full">
            <StatsCard 
              title="Teaching Staff" 
              value={stats.totalTeachers} 
              icon={GraduationCap} 
              badge="Full Attendance" 
              description="Active instructors" 
            />
          </div>

          <Link href="/admin/classes" className="h-full block">
            <StatsCard 
              title="Class Cohorts" 
              value={stats.totalClasses} 
              icon={Building2} 
              badge="KG to Basic 9" 
              description="Active classrooms" 
            />
          </Link>

          <Link href="/admin/enrollments" className="h-full block">
            <StatsCard 
              title="Admissions" 
              value={stats.pendingAdmissions} 
              icon={FileText} 
              badge="Pending Review" 
              description="Processed admissions" 
            />
          </Link>
        </section>
        
        {/* Interactive Modals */}
        <StudentStatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />
        <TeacherStatsModal isOpen={showTeacherModal} onClose={() => setShowTeacherModal(false)} />

        {/* Main Dashboard Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          
          {/* Main Left Column */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6 lg:space-y-8 min-w-0">
            
            {/* Quick Actions Panel */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <span>Administrative Operations</span>
                </h2>
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium hidden sm:inline">Frequent Actions</span>
              </div>
              
              <div className="p-3.5 sm:p-5 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 md:gap-4">
                  <QuickActionLink 
                    title="Add Teacher" 
                    href="/admin/teachers/add" 
                    icon={GraduationCap}
                  />
                  <QuickActionLink 
                    title="Enroll Learner" 
                    href="/admin/enrollments" 
                    icon={Users}
                  />
                  <QuickActionLink 
                    title="Class Groups" 
                    href="/admin/classes" 
                    icon={Building2}
                  />
                  <QuickActionLink 
                    title="Post Notice" 
                    href="/admin/news" 
                    icon={FileText}
                  />
                </div>
              </div>
            </section>

            {/* Recent Admissions Activity */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#003B5C] dark:bg-blue-400 rounded-full shrink-0" />
                    <span>Recent Learner Admissions</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Most recent registrations logged on system</p>
                </div>
                <Link 
                  href="/admin/students" 
                  className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 sm:p-6">
                <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((student: any) => (
                      <div key={student.id} className="py-3 sm:py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate leading-snug">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              Class: <span className="font-semibold text-slate-600 dark:text-slate-300">{student.classes?.name || 'Unassigned'}</span>
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap pl-2">
                          {formatDistanceToNow(new Date(student.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-slate-400 text-xs font-medium">
                      No recent student admissions logged yet.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-5 sm:gap-6 lg:gap-8 min-w-0">
            
            {/* Academic Session Progress Card */}
            <div className="md:col-span-2 lg:col-span-1 bg-gradient-to-br from-[#003B5C] to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-white/10 relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Activity className="w-24 h-24" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200/80">Session Timeline</span>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  {currentTerm ? currentTerm.name : 'Active Term'}
                </h3>
              </div>

              {currentTerm ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold text-blue-100">
                      <span>Term Elapsed</span>
                      <span className="font-mono text-amber-400 font-bold">{termProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-950/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/10">
                      <div 
                        className="bg-gradient-to-r from-amber-400 to-amber-300 h-full rounded-full transition-all duration-700" 
                        style={{ width: `${termProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[10px] sm:text-[11px] text-blue-200/80 font-mono pt-1">
                    <span>From: {new Date(currentTerm.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span>To: {new Date(currentTerm.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-blue-200/80 py-2">No active academic term configured.</p>
              )}
            </div>

            {/* Upcoming School Events */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden flex flex-col justify-between">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Scheduled Events</span>
                </h3>
                <Link href="/admin/events" className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline">
                  Calendar
                </Link>
              </div>

              <div className="p-4 sm:p-5 flex-1">
                {upcomingEvents.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                    {upcomingEvents.map((event: any) => {
                      const eventDate = new Date(event.event_date)
                      const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                      const day = eventDate.getDate()
                      
                      return (
                        <div key={event.id} className="py-2.5 sm:py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex flex-col items-center justify-center shrink-0 shadow-2xs">
                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-wider leading-none">{month}</span>
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white leading-tight">{day}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {event.title}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                              {event.location || event.event_type || 'Main Campus'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic text-center py-6">
                    No upcoming school events scheduled.
                  </div>
                )}
              </div>
            </section>

            {/* School Sections Matrix */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-xs border border-slate-200/80 dark:border-slate-700/80 overflow-hidden flex flex-col justify-between">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>Houses &amp; Sections</span>
                </h3>
                <Link href="/admin/sections" className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline">
                  Manage
                </Link>
              </div>

              <div className="p-4 sm:p-5 flex-1">
                {sectionsWithCounts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <p className="font-semibold">No houses configured</p>
                    <Link href="/admin/sections" className="text-blue-600 hover:underline mt-1 inline-block font-medium">
                      Configure houses &amp; groups
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-2.5">
                    {sectionsWithCounts.map((section: any) => {
                      const sectionStudentCount = section.student_count || 0
                      const pct = totalSectionAssignments > 0 
                        ? Math.round((sectionStudentCount / totalSectionAssignments) * 100) 
                        : 0

                      return (
                        <Link
                          key={section.id}
                          href="/admin/sections"
                          className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-2xs shrink-0 ring-2 ring-white dark:ring-slate-900"
                              style={{ backgroundColor: section.colour || '#8B5CF6' }}
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block leading-tight">
                                {section.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {sectionStudentCount} learners ({pct}%)
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

interface StatsCardProps {
  title: string
  value: number
  icon: React.ElementType
  badge?: string
  description: string
}

function StatsCard({ title, value, icon: Icon, badge, description }: StatsCardProps) {
  return (
    <div className="h-full bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 md:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-[0.98]">
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        <div className="p-2 sm:p-2.5 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="space-y-0.5 sm:space-y-1">
        <div className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white leading-tight">
          {value}
        </div>
        <div className="text-[10px] sm:text-[11px] text-slate-400 truncate flex items-center justify-between">
          <span className="truncate">{description}</span>
          {badge && <span className="font-semibold text-amber-600 dark:text-amber-400 ml-1 hidden sm:inline shrink-0">{badge}</span>}
        </div>
      </div>
    </div>
  )
}

interface QuickActionLinkProps {
  title: string
  href: string
  icon: React.ElementType
}

function QuickActionLink({ title, href, icon: Icon }: QuickActionLinkProps) {
  return (
    <Link href={href} className="block group h-full">
      <div className="h-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-sm hover:border-[#003B5C]/30 transition-all duration-200 flex flex-col items-center justify-center text-center active:scale-[0.98] min-h-[90px] sm:min-h-[105px]">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#003B5C]/10 text-[#003B5C] dark:bg-blue-500/20 dark:text-blue-300 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shrink-0">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <h3 className="font-bold text-[11px] sm:text-xs text-slate-800 dark:text-slate-200 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors line-clamp-1">
          {title}
        </h3>
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 space-y-6">
      <Skeleton className="h-36 sm:h-44 w-full rounded-2xl sm:rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-24 sm:h-28 rounded-2xl sm:rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-36 rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-72 rounded-2xl sm:rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-56 rounded-2xl sm:rounded-3xl" />
        </div>
      </div>
    </div>
  )
}