'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  GraduationCap, 
  Users, 
  FileText, 
  BarChart3, 
  BookOpen, 
  Calendar, 
  AlertCircle, 
  CheckCircle, 
  ClipboardList,
  UserCheck
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useTeacher } from '@/components/providers/TeacherContext'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function TeacherDashboard() {
  const router = useRouter()
  const { user, teacher, profile, loading: contextLoading, dashboardData, fetchDashboardData } = useTeacher()
  const [assignments, setAssignments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [currentTerm, setCurrentTerm] = useState<string>('N/A')
  const [attendanceRate, setAttendanceRate] = useState<string>('-')

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
      setAssignments(dashboardData.assignments)
      setStudentCount(dashboardData.stats.studentCount)
      setAttendanceRate(dashboardData.stats.attendanceRate)
      if (dashboardData.currentTerm) setCurrentTerm(dashboardData.currentTerm)
      setLoading(false)
      
      if (Date.now() - dashboardData.lastFetched > 60 * 1000) {
        fetchDashboardData()
      }
    } else {
      fetchDashboardData().then(() => setLoading(false))
    }
  }, [user, teacher, contextLoading, dashboardData, fetchDashboardData, router])

  if (loading) {
    return <DashboardSkeleton />
  }

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
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Retry Connection
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-900 to-blue-800 text-white rounded-xl p-6 md:p-8 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-10"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
                Welcome, {teacher.first_name}!
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-blue-100 text-sm font-medium">
                <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none backdrop-blur-sm">
                  ID: {teacher.teacher_id}
                </Badge>
                <span className="opacity-60">•</span>
                <span>{teacher.specialization || 'General Education'}</span>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm ring-1 ring-white/20">
                 <GraduationCap className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard 
            title="My Classes" 
            value={assignments.length} 
            icon={BookOpen} 
            color="text-blue-600 dark:text-blue-400"
            bg="bg-blue-50 dark:bg-blue-900/20"
          />
          <StatsCard 
            title="Total Students" 
            value={studentCount} 
            icon={Users} 
            color="text-green-600 dark:text-green-400"
            bg="bg-green-50 dark:bg-green-900/20"
          />
          <StatsCard 
            title="Avg Attendance" 
            value={attendanceRate} 
            icon={UserCheck} 
            color="text-yellow-600 dark:text-yellow-400"
            bg="bg-yellow-50 dark:bg-yellow-900/20" 
          />
          <StatsCard 
            title="Current Term" 
            value={currentTerm} 
            icon={Calendar} 
            color="text-purple-600 dark:text-purple-400"
            bg="bg-purple-50 dark:bg-purple-900/20"
          />
        </div>

        {/* Main Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Assessment & Grading */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                Assessments & Grading
              </CardTitle>
              <CardDescription>Manage exams, quizzes and scores</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <Link href="/teacher/assessments" className="block group">
                  <div className="flex items-center p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all border border-transparent hover:border-blue-100 dark:hover:border-blue-800">
                     <div className="p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                        <FileText className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Online Assessments</h4>
                        <p className="text-xs text-muted-foreground">Create and manage quizzes</p>
                     </div>
                  </div>
               </Link>
               <Link href="/teacher/enter-scores" className="block group">
                  <div className="flex items-center p-3 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-all border border-transparent hover:border-green-100 dark:hover:border-green-800">
                     <div className="p-2 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                        <ClipboardList className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Enter Class Scores</h4>
                        <p className="text-xs text-muted-foreground">Record exam and test results</p>
                     </div>
                  </div>
               </Link>
            </CardContent>
          </Card>

          {/* Class Management */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-yellow-600" />
                Class Management
              </CardTitle>
              <CardDescription>Daily routines and reporting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
               <Link href="/teacher/attendance" className="block group">
                  <div className="flex items-center p-3 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-all border border-transparent hover:border-yellow-100 dark:hover:border-yellow-800">
                     <div className="p-2 bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                        <CheckCircle className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">Mark Attendance</h4>
                        <p className="text-xs text-muted-foreground">Daily student roll call</p>
                     </div>
                  </div>
               </Link>
               <Link href="/teacher/reports" className="block group">
                  <div className="flex items-center p-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all border border-transparent hover:border-purple-100 dark:hover:border-purple-800">
                     <div className="p-2 bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-lg mr-4 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">View Reports</h4>
                        <p className="text-xs text-muted-foreground">Generate student report cards</p>
                     </div>
                  </div>
               </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StatsCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold">{value}</h3>
          </div>
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
