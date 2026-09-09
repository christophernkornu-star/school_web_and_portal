'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
const PerformanceChart = dynamic(() => import('@/components/PerformanceChart'), {
  ssr: false,
  loading: () => <div className="h-[280px] sm:h-[320px] w-full flex items-center justify-center bg-gray-50/80 dark:bg-slate-800/50 animate-pulse rounded-2xl sm:rounded-3xl" />
})
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, 
  FileText, 
  BarChart3, 
  BookOpen, 
  Calendar, 
  AlertCircle, 
  CheckCircle2, 
  ClipboardList,
  Clock,
  Bell,
  TrendingUp,
  ArrowRight,
  GraduationCap
} from 'lucide-react'
import { useTeacher } from '@/components/providers/TeacherContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip-custom'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTermOrderParts } from '@/lib/academic-utils'
import { resolveActiveAcademicYear, filterTermsByActiveYear } from '@/lib/academic-year'
import { StudentStatsModal } from '@/components/admin/StudentStatsModal'
import { TeacherClassesModal } from '@/components/teacher/TeacherClassesModal'
import { differenceInDays } from 'date-fns'

export default function TeacherDashboard() {
  const router = useRouter()
  
  const { user, teacher, loading: contextLoading, dashboardData, fetchDashboardData } = useTeacher()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [greeting, setGreeting] = useState('')
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [announcementsLoading, setAnnouncementsLoading] = useState(true)
  const [isStatsOpen, setIsStatsOpen] = useState(false)
  const [isClassesModalOpen, setIsClassesModalOpen] = useState(false)

  // System alert states
  const [termProgress, setTermProgress] = useState(0)
  const [alertThreshold, setAlertThreshold] = useState(90)
  const [isClassTeacher, setIsClassTeacher] = useState(false)

  // Performance Chart Data State
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [performanceLoading, setPerformanceLoading] = useState(true)

  // Load Performance Data
  useEffect(() => {
    async function loadPerformanceStats() {
      if (!dashboardData?.assignments || !teacher?.teacher_id) return

      setPerformanceLoading(true)
      const supabase = getSupabaseBrowserClient()

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_teacher_performance_overview', {
          p_teacher_id: teacher.teacher_id
        })

        if (!rpcError && rpcData && rpcData.length > 0) {
          const sortedRpc = [...rpcData].sort((a: any, b: any) => {
            const [ya, ta] = getTermOrderParts(a.term_name, a.term_name)
            const [yb, tb] = getTermOrderParts(b.term_name, b.term_name)
            if (ya !== yb) return ya - yb
            if (ta !== tb) return ta - tb
            return 0
          })

          const chartData = sortedRpc.map((d: any) => ({
            termName: d.term_name,
            score: Math.round(d.average_score),
            maxScore: Math.round(d.max_score || 0)
          }))
          setPerformanceData(chartData)
          setPerformanceLoading(false)
          return
        }
      } catch (err) {
        console.error("Error attempting optimized query:", err)
      }

      // Fallback Manual Waterfall
      try {
        const classIds = dashboardData.assignments.map((a: any) => a.class_id).filter(Boolean)
        if (classIds.length === 0) {
          setPerformanceData([])
          setPerformanceLoading(false)
          return
        }

        const activeYear = await resolveActiveAcademicYear(supabase)
        const { data: allTerms, error: termsError } = await supabase
          .from('academic_terms')
          .select('id, name, academic_year, start_date')
          .order('start_date', { ascending: false })
          
        if (termsError || !allTerms || allTerms.length === 0) {
          setPerformanceLoading(false)
          return
        }
        const activeTerms = filterTermsByActiveYear(allTerms, activeYear)

        const sortedTerms = [...activeTerms].sort((a: any, b: any) => {
          const [ya, ta] = getTermOrderParts(a.name, a.academic_year)
          const [yb, tb] = getTermOrderParts(b.name, b.academic_year)
          if (ya !== yb) return ya - yb
          if (ta !== tb) return ta - tb
          return 0
        })
        const termIds = sortedTerms.map((t: any) => t.id)

        const validClassIds = classIds.filter((id: string) => 
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
        )

        if (validClassIds.length === 0) { 
          setPerformanceLoading(false)
          return
        }

        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id')
          .in('class_id', validClassIds)
          .eq('status', 'active')
          
        if (studentsError) {
          setPerformanceLoading(false)
          return
        }

        const studentIds = students?.map((s: any) => s.id) || []
        if (studentIds.length === 0) {
          setPerformanceLoading(false)
          return
        }

        const { data: scores, error: scoresError } = await supabase
          .from('scores')
          .select('total, term_id')
          .in('term_id', termIds)
          .in('student_id', studentIds)
          
        if (scoresError || !scores) {
          setPerformanceLoading(false)
          return
        }

        const chartData = sortedTerms.map((term: any) => {
          const termScores = scores
            .filter((s: any) => s.term_id === term.id)
            .map((s: any) => s.total || 0)
              
          const fullName = `${term.name} (${term.academic_year})`

          if (termScores.length === 0) {
            return { termName: fullName, score: 0, maxScore: 0 }
          }

          const avg = termScores.reduce((a: number, b: number) => a + b, 0) / termScores.length
          const max = Math.max(...termScores)

          return {
            termName: fullName,
            score: Math.round(avg),
            maxScore: Math.round(max)
          }
        })

        setPerformanceData(chartData)
      } catch (fallbackError) {
        console.error("Fallback aggregation failed:", fallbackError)
      } finally {
        setPerformanceLoading(false)
      }
    }

    if (!contextLoading && dashboardData && teacher) {
      loadPerformanceStats()
    }
  }, [contextLoading, dashboardData, teacher])

  // Update time and greeting
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    
    const updateGreeting = () => {
      const hour = new Date().getHours()
      if (hour < 12) setGreeting('Good Morning')
      else if (hour < 18) setGreeting('Good Afternoon')
      else setGreeting('Good Evening')
    }
    
    updateGreeting()
    return () => clearInterval(timer)
  }, [])

  // Load Announcements
  useEffect(() => {
    const loadAnnouncements = async () => {
      const supabase = getSupabaseBrowserClient()
      try {
        const { data } = await supabase
          .from('announcements')
          .select('*')
          .eq('published', true)
          .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
          .order('created_at', { ascending: false })
          .limit(5)
        
        if (data) setAnnouncements(data)
      } catch (err) {
        console.error("Failed to load announcements", err)
      } finally {
        setAnnouncementsLoading(false)
      }
    }
    
    loadAnnouncements()
  }, [])

  useEffect(() => {
    async function fetchTermProgress() {
      const supabase = getSupabaseBrowserClient()
      const [termRes, thresholdRes] = await Promise.all([
        supabase.from('academic_terms').select('*').eq('is_current', true).single(),
        supabase.from('system_settings').select('setting_value').eq('setting_key', 'progress_alert_threshold').maybeSingle()
      ])

      if (termRes.data) {
        const start = new Date(termRes.data.start_date)
        const end = new Date(termRes.data.end_date)
        const now = new Date()
        const totalDays = differenceInDays(end, start)
        const daysPassed = differenceInDays(now, start)
        const progress = Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100)
        setTermProgress(progress)
      }
      
      if (thresholdRes.data?.setting_value) {
        setAlertThreshold(Number(thresholdRes.data.setting_value))
      }
    }
    fetchTermProgress()
  }, [])

  useEffect(() => {
    if (dashboardData?.assignments) {
      setIsClassTeacher(dashboardData.assignments.some(a => a.is_class_teacher))
    }
  }, [dashboardData])

  useEffect(() => {
    if (contextLoading) return

    if (!user) {
      router.push('/login?portal=teacher')
      return
    }

    if (!teacher) {
      setError('Teacher profile not found. Please contact the administrator.')
      setLoading(false)
      return
    }

    if (dashboardData) {
      setLoading(false)
      if (Date.now() - dashboardData.lastFetched > 60 * 1000) {
        fetchDashboardData()
      }
    } else {
      fetchDashboardData().then(() => setLoading(false))
    }
  }, [user, teacher, contextLoading, dashboardData, fetchDashboardData, router])

  if (loading) return <DashboardSkeleton />

  if (error || !teacher) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-8 bg-slate-50 dark:bg-slate-900 min-h-screen">
        <Card className="max-w-md w-full border-rose-100 dark:border-rose-900/30 rounded-3xl shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-rose-100 dark:bg-rose-900/30 p-3 rounded-2xl w-fit mb-2">
              <AlertCircle className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            </div>
            <CardTitle className="text-lg font-bold">Access Restricted</CardTitle>
            <CardDescription className="text-xs">{error || 'Teacher profile not found.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <Button onClick={() => window.location.reload()} className="bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs font-bold">
              Retry Connection
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const studentCount = dashboardData?.stats?.studentCount || 0
  const attendanceRate = dashboardData?.stats?.attendanceRate || '0%'
  const currentTerm = dashboardData?.currentTerm || 'Term 1'
  
  const assignedClasses = dashboardData?.assignments?.map((a: any) => a.classes?.name || a.classes?.class_name).filter(Boolean) || []
  let classDisplayStr = 'No Classes'
  let classTooltipStr = ''
  
  if (assignedClasses.length === 1) {
    classDisplayStr = assignedClasses[0]
    classTooltipStr = assignedClasses[0]
  } else if (assignedClasses.length > 1) {
    classDisplayStr = `${assignedClasses.length} Cohorts`
    classTooltipStr = assignedClasses.join(', ')
  }

  const subjectsTaughtList = Array.from(new Set(
    (dashboardData?.assignments || []).reduce((acc: string[], curr: any) => {
      const subjects = (curr.subjects || []).map((s: any) => 
        typeof s === 'string' ? s : (s.subject_name || s.name || '')
      ).filter(Boolean)
      return [...acc, ...subjects]
    }, []) as string[]
  ))

  const getPriorityBadge = (priority: string) => {
    switch(priority?.toLowerCase()) {
      case 'urgent': 
        return 'text-rose-700 bg-rose-50 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40'
      case 'high': 
        return 'text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40'
      default: 
        return 'text-[#003B5C] bg-blue-50 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40'
    }
  }

  const honorific = teacher.gender === 'Male' ? 'Sir ' : teacher.gender === 'Female' ? 'Madam ' : ''

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
                  {greeting}, {honorific}{teacher.first_name}
                </h1>
                <p className="text-blue-200/90 text-xs sm:text-sm md:text-base flex items-center gap-2 font-medium flex-wrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  Ready to manage attendance, lesson scores, and class records?
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
                  <span>{currentTerm}</span>
                </span>
              </div>
            </div>

            {/* Attendance KPI Widget */}
            <div className="w-full md:w-auto shrink-0">
              <div className="bg-white/10 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-white/15 shadow-inner flex md:flex-col justify-between items-center md:items-start gap-2">
                <span className="text-xs text-blue-200/90 font-semibold uppercase tracking-wider">
                  Weekly Attendance
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-tight">
                    {attendanceRate}
                  </span>
                  <span className="text-[11px] text-emerald-300 font-bold flex items-center">
                    <TrendingUp className="w-3 h-3 mr-0.5" /> On Track
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full" />
              <span>Core Teacher Operations</span>
            </h2>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">Daily Workflow Shortcuts</span>
          </div>
          
          <div className="p-3.5 sm:p-5 md:p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              <QuickActionCard 
                href="/teacher/attendance"
                title="Mark Attendance" 
                description="Daily roll call tracking"
                icon={CheckCircle2} 
                iconColor="text-emerald-600 dark:text-emerald-400"
                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
              />
              <QuickActionCard 
                href="/teacher/manage-scores"
                title="Manage Scores" 
                description="Continuous tasks & exams"
                icon={ClipboardList} 
                iconColor="text-[#003B5C] dark:text-blue-400"
                iconBg="bg-blue-50 dark:bg-blue-950/40"
              />
              <QuickActionCard 
                href="/teacher/assessments"
                title="Online Assessment" 
                description="Create quizzes & homework"
                icon={FileText} 
                iconColor="text-purple-600 dark:text-purple-400"
                iconBg="bg-purple-50 dark:bg-purple-950/40"
              />
              <QuickActionCard 
                href="/teacher/reports"
                title="Class Reports" 
                description="Report cards & broadsheets"
                icon={BarChart3} 
                iconColor="text-amber-600 dark:text-amber-400"
                iconBg="bg-amber-50 dark:bg-amber-950/40"
              />
            </div>
          </div>
        </section>
        
        {/* Main Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Main Column (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8 min-w-0">
            
            {/* Quick Cohort & Student Counters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div 
                onClick={() => setIsClassesModalOpen(true)}
                className="cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-[#003B5C]/40 dark:hover:border-blue-500/40 transition-all duration-200 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-[#003B5C] dark:text-blue-400 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                    <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Assigned Cohorts
                    </span>
                    <Tooltip content={assignedClasses.length > 0 ? assignedClasses.join(', ') : 'No cohorts assigned'}>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                        {assignedClasses.length} {assignedClasses.length === 1 ? 'Class' : 'Classes'}
                      </h3>
                    </Tooltip>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <TeacherClassesModal 
                isOpen={isClassesModalOpen}
                onClose={() => setIsClassesModalOpen(false)}
                assignments={dashboardData?.assignments || []} 
              />

              <div 
                onClick={() => setIsStatsOpen(true)} 
                className="cursor-pointer bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md hover:border-amber-400/40 transition-all duration-200 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block">
                      Total Learners
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white truncate">
                      {studentCount} Students
                    </h3>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-amber-600 transition-colors shrink-0">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>

              <StudentStatsModal 
                isOpen={isStatsOpen} 
                onClose={() => setIsStatsOpen(false)} 
                classIds={dashboardData?.assignments?.map((a: any) => a.class_id).filter(Boolean) || []} 
              />
            </div>

            {/* Performance Analysis Chart Card */}
            <div className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <PerformanceChart 
                data={performanceData}
                title="Class Academic Trend Across Terms"
                lineColor="#003B5C" 
                showMaxScore={true}
                primaryLineName="Class Average"
                secondaryLineName="Max Mark Target"
              />
            </div>
          </div>

          {/* Sidebar Info Column (1/3 width on desktop) */}
          <div className="space-y-6 sm:space-y-8 min-w-0">
            
            {/* Notice Board */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden flex flex-col justify-between">
              <div>
                <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-100 dark:border-slate-700/80 flex items-center justify-between">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>School Notice Board</span>
                  </h3>
                  <Link 
                    href="/teacher/announcements" 
                    className="text-xs font-bold text-[#003B5C] dark:text-blue-300 hover:underline"
                  >
                    View All
                  </Link>
                </div>

                <div className="p-4 sm:p-5">
                  {announcementsLoading ? (
                    <div className="space-y-3">
                      <Skeleton className="h-16 w-full rounded-2xl" />
                      <Skeleton className="h-16 w-full rounded-2xl" />
                    </div>
                  ) : announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-center space-y-2">
                      <Bell className="w-8 h-8 opacity-25" />
                      <p className="text-xs font-medium">No active announcements</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-750">
                      {announcements.map((announcement) => (
                        <div key={announcement.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getPriorityBadge(announcement.priority)}`}>
                              {announcement.priority || 'Notice'}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400 font-mono">
                              {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">
                            {announcement.title}
                          </h4>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                            {announcement.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Profile & Academic Specialization Summary Card */}
            <section className="bg-white dark:bg-slate-800/80 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200/80 dark:border-slate-700/80 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-750 flex items-center gap-3 bg-slate-50/60 dark:bg-slate-900/60">
                <div className="w-11 h-11 rounded-2xl bg-[#003B5C] text-amber-400 flex items-center justify-center font-black text-sm shadow-sm ring-1 ring-white/20 shrink-0">
                  {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {teacher.first_name} {teacher.last_name}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 truncate">
                    Staff ID: {teacher.teacher_id}
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-750 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Assigned Cohort
                    </span>
                    <Tooltip content={classTooltipStr}>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block cursor-help">
                        {classDisplayStr}
                      </span>
                    </Tooltip>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-750 flex flex-col justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Specialization
                    </span>
                    <Tooltip content={teacher.specialization || 'General Basic Education'}>
                      <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate block cursor-help">
                        {teacher.specialization || 'General'}
                      </span>
                    </Tooltip>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-750 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Assigned Teaching Subjects
                  </span>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
                    {subjectsTaughtList.length > 0 ? (
                      subjectsTaughtList.join(', ')
                    ) : (
                      <span className="text-slate-400 italic font-normal">None specifically linked</span>
                    )}
                  </p>
                </div>

                <Link
                  href="/teacher/settings"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl text-xs font-bold text-[#003B5C] dark:text-blue-300 bg-[#003B5C]/5 hover:bg-[#003B5C]/10 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 transition active:scale-95"
                >
                  <span>Update Account & Credentials</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

interface QuickActionCardProps {
  href: string
  title: string
  description: string
  icon: any
  iconColor: string
  iconBg: string
}

function QuickActionCard({ 
  href, 
  title, 
  description, 
  icon: Icon, 
  iconColor, 
  iconBg
}: QuickActionCardProps) {
  return (
    <Link href={href} className="block group h-full">
      <div className="h-full p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-750 bg-white dark:bg-slate-800/90 shadow-xs hover:shadow-md hover:border-[#003B5C]/30 dark:hover:border-blue-500/30 transition-all duration-200 flex flex-col justify-between active:scale-[0.98]">
        <div>
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-105 transition-transform duration-200`}>
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-[#003B5C] dark:group-hover:text-blue-400 transition-colors">
            {title}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">
            {description}
          </p>
        </div>
        
        <div className="pt-2 mt-2 flex items-center text-[10px] sm:text-xs font-bold text-[#003B5C] dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Open</span>
          <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Skeleton className="h-44 w-full rounded-3xl" />
      <Skeleton className="h-36 w-full rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
          <Skeleton className="h-80 w-full rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    </div>
  )
}