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
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 pb-20 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 space-y-6 sm:space-y-8 pt-4 sm:pt-6">

        {/* Hero Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-xl bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white p-5 sm:p-7 md:p-8 lg:p-9 border border-white/10">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-56 w-56 sm:h-64 sm:w-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-56 w-56 sm:h-64 sm:w-64 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3 sm:space-y-4 max-w-2xl min-w-0">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-tight break-words">
                  {greeting}, Administrator
                </h1>
                <p className="text-blue-200/90 text-xs sm:text-sm md:text-base flex items-center gap-2 font-medium flex-wrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Directing school operations, staff assignments, and institutional records.
                </p>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100">
                  <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100">
                  <Clock className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                </span>
                
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-amber-400/20 border border-amber-400/30 text-amber-300">
                  <span>{currentTerm ? currentTerm.name || currentTerm.term_name || 'Active Session' : 'Active Session'}</span>
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="w-full md:w-auto shrink-0">
              <Link 
                href="/admin/enrollments" 
                className="w-full md:w-auto inline-flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl px-5 py-3.5 rounded-2xl border border-white/15 shadow-inner transition-all active:scale-95 group"
              >
                <div className="bg-white text-[#003B5C] rounded-xl p-2 group-hover:scale-105 transition-transform shadow-sm">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-[11px] text-blue-200 uppercase tracking-wider font-bold">Admissions</p>
                  <p className="text-sm font-bold text-white leading-tight">Enroll New Learner</p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Primary KPI Stats Grid (2-cols on mobile for high density, 4-cols on lg) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div onClick={() => setShowStatsModal(true)} className="h-full">
            <StatsCard 
              title="Total Learners" 
              value={stats.totalStudents} 
              icon={Users} 
              badge="+2.5% vs term" 
              description="Active on register" 
              color="blue" 
            />
          </div>

          <div onClick={() => setShowTeacherModal(true)} className="h-full">
            <StatsCard 
              title="Teaching Staff" 
              value={stats.totalTeachers} 
              icon={GraduationCap} 
              badge="Full Attendance" 
              description="Active instructors" 
              color="emerald" 
            />
          </div>

          <Link href="/admin/classes" className="h-full block">
            <StatsCard 
              title="Class Cohorts" 
              value={stats.totalClasses} 
              icon={Building2} 
              badge="KG to Basic 9" 
              description="Active classrooms" 
              color="purple" 
            />
          </Link>

          <Link href="/admin/enrollments" className="h-full block">
            <StatsCard 
              title="Admissions" 
              value={stats.pendingAdmissions} 
              icon={FileText} 
              badge="Pending Review" 
              description="Processed admissions" 
              color="amber" 
            />
          </Link>
        </div>
        
        {/* Interactive Modals */}
        <StudentStatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />
        <TeacherStatsModal isOpen={showTeacherModal} onClose={() => setShowTeacherModal(false)} />

        {/* Main Dashboard Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Main Left Column (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">
            
            {/* Quick Actions Panel */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
                  <span>Administrative Operations</span>
                </h2>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">Frequent Tasks</span>
              </div>
              
              <div className="p-3.5 sm:p-5 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
                  <QuickActionLink 
                    title="Add Teacher" 
                    href="/admin/teachers/add" 
                    icon={GraduationCap}
                    iconColor="text-emerald-600 dark:text-emerald-400"
                    iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                  />
                  <QuickActionLink 
                    title="Enroll Learner" 
                    href="/admin/enrollments" 
                    icon={Users}
                    iconColor="text-[#003B5C] dark:text-blue-400"
                    iconBg="bg-blue-50 dark:bg-blue-950/40"
                  />
                  <QuickActionLink 
                    title="Class Groups" 
                    href="/admin/classes" 
                    icon={Building2}
                    iconColor="text-purple-600 dark:text-purple-400"
                    iconBg="bg-purple-50 dark:bg-purple-950/40"
                  />
                  <QuickActionLink 
                    title="Post Notice" 
                    href="/admin/news" 
                    icon={FileText}
                    iconColor="text-amber-600 dark:text-amber-400"
                    iconBg="bg-amber-50 dark:bg-amber-950/40"
                  />
                </div>
              </div>
            </section>

            {/* Recent Admissions Activity */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <div>
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-[#003B5C] dark:bg-blue-400 rounded-full" />
                    <span>Recent Student Registrations</span>
                  </h2>
                  <p className="text-[11px] text-slate-400 mt-0.5">Most recent learner admissions</p>
                </div>
                <Link 
                  href="/admin/students" 
                  className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="p-4 sm:p-6">
                <div className="divide-y divide-slate-100 dark:divide-slate-750">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((student: any) => (
                      <div key={student.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {student.first_name?.[0]}{student.last_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate">
                              Enrolled into <span className="font-semibold text-slate-600 dark:text-slate-300">{student.classes?.name || 'Unassigned'}</span>
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono shrink-0 whitespace-nowrap">
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

          {/* Right Column (1/3 width on desktop) */}
          <div className="space-y-6 sm:space-y-8 min-w-0">
            
            {/* Academic Session Progress Card */}
            <div className="bg-gradient-to-br from-[#003B5C] to-slate-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md border border-white/10 relative overflow-hidden space-y-4">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Activity className="w-24 h-24" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200/80">Academic Session Timeline</span>
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

                  <div className="flex justify-between items-center text-[11px] text-blue-200/80 font-mono pt-1">
                    <span>Started: {new Date(currentTerm.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span>Ends: {new Date(currentTerm.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-blue-200/80 py-2">No active academic term configured.</p>
              )}
            </div>

            {/* Upcoming School Events */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Scheduled Events</span>
                </h3>
                <Link href="/admin/events" className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline">
                  Calendar
                </Link>
              </div>

              <div className="p-4 sm:p-5">
                {upcomingEvents.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-750">
                    {upcomingEvents.map((event: any) => {
                      const eventDate = new Date(event.event_date)
                      const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                      const day = eventDate.getDate()
                      
                      return (
                        <div key={event.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-3">
                          <div className="w-11 h-11 bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex flex-col items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{month}</span>
                            <span className="text-sm font-black text-slate-900 dark:text-white leading-none">{day}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                              {event.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
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
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0" />
                  <span>House / Sections</span>
                </h3>
                <Link href="/admin/sections" className="text-xs font-bold text-[#003B5C] dark:text-blue-400 hover:underline">
                  Manage
                </Link>
              </div>

              <div className="p-4 sm:p-5">
                {sectionsWithCounts.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    <p className="font-semibold">No sections configured</p>
                    <Link href="/admin/sections" className="text-blue-600 hover:underline mt-1 inline-block">
                      Configure school houses
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sectionsWithCounts.map((section: any) => {
                      const sectionStudentCount = section.student_count || 0
                      const pct = totalSectionAssignments > 0 
                        ? Math.round((sectionStudentCount / totalSectionAssignments) * 100) 
                        : 0

                      return (
                        <Link
                          key={section.id}
                          href="/admin/sections"
                          className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition active:scale-[0.99] group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span
                              className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0 ring-2 ring-white dark:ring-slate-900"
                              style={{ backgroundColor: section.colour || '#8B5CF6' }}
                            />
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                                {section.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {sectionStudentCount} learners ({pct}%)
                              </span>
                            </div>
                          </div>

                          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all shrink-0" />
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
  icon: any
  badge?: string
  description: string
  color: 'blue' | 'emerald' | 'purple' | 'amber'
}

function StatsCard({ title, value, icon: Icon, badge, description, color }: StatsCardProps) {
  const colorStyles = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/40",
      text: "text-[#003B5C] dark:text-blue-400",
      border: "hover:border-[#003B5C]/40"
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "hover:border-emerald-500/40"
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-950/40",
      text: "text-purple-600 dark:text-purple-400",
      border: "hover:border-purple-500/40"
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/40",
      text: "text-amber-600 dark:text-amber-400",
      border: "hover:border-amber-500/40"
    }
  }[color]

  return (
    <div className={`h-full bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer active:scale-[0.98] ${colorStyles.border}`}>
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 truncate">
          {title}
        </span>
        <div className={`p-2 rounded-xl ${colorStyles.bg} ${colorStyles.text} shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className="space-y-1">
        {/* KPI Callout Metric */}
        <div className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
          {value}
        </div>
        <p className="text-[11px] text-slate-400 truncate flex items-center justify-between">
          <span>{description}</span>
          {badge && <span className="font-semibold text-emerald-600 dark:text-emerald-400 ml-1 hidden sm:inline">{badge}</span>}
        </p>
      </div>
    </div>
  )
}

interface QuickActionLinkProps {
  title: string
  href: string
  icon: any
  iconColor: string
  iconBg: string
}

function QuickActionLink({ title, href, icon: Icon, iconColor, iconBg }: QuickActionLinkProps) {
  return (
    <Link href={href} className="block group h-full">
      <div className="h-full p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-sm hover:border-[#003B5C]/30 transition-all duration-200 flex flex-col items-center justify-center text-center active:scale-[0.98]">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBg} ${iconColor} flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shrink-0`}>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-2xl sm:rounded-3xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-36 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-56 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}