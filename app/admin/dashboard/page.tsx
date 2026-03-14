'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, loading: contextLoading } = useAdmin()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeEnrollments: 0,
    pendingAdmissions: 0,
  })
  const [recentActivities, setRecentActivities] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [currentTerm, setCurrentTerm] = useState<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [showTeacherModal, setShowTeacherModal] = useState(false)

  useEffect(() => {
    if (contextLoading) return

    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    async function loadStats() {
      const [studentsRes, teachersRes, classesRes, eventsRes, termsRes, recentStudentsRes] = await Promise.all([
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
          .limit(5)
      ])

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        activeEnrollments: (studentsRes.count || 0),
        pendingAdmissions: 0, 
      })
      
      if (eventsRes.data) setUpcomingEvents(eventsRes.data)
      if (termsRes.data) setCurrentTerm(termsRes.data)
      if (recentStudentsRes.data) setRecentActivities(recentStudentsRes.data)
      
      setLoading(false)
    }

    loadStats()
  }, [user, contextLoading, router, supabase])

  if (contextLoading || loading) {
    return <DashboardSkeleton />
  }

  // Calculate term progress
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
        
        <PageHeader 
          title="Dashboard Overview" 
          description="Welcome back, here's what's happening at your school today."
        >
           <Link 
             href="/admin/students/add" 
             className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2 text-sm font-medium shadow-sm"
           >
             <Plus className="h-4 w-4" />
             <span>New Student</span>
           </Link>
        </PageHeader>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div onClick={() => setShowStatsModal(true)} className="cursor-pointer transition-transform hover:scale-105">
            <StatsCard 
              title="Total Students" 
              value={stats.totalStudents} 
              icon={Users} 
              trend="+2.5% from last term"
              description="Active Records"
            />
          </div>
          <div onClick={() => setShowTeacherModal(true)} className="cursor-pointer transition-transform hover:scale-105">
            <StatsCard 
              title="Active Teachers" 
              value={stats.totalTeachers} 
              icon={GraduationCap} 
              trend="All staff present"
              description="Teaching Staff"
            />
          </div>
          <StatsCard 
            title="Active Classes" 
            value={stats.totalClasses} 
            icon={Building2} 
            trend="KG to JHS 3"
            description="Classrooms"
          />
          <StatsCard 
            title="Admissions" 
            value={stats.pendingAdmissions} 
            icon={FileText} 
            trend="Requires action"
            description="Pending Review"
          />
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
            <Card>
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
                     recentActivities.map((student) => (
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
                    upcomingEvents.map((event) => {
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

function StatsCard({ title, value, icon: Icon, trend, description }: any) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground text-gray-500 dark:text-gray-400">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground text-gray-400" />
        </div>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground text-gray-500 dark:text-gray-400">
            {description} <span className="text-green-600 dark:text-green-400 ml-1 font-medium">({trend})</span>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function QuickActionLink({ title, href, icon: Icon }: any) {
  return (
    <Link href={href}>
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer h-full border-dashed hover:border-solid">
        <div className="p-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-full">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</span>
        </div>
      </div>
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
