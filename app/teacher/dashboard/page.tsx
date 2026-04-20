'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
const PerformanceChart = dynamic(() => import('@/components/PerformanceChart'), {
  ssr: false,
  loading: () => <div className="h-[300px] w-full flex items-center justify-center bg-gray-50 animate-pulse rounded-xl" />
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
  CheckCircle, 
  ClipboardList,
  Clock,
  Bell,
  TrendingUp,
  LayoutDashboard,
  Activity
} from 'lucide-react'
import { useTeacher } from '@/components/providers/TeacherContext'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip-custom'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { StudentStatsModal } from '@/components/admin/StudentStatsModal'
import { TeacherClassesModal } from '@/components/teacher/TeacherClassesModal'
import { differenceInDays } from 'date-fns'

export default function TeacherDashboard() {
  const router = useRouter() // Re-added router
  
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
       if (!dashboardData?.assignments || !teacher?.teacher_id) return;

       setPerformanceLoading(true);
       const supabase = getSupabaseBrowserClient();

       try {
           // 1. Try Optimized RPC Call first
           const { data: rpcData, error: rpcError } = await supabase.rpc('get_teacher_performance_overview', {
               p_teacher_id: teacher.teacher_id
           });

           if (!rpcError && rpcData && rpcData.length > 0) {
               // Map RPC data to chart format
               const chartData = rpcData.map((d: any) => ({
                   termName: d.term_name,
                   score: Math.round(d.average_score),
                   maxScore: Math.round(d.max_score || 0)
               }));
               setPerformanceData(chartData);
               setPerformanceLoading(false);
               return; // Exit if RPC succeeded
           } else if (rpcError) {
               console.warn("RPC Optimization failed/not found, falling back to manual aggregation:", rpcError.message);
               // Continue to fallback...
           } else if (rpcData && rpcData.length === 0) {
              // RPC returned empty, maybe no data. Fallback might find same, but let's try just in case logic differs.
              // Actually if RPC returns empty, it means no data found.
              console.log("RPC returned no data, checking fallback manually just in case...");
           }

       } catch (err) {
           console.error("Error attempting optimized query:", err);
       }

       // --- FALBACK: Manual Waterfall (Existing Logic) ---

       try {
            // 1. Get Teacher's Class IDs
            const classIds = dashboardData.assignments.map((a: any) => a.class_id).filter(Boolean);
            if (classIds.length === 0) {
                setPerformanceData([]);
                setPerformanceLoading(false);
                return;
            }

            // 2. Fetch Last 4 Terms
            const { data: terms, error: termsError } = await supabase
                .from('academic_terms')
                .select('id, name, academic_year, start_date')
                .order('start_date', { ascending: false }) // Most recent first
                .limit(4);
                
            if (termsError || !terms || terms.length === 0) {
                console.error("Error fetching terms or no terms found:", termsError);
                setPerformanceLoading(false);
                return;
            }
            
            // Reverse to chronological order for chart (Oldest -> Newest)
            const sortedTerms = [...terms].reverse();
            const termIds = sortedTerms.map((t: any) => t.id);

            // 3. Fetch Student IDs in Classes
            // Validate UUIDs to prevent "operator does not exist" errors
            const validClassIds = classIds.filter((id: string) => 
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
            );

            if (validClassIds.length === 0) { 
                setPerformanceLoading(false);
                return;
            }

            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id')
                .in('class_id', validClassIds) // Use validated IDs
                .eq('status', 'active');
                
            if (studentsError) {
                console.error("Error fetching students:", studentsError);
                setPerformanceLoading(false);
                return;
            }

            const studentIds = students?.map((s: any) => s.id) || [];
            if (studentIds.length === 0) {
                setPerformanceLoading(false);
                return;
            }

            // 4. Fetch Scores
            const { data: scores, error: scoresError } = await supabase
                .from('scores')
                .select('total, term_id')
                .in('term_id', termIds)
                .in('student_id', studentIds);
                
            if (scoresError) {
                console.error("Error fetching scores:", scoresError);
                setPerformanceLoading(false);
                return;
            }

            if (!scores) {
                setPerformanceLoading(false);
                return;
            }

            // 5. Aggregate Data per Term
            const chartData = sortedTerms.map((term: any) => {
                const termScores = scores
                    .filter((s: any) => s.term_id === term.id)
                    .map((s: any) => s.total || 0);
                    
                    const fullName = `${term.name} (${term.academic_year})`;

                    if (termScores.length === 0) {
                        return { termName: fullName, score: 0, maxScore: 0 };
                    }

                    const avg = termScores.reduce((a: number, b: number) => a + b, 0) / termScores.length;
                    const max = Math.max(...termScores);

                    return {
                        termName: fullName,
                        score: Math.round(avg),
                        maxScore: Math.round(max)
                    };
                });

            setPerformanceData(chartData);

       } catch (fallbackError) {
           console.error("Fallback aggregation failed:", fallbackError);
       } finally {
            setPerformanceLoading(false);
       }
    }

    if (!contextLoading && dashboardData && teacher) {
        loadPerformanceStats();
    }
  }, [contextLoading, dashboardData, teacher]);

  // Update time and greeting
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    
    // Initial set
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
            .order('priority', { ascending: false }) // orders based on text unfortunately if not enum, but usually works if urgent/high/normal
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
      <div className="h-full flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <Card className="max-w-md w-full border-red-100 dark:border-red-900/30">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-red-100 dark:bg-red-900/20 p-3 rounded-full w-fit mb-2">
               <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Access Error</CardTitle>
            <CardDescription>{error || 'Teacher profile not found.'}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => window.location.reload()}>Retry Connection</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const assignmentsCount = dashboardData?.assignments?.length || 0
  const studentCount = dashboardData?.stats?.studentCount || 0
  const attendanceRate = dashboardData?.stats?.attendanceRate || '0%'
  const currentTerm = dashboardData?.currentTerm || 'Term 1'
  
  // Logic for displaying classes
  const assignedClasses = dashboardData?.assignments?.map((a: any) => a.classes?.class_name).filter(Boolean) || []
  let classDisplayStr = 'No Classes'
  let classTooltipStr = ''
  
  if (assignedClasses.length === 1) {
    classDisplayStr = assignedClasses[0]
    classTooltipStr = assignedClasses[0]
  } else if (assignedClasses.length > 1) {
    classDisplayStr = `${assignedClasses.length} Classes`
    classTooltipStr = assignedClasses.join(', ')
  }

  // Calculate unique subjects taught
  const subjectsTaughtList = Array.from(new Set(
    (dashboardData?.assignments || []).reduce((acc: string[], curr: any) => {
        // Handle subjects as objects (new RPC format) or strings (legacy)
        const subjects = (curr.subjects || []).map((s: any) => 
            typeof s === 'string' ? s : (s.subject_name || s.name || '')
        ).filter(Boolean);
        return [...acc, ...subjects];
    }, []) as string[]
  ));

  const getPriorityColor = (priority: string) => {
      switch(priority?.toLowerCase()) {
          case 'urgent': return 'text-red-500 bg-red-50 dark:bg-red-900/20'
          case 'high': return 'text-methodist-gold bg-orange-50 dark:bg-orange-900/20'
          default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20'
      }
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl shadow-xl overflow-hidden bg-gradient-to-r from-methodist-blue to-blue-900 text-white shadow-xl mt-6">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-64 w-64 rounded-full bg-methodist-gold/20 blur-3xl"></div>
          
          <div className="relative z-10 p-8 md:p-10">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="space-y-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 break-words">
                    {greeting}, {(teacher.gender === 'Male' ? 'Sir ' : teacher.gender === 'Female' ? 'Madam ' : '')}{teacher.first_name}
                  </h1>
                  <p className="text-blue-200 text-lg flex items-center gap-2 flex-wrap">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0"></span>
                    Ready for another productive day?
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
                    {currentTerm}
                  </Badge>
                </div>
              </div>

              <div className="hidden md:block">
                 <div className="backdrop-blur-md bg-white/10 p-4 rounded-xl border border-white/10 shadow-inner">
                    <div className="text-sm text-blue-200 mb-1">Weekly Attendance</div>
                    <div className="text-3xl font-bold text-methodist-gold flex items-end gap-2">
                       {attendanceRate}
                       <span className="text-xs text-green-300 font-medium mb-1 flex items-center">
                         <TrendingUp className="w-3 h-3 mr-1" /> On Track
                       </span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2"><span className="w-1.5 h-6 bg-methodist-gold rounded-full"></span>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <QuickActionCard 
              href="/teacher/attendance"
              title="Mark Attendance" 
              description="Daily Roll Call"
              icon={CheckCircle} 
              color="text-methodist-blue"
              bg="bg-white/60 backdrop-blur-xl border border-white/20 rounded-2xl"
              borderColor="hover:border-methodist-blue/20 dark:hover:border-emerald-800"
            />
            <QuickActionCard 
              href="/teacher/manage-scores"
              title="Manage Scores" 
              description="Record Results"
              icon={ClipboardList} 
              color="text-methodist-blue dark:text-blue-400"
              bg="bg-blue-50 dark:bg-blue-900/20"
              borderColor="hover:border-blue-200 dark:hover:border-blue-800"
            />
            <QuickActionCard 
              href="/teacher/assessments"
              title="Online Assessment" 
              description="Manage Tests"
              icon={FileText} 
              color="text-purple-600 dark:text-purple-400"
              bg="bg-purple-50 dark:bg-purple-900/20"
              borderColor="hover:border-purple-200 dark:hover:border-purple-800"
            />
            <QuickActionCard 
              href="/teacher/reports"
              title="Reports" 
              description="View Progress"
              icon={BarChart3} 
              color="text-orange-600 dark:text-orange-400"
              bg="bg-orange-50 dark:bg-orange-900/20"
              borderColor="hover:border-orange-200 dark:hover:border-orange-800"
            />
            </div>
            </CardContent>
          </Card>
          
          {/* Dashboard Content Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            
            {/* Overview Stats */}
            <div className="grid sm:grid-cols-2 gap-4">
               <Card 
                 onClick={() => setIsClassesModalOpen(true)}
                 className="cursor-pointer transition-all duration-300 hover:shadow-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl border border-white/20 rounded-3xl hover:-translate-y-1"
               >
                 <CardContent className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-methodist-blue rounded-full ">
                       <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-sm font-medium text-muted-foreground">My Classes</p>
                       <Tooltip content={assignedClasses.length > 0 ? assignedClasses.join(', ') : 'No classes assigned'}>
                          <h3 className="text-2xl font-bold text-gray-900 dark:text-white decoration-dotted underline hover:text-methodist-blue hover:decoration-methodist-blue transition-colors inline-block">
                            {assignedClasses.length}
                          </h3>
                       </Tooltip>
                    </div>
                 </CardContent>
               </Card>
               <TeacherClassesModal 
                  isOpen={isClassesModalOpen}
                  onClose={() => setIsClassesModalOpen(false)}
                  assignments={dashboardData?.assignments || []} 
               />
               <Card 
                 onClick={() => setIsStatsOpen(true)} 
                 className="cursor-pointer transition-all duration-300 hover:shadow-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl border border-white/20 rounded-3xl hover:-translate-y-1"
               >
                 <CardContent className="p-6 flex items-center space-x-4">
                    <div className="p-3 bg-yellow-50 text-methodist-gold rounded-full ">
                       <Users className="w-6 h-6" />
                    </div>
                    <div>
                       <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                       <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{studentCount}</h3>
                    </div>
                 </CardContent>
               </Card>

               <StudentStatsModal 
                  isOpen={isStatsOpen} 
                  onClose={() => setIsStatsOpen(false)} 
                  classIds={dashboardData?.assignments?.map((a: any) => a.class_id).filter(Boolean) || []} 
               />
            </div>

            {/* Performance Analysis Chart */}
            <PerformanceChart 
              data={performanceData}
              title="Class Performance Overview"
              lineColor="#8b5cf6" 
              showMaxScore={true}
              primaryLineName="Class Average"
              secondaryLineName="Target"
              className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden"
            />

          </div>

          {/* Sidebar Column */}
          <div className="space-y-6 min-w-0">
            
            {/* Notices / Announcements */}
              <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
               <CardHeader className="pb-3 shrink-0 bg-gradient-to-r from-methodist-blue to-blue-800 text-white">
                 <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Bell className="w-4 h-4 text-methodist-gold" />
                      Notice Board
                    </CardTitle>
                      <Link href="/teacher/announcements" className="text-xs font-semibold text-methodist-blue bg-methodist-gold rounded-full px-3 py-1">
                      View All
                    </Link>
                 </div>
               </CardHeader>
                 <CardContent className="pt-4">
                   {announcementsLoading ? (
                    <div className="space-y-4">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                 ) : announcements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm text-center">
                        <Bell className="w-8 h-8 mb-2 opacity-20" />
                        <p>No new announcements</p>
                    </div>
                 ) : (
                    <div className="space-y-4 px-2">
                            {announcements.map((announcement) => (
                         <div key={announcement.id} className="pb-3 border-b border-gray-50 dark:border-gray-700/50 last:border-0 last:pb-0">
                           <div className="flex items-center justify-between mb-1">
                              <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full ${getPriorityColor(announcement.priority)}`}>
                                 {announcement.priority || 'Notice'}
                              </span>
                              <span className="text-[11px] font-semibold text-methodist-gold bg-methodist-blue/5 px-2 py-0.5 rounded-md">
                                 {new Date(announcement.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                              </span>
                           </div>
                           <h4 className="text-[15px] font-semibold text-methodist-blue mb-1 break-words tracking-normal">{announcement.title}</h4>
                           <p className="text-xs text-slate-600 dark:text-slate-300 leading-normal line-clamp-2 whitespace-pre-line">{announcement.content}</p>
                          </div>
                          ))}
                      </div>
                   )}
                 </CardContent>
            </Card>

            {/* Profile Summary */}
                 <Card className="border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl overflow-hidden">
                   <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white px-5 py-4 flex items-center gap-4">
                       <div className="h-12 w-12 rounded-full bg-white/20 border-2 border-white/30 text-methodist-gold shadow-sm flex items-center justify-center font-bold text-lg">
                          {teacher.first_name[0]}{teacher.last_name[0]}
                       </div>
                       <div className="overflow-hidden flex flex-col">
                          <Tooltip content={`${teacher.first_name} ${teacher.last_name}`}>
                             <div className="font-bold text-lg leading-tight truncate tracking-tight">{teacher.first_name} {teacher.last_name}</div>
                          </Tooltip>
                          <Tooltip content={`Teacher ID: ${teacher.teacher_id}`}>
                             <div className="text-xs text-blue-200 mt-0.5 font-medium truncate flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-methodist-gold rounded-full"></span>
                                {teacher.teacher_id}
                             </div>
                          </Tooltip>
                       </div>
                   </div>
                   <CardContent className="p-6 pt-5">
                  <div className="grid grid-cols-2 gap-2 text-center h-20 mb-2">
                     <Tooltip content={classTooltipStr} className="h-full">
                        <div className="bg-white/80 backdrop-blur-sm p-2 rounded border shadow-sm cursor-help hover:border-blue-300 transition-colors h-full flex flex-col justify-center">
                           <div className="text-xs text-gray-500 uppercase mb-1">Class</div>
                           <div className="font-bold text-gray-800 dark:text-gray-200 text-sm break-words line-clamp-2">
                              {classDisplayStr}
                           </div>
                        </div>
                     </Tooltip>
                     
                     <Tooltip content={teacher.specialization || 'General Education'} className="h-full">
                        <div className="bg-white/80 backdrop-blur-sm p-2 rounded border shadow-sm cursor-help hover:border-blue-300 transition-colors h-full flex flex-col justify-center">
                           <div className="text-xs text-gray-500 uppercase mb-1">Area of Specialization</div>
                           <div className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate px-1">
                              {teacher.specialization || 'General'}
                           </div>
                        </div>
                     </Tooltip>
                  </div>
                  
                  <Tooltip content={subjectsTaughtList.join(', ')} className="block w-full">
                      <div className="bg-white/80 backdrop-blur-sm p-2 rounded border shadow-sm cursor-help hover:border-blue-300 transition-colors w-full text-center">
                         <div className="text-xs text-gray-500 uppercase mb-1">Assigned Subjects</div>
                         <div className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate px-1">
                            {subjectsTaughtList.length > 0 ? (
                                <span className={subjectsTaughtList.length > 3 ? 'text-xs' : ''}>
                                    {subjectsTaughtList.slice(0, 3).join(', ')}
                                    {subjectsTaughtList.length > 3 && ` +${subjectsTaughtList.length - 3}`}
                                </span>
                            ) : (
                                <span className="text-gray-400 italic font-normal">None Assigned</span>
                            )}
                         </div>
                      </div>
                  </Tooltip>
               </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}

function QuickActionCard({ 
  href, 
  title, 
  description, 
  icon: Icon, 
  color, 
  bg,
  borderColor 
}: any) {
  return (
    <Link href={href} className="block group h-full">
      <Card className={`h-full transition-all duration-300 hover:shadow-lg border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/60 backdrop-blur-xl rounded-3xl ${borderColor} hover:-translate-y-1`}>
        <CardContent className="p-6 flex flex-col items-center text-center h-full justify-center">
          <div className={`p-4 rounded-xl ${bg} ${color} mb-4 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
           <Skeleton className="h-40 rounded-xl" />
           <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="space-y-6">
           <Skeleton className="h-64 rounded-xl" />
           <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
