'use client'

import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'

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
  Activity
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDistanceToNow, differenceInDays } from 'date-fns'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StudentStatsModal } from '@/components/admin/StudentStatsModal'        
import { TeacherStatsModal } from '@/components/admin/TeacherStatsModal'        

const fetchDashboardStats = async () => {
  const supabase = getSupabaseBrowserClient()
  const [studentsRes, teachersRes, classesRes, eventsRes, termsRes, recentStudentsRes, thresholdRes] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }), 
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
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'progress_alert_threshold')
      .maybeSingle()
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
    alertThreshold: thresholdRes.data?.setting_value ? Number(thresholdRes.data.setting_value) : 90
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, loading: contextLoading } = useAdmin()
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)

  useEffect(() => {
    if (!contextLoading && !user) {
      router.push('/login?portal=admin')
    }
  }, [user, contextLoading, router])

  // SWR handles caching, deduplication, and automatic refetching on focus without stalling UI
  const { data, error, isLoading } = useSWR(
    user && !contextLoading ? 'adminDashboardStats' : null, 
    fetchDashboardStats,
    { revalidateOnFocus: false, dedupingInterval: 60000 } // only refetch in bg max once per minute
  )

  if (contextLoading || isLoading || !data) {
    return <DashboardSkeleton />
  }

  const { stats, upcomingEvents, currentTerm, recentActivities, alertThreshold } = data
  const currentTime = new Date();
  const hour = currentTime.getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 18) greeting = 'Good afternoon';
  let termProgress = 0
  if (currentTerm) {
    const start = new Date(currentTerm.start_date)
    const end = new Date(currentTerm.end_date)
    const now = new Date()
    const totalDays = differenceInDays(end, start)
    const daysPassed = differenceInDays(now, start)
    termProgress = Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100)
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl overflow-hidden bg-gradient-to-r from-methodist-blue to-blue-900 text-white shadow-xl mt-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-methodist-gold/20 blur-3xl"></div>
          
          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 break-words">
                    {greeting}, Admin
                  </h1>
                  <p className="text-blue-200 text-lg flex items-center gap-2 flex-wrap">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
                    Manage school operations, staff, and student progress.
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 px-3 py-1">
                    <Calendar className="w-3 h-3 mr-2" />
                    {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 hover:bg-white/20 text-white border-0 px-3 py-1">
                    <Clock className="w-3 h-3 mr-2" />
                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </Badge>
                  <Badge variant="secondary" className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-100 border-0 px-3 py-1">
                    {currentTerm ? currentTerm.term_name || 'Current Term' : 'Term Running'}
                  </Badge>
                </div>
              </div>

              <div className="hidden md:block">
                 <Link 
                   href="/admin/students/add" 
                   className="backdrop-blur-md bg-white/10 p-4 rounded-xl border border-white/10 shadow-inner flex items-center gap-3 hover:bg-white/20 transition-all group"
                 >
                    <div className="bg-white text-blue-900 rounded-full p-2 group-hover:scale-110 transition-transform">
                      <Plus className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                       <p className="text-sm text-blue-200 font-medium">Quick Action</p>
                       <p className="text-lg font-bold text-white leading-tight">Enroll Student</p>
                    </div>
                 </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => setShowStatsModal(true)} className="cursor-pointer transition-transform hover:scale-105">
            <StatsCard title="Total Enrolled" value={stats.totalStudents} icon={Users} trend="+2.5% vs last term" description="Active Students" color="blue" />
          </div>
          <div onClick={() => setShowTeacherModal(true)} className="cursor-pointer transition-transform hover:scale-105">
            <StatsCard 
              title="Active Teachers" 
              value={stats.totalTeachers} 
              icon={GraduationCap} 
              trend="All staff present"
              description="Teaching Staff"
             color="emerald" />
          </div>
          <StatsCard title="Active Classes" value={stats.totalClasses} icon={Building2} trend="From KG to JHS 3" description="Classrooms" color="purple" />
          <StatsCard 
            title="Admissions" 
            value={stats.pendingAdmissions} 
            icon={FileText} 
            trend="Requires action"
            description="Pending Review"
           color="amber" />
        </div>
        
        {/* Student Stats Modal */}
        <StudentStatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} />
        {/* Teacher Stats Modal */}
        <TeacherStatsModal isOpen={showTeacherModal} onClose={() => setShowTeacherModal(false)} />

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Main) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick Actions Panel */}
            <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks used daily</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <QuickActionLink title="Add Teacher" href="/admin/teachers/add" icon={GraduationCap} />
                  <QuickActionLink title="Enroll Student" href="/admin/enrollments" icon={Users} />
                  <QuickActionLink title="Create Class" href="/admin/classes" icon={Building2} />
                  <QuickActionLink title="Post News" href="/admin/news" icon={FileText} />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                 <div className="space-y-1">
                   <CardTitle>Recent Activity</CardTitle>
                   <CardDescription>Latest student admissions</CardDescription>
                 </div>
                 <Link href="/admin/students" className="text-sm font-medium text-blue-600 hover:text-blue-500 hover:underline">View All</Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                   {recentActivities.length > 0 ? (
                     recentActivities.map((student: any) => (
                       <div key={student.id} className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                          <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                             <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="space-y-1">
                             <p className="text-sm font-medium leading-none">
                                <span className="font-semibold text-gray-900 dark:text-white">{student.first_name} {student.last_name}</span>
                             </p>
                             <p className="text-sm text-muted-foreground text-gray-500 dark:text-gray-400">
                                Added to {student.classes?.name || 'Class N/A'}
                             </p>
                             <p className="text-xs text-gray-400 dark:text-gray-500">
                               {formatDistanceToNow(new Date(student.created_at), { addSuffix: true })}
                             </p>
                          </div>
                       </div>
                     ))
                   ) : (
                     <div className="py-8 text-center text-gray-500">No recent activity found</div>
                   )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Side) */}
          <div className="lg:col-span-1 space-y-6">
             {/* System Health / Info */}
             <div className="rounded-lg border bg-card text-card-foreground shadow-sm bg-gradient-to-br from-blue-900 to-blue-800 border-none text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity className="w-24 h-24" />
                </div>
                <div className="flex flex-col space-y-1.5 p-6">
                   <h3 className="font-semibold leading-none tracking-tight text-blue-100 text-2xl">Academic Term</h3>
                </div>
                <div className="p-6 pt-0">
                  {currentTerm ? (
                    <div className="space-y-4">
                      <p className="text-lg font-bold text-white relative z-10">{currentTerm.name}</p>
                      <div className="space-y-2">
                        <div className="w-full bg-blue-950/50 rounded-full h-2.5">
                           <div 
                              className="bg-yellow-400 h-2.5 rounded-full transition-all duration-1000" 
                              style={{ width: `${termProgress}%` }}
                           />
                        </div>
                        <div className="flex justify-between text-xs text-blue-200 font-medium">
                          <span>Started {new Date(currentTerm.start_date).toLocaleDateString()}</span>
                          <span>{termProgress}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                     <div className="py-4 text-sm text-blue-200">No active term configured</div>
                  )}
                </div>
             </div>

             {/* Upcoming Events Mini */}
             <Card>
               <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-red-600" />
                    Upcoming Events
                  </CardTitle>
               </CardHeader>
               <CardContent className="space-y-4">
                  {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event: any) => {
                      const eventDate = new Date(event.event_date)
                      const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase()
                      const day = eventDate.getDate()
                      
                      return (
                        <div key={event.id} className="flex gap-3 items-center">
                          <div className="w-12 text-center bg-gray-100 dark:bg-gray-800 rounded-lg py-1 border border-gray-200 dark:border-gray-700">
                              <span className="block text-[10px] font-bold text-gray-500 dark:text-gray-400">{month}</span>
                              <span className="block text-lg font-bold text-gray-900 dark:text-gray-100">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{event.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{event.location || event.event_type}</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-sm text-gray-500 italic text-center py-4">No upcoming events</div>
                  )}
                  
                  <Link href="/admin/events" className="w-full mt-4 block text-center text-sm text-blue-600 hover:text-blue-700 font-medium border-t border-gray-100 dark:border-gray-800 pt-3">
                    View Full Calendar
                  </Link>
               </CardContent>
             </Card>
          </div>

        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, trend, description, color = "default" }: any) {
  const iconColors: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    default: "bg-gray-50 text-gray-600 border-gray-100"
  }
  const colorClass = iconColors[color] || iconColors.default;

  return (
    <Card className={`h-full transition-all duration-300 hover:shadow-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl border-t border-l border-r border-b-[3px] rounded-3xl hover:-translate-y-1 ${colorClass.split(' ')[2]}`}>
      <CardContent className="p-6 flex items-start space-x-4 h-full">
        <div className={`p-3 rounded-full ${colorClass.split(' ').slice(0,2).join(' ')}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex flex-col flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {description} {trend && <span className="text-green-600 dark:text-green-400 font-medium ml-1">{trend}</span>}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionLink({ title, href, icon: Icon }: any) {
  return (
    <Link href={href} className="block group h-full">
      <Card className="h-full transition-all duration-300 hover:shadow-lg border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl hover:-translate-y-1">
        <CardContent className="p-6 flex flex-col items-center text-center h-full justify-center">
          <div className="p-4 rounded-xl bg-blue-50 text-blue-600 mb-4 group-hover:scale-110 transition-transform duration-300">
            <Icon className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
        </CardContent>
      </Card>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <Skeleton className="lg:col-span-2 h-96 rounded-xl" />
         <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  )
}

