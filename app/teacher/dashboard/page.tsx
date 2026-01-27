'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Users, FileText, BarChart3, LogOut, BookOpen, Calendar, AlertCircle, Camera, CheckCircle, TrendingUp, DollarSign, Printer, Settings, ArrowLeft } from 'lucide-react'
import { getTeacherAssignments, signOut } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { getTeacherPermissions, getClassesForAttendance } from '@/lib/teaching-model-permissions'
import { ClassPermissionCard } from '@/components/TeachingModelComponents'
import { useTeacher } from '@/components/providers/TeacherContext'

export default function TeacherDashboard() {
  const router = useRouter()
  const { user, teacher, profile, loading: contextLoading, dashboardData, fetchDashboardData } = useTeacher()
  const [assignments, setAssignments] = useState<any[]>([])
  const [permissions, setPermissions] = useState<any[]>([])
  const [attendanceClasses, setAttendanceClasses] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [studentCount, setStudentCount] = useState(0)
  const [currentTerm, setCurrentTerm] = useState<string>('N/A')
  const [attendanceRate, setAttendanceRate] = useState<string>('-')
  const [recentActivities, setRecentActivities] = useState<any[]>([])

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

    // Check if we have cached data
    if (dashboardData) {
      setAssignments(dashboardData.assignments)
      setPermissions(dashboardData.permissions)
      setAttendanceClasses(dashboardData.attendanceClasses)
      setStudentCount(dashboardData.stats.studentCount)
      setAttendanceRate(dashboardData.stats.attendanceRate)
      if (dashboardData.currentTerm) setCurrentTerm(dashboardData.currentTerm)
      setRecentActivities(dashboardData.recentActivities)
      setLoading(false)
      
      // Optionally re-fetch in background if older than 1 min but less than 5
      if (Date.now() - dashboardData.lastFetched > 60 * 1000) {
        fetchDashboardData()
      }
    } else {
      // First load
      fetchDashboardData().then(() => setLoading(false))
    }
  }, [user, teacher, contextLoading, dashboardData, fetchDashboardData, router])

  // Removed old fetch logic


  function getTimeAgo(timestamp: string): string {
    const now = new Date()
    const past = new Date(timestamp)
    const diffMs = now.getTime() - past.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return past.toLocaleDateString('en-GB')
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=teacher')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={handleLogout}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Profile check
  if (!teacher || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md mx-auto text-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-2">Profile Not Found</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Your teacher profile could not be found. Please contact the school administrator.
            </p>
            <button
              onClick={handleLogout}
              className="w-full bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 overflow-hidden shadow-md">
        {/* Ghana Flag Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green z-10"></div>
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700 relative">
          <nav className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <GraduationCap className="w-8 h-8 text-blue-900" />
                </div>
                <div>
                  <h1 className="text-sm md:text-lg font-bold text-blue-900 leading-tight">
                    Biriwa Methodist 'C' Basic School
                  </h1>
                  <p className="text-xs text-blue-800 font-bold tracking-wide uppercase">Teacher Portal</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-white/20 text-red-800 px-3 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm font-bold backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8 font-sans">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl p-6 md:p-8 mb-6 md:mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
              Welcome, {teacher?.first_name} {teacher?.middle_name ? `${teacher.middle_name} ` : ''}{teacher?.last_name}!
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-blue-100 text-sm md:text-base font-medium">
              <span className="bg-blue-800/50 px-3 py-1 rounded-full border border-blue-600/30 w-fit">
                ID: {teacher?.teacher_id}
              </span>
              <span className="hidden sm:inline opacity-50">•</span>
              <span>{teacher?.specialization || 'General Education'}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats - Responisve Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Classes</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{assignments.length}</p>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <BookOpen className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Students</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{studentCount}</p>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Attendance</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{attendanceRate}</p>
              </div>
              <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Term</p>
                <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate">{currentTerm}</p>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* My Classes/Assignments with Teaching Model Context */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 md:p-6 mb-8 border border-gray-200 dark:border-gray-700 transition-colors">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            My Class Assignments
          </h3>
          
          <Link
            href="/teacher/assessments"
            className="block mb-6 p-4 md:p-5 bg-gradient-to-r from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800 border border-blue-100 dark:border-blue-800 rounded-xl hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-white dark:bg-gray-700 rounded-full shadow-sm text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-lg">Online Assessments</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Create quizzes, exams, and assignments.</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 p-2 rounded-full shadow-sm group-hover:translate-x-1 transition-transform">
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </div>
            </div>
          </Link>

          {attendanceClasses.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Class Teacher Actions:</strong> You have administrative privileges for {attendanceClasses.length} class{attendanceClasses.length !== 1 ? 'es' : ''}. Use the cards below to manage attendance and reports.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {permissions.length === 0 ? (
              <div className="col-span-full text-center py-12 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400 font-medium">No class assignments found.</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Please contact the administrator for access.</p>
              </div>
            ) : (
              permissions.map((perm) => (
                <div key={perm.class_id} className="transform transition-all duration-200 hover:-translate-y-1">
                  <ClassPermissionCard
                    className={perm.class_name}
                    teachingModel={perm.teaching_model}
                    isClassTeacher={perm.is_class_teacher}
                    subjectCount={perm.subjects.filter((s: any) => s.can_edit).length}
                    canMarkAttendance={perm.can_mark_attendance}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-methodist-gold" />
            Quick Actions
          </h3>
          {/* ...existing code... */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Link href="/teacher/manage-scores" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
              <FileText className="w-6 h-6 md:w-8 md:h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Manage Scores</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Assessments & Grades</p>
          </Link>

          <Link href="/teacher/students" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-full mb-3 group-hover:bg-green-100 dark:group-hover:bg-green-900/50 transition-colors">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-ghana-green dark:text-green-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">My Students</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">View student list</p>
          </Link>

          <Link href="/teacher/performance" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-full mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
              <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Analytics</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track progress</p>
          </Link>

          <Link href="/teacher/promotions" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-full mb-3 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Promotions</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">End-of-year decisions</p>
          </Link>

          <Link href="/teacher/attendance" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-full mb-3 group-hover:bg-yellow-100 dark:group-hover:bg-yellow-900/50 transition-colors">
              <Calendar className="w-6 h-6 md:w-8 md:h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Attendance</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Mark daily register</p>
          </Link>

          <Link href="/teacher/reports" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-full mb-3 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/50 transition-colors">
              <Printer className="w-6 h-6 md:w-8 md:h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Reports</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Generate reports</p>
          </Link>

          <Link href="/teacher/fees" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-teal-50 dark:bg-teal-900/30 p-4 rounded-full mb-3 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/50 transition-colors">
              <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-teal-600 dark:text-teal-400" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Fees</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Collection & Records</p>
          </Link>

          <Link href="/teacher/settings" className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 flex flex-col items-center text-center hover:shadow-lg transition-all border border-gray-100 dark:border-gray-700 group">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-full mb-3 group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors">
              <Settings className="w-6 h-6 md:w-8 md:h-8 text-gray-600 dark:text-gray-300" />
            </div>
            <h3 className="font-bold text-sm md:text-base text-gray-800 dark:text-gray-200 mb-1">Settings</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Password & Theme</p>
          </Link>
        </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 transition-colors">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Recent Activity</h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className={`flex items-center justify-between py-2 ${index < recentActivities.length - 1 ? 'border-b dark:border-gray-700' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                    <span className="text-xs md:text-sm text-gray-700 dark:text-gray-300">{activity.description}</span>
                  </div>
                  <span className="text-[10px] md:text-sm text-gray-500 dark:text-gray-400" suppressHydrationWarning>
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm">No recent activity</p>
              <p className="text-xs md:text-sm mt-2">Start entering scores or marking attendance to see activity here</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
