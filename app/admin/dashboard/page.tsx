'use client'

// Admin Dashboard Component
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  GraduationCap, Users, BookOpen, Building2, LogOut, 
  UserPlus, FileText, Settings, BarChart3, Calendar, Newspaper, Image, TrendingUp, DollarSign, MessageSquare
} from 'lucide-react'
import { signOut } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useAdmin } from '@/components/providers/AdminContext'
import { Skeleton } from '@/components/ui/skeleton'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, profile, loading: contextLoading } = useAdmin()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeEnrollments: 0,
    pendingAdmissions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (contextLoading) return

    if (!user) {
      router.push('/login?portal=admin')
      return
    }

    async function loadStats() {
      // Load statistics only - profile and user are from context
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact', head: true }),
        supabase.from('teachers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('classes').select('id', { count: 'exact', head: true }),
      ])

      setStats({
        totalStudents: studentsRes.count || 0,
        totalTeachers: teachersRes.count || 0,
        totalClasses: classesRes.count || 0,
        activeEnrollments: (studentsRes.count || 0),
        pendingAdmissions: 0, // admission_applications table not implemented yet
      })
      
      setLoading(false)
    }

    loadStats()
  }, [user, contextLoading, router])

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=admin')
  }

  if (contextLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header Skeleton */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">
           <div className="container mx-auto px-4 py-3 flex justify-between items-center">
               <div className="flex gap-4 items-center">
                    <Skeleton className="w-10 h-10 rounded-lg bg-white/20" />
                    <div>
                        <Skeleton className="w-48 h-5 mb-1 bg-white/20" />
                        <Skeleton className="w-24 h-3 bg-white/20" />
                    </div>
               </div>
               <Skeleton className="w-24 h-10 rounded-lg bg-white/20" />
           </div>
        </div>

        <main className="container mx-auto px-4 py-8">
            {/* Welcome Banner Skeleton */}
            <div className="w-full h-32 md:h-40 rounded-xl bg-gray-200 animate-pulse mb-8" />

            {/* Stats Grid Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="space-y-2">
                                <Skeleton className="w-16 h-3" />
                                <Skeleton className="w-12 h-8" />
                            </div>
                             <Skeleton className="w-10 h-10 rounded-lg" />
                        </div>
                         <Skeleton className="w-20 h-3" />
                    </div>
                ))}
            </div>

            {/* Menu Grid Skeleton */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {[1, 2, 3, 4, 5, 6].map((i) => (
                   <div key={i} className="bg-white rounded-xl shadow-sm p-6 h-48 flex flex-col justify-between">
                       <div className="flex justify-between items-start">
                           <Skeleton className="w-12 h-12 rounded-lg" />
                       </div>
                       <div className="space-y-2">
                            <Skeleton className="w-32 h-6" />
                            <Skeleton className="w-full h-4" />
                       </div>
                   </div>
               ))}
            </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 overflow-hidden shadow-md">
        {/* Ghana Flag Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green z-10"></div>
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700 relative">
          <nav className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center space-x-3 group min-w-0">
                <div className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors backdrop-blur-sm flex-shrink-0">
                  <GraduationCap className="w-8 h-8 text-blue-900" />
                </div>
                <div className="min-w-0 truncate">
                  <h1 className="text-sm md:text-lg font-bold text-blue-900 leading-tight truncate">
                    Biriwa Methodist 'C' Basic School
                  </h1>
                  <p className="text-xs text-blue-800 font-bold tracking-wide uppercase">Admin Portal</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-white/20 text-red-800 px-3 py-2 rounded-lg hover:bg-white/30 transition-colors text-sm font-bold backdrop-blur-sm flex-shrink-0"
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
        <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white rounded-xl p-6 md:p-8 mb-8 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-2 tracking-tight">
              Welcome, {profile?.full_name || 'Administrator'}!
            </h2>
            <div className="flex items-center gap-2 text-blue-100 text-sm md:text-base font-medium">
               <span className="bg-blue-800/50 px-3 py-1 rounded-full border border-blue-600/30">
                  School Management System
               </span>
               <span className="hidden sm:inline">Administrative Dashboard</span>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Students</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalStudents}</p>
                <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-[10px] md:text-xs text-gray-500">Active</p>
                </div>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg w-fit">
                <Users className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Teachers</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTeachers}</p>
                 <div className="flex items-center gap-1 mt-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <p className="text-[10px] md:text-xs text-gray-500">Active</p>
                </div>
              </div>
              <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg w-fit">
                <GraduationCap className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md">
             <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Classes</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{stats.totalClasses}</p>
                <p className="text-[10px] md:text-xs text-gray-400 mt-1">KG - JHS</p>
              </div>
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg w-fit">
                <Building2 className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <Link href="/admin/admissions" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 md:p-6 transition-all hover:shadow-md group cursor-pointer">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Admissions</p>
                <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white group-hover:text-orange-600 transition-colors">{stats.pendingAdmissions}</p>
                 <p className="text-[10px] md:text-xs text-orange-600 mt-1 font-medium flex items-center">
                    Pending <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                 </p>
              </div>
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg w-fit">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Link>
        </div>

        {/* Management Sections */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {/* Student Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border-t-4 border-green-600 dark:border-green-500">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600 dark:text-green-500" />
              Student Management
            </h3>
            <div className="space-y-3">
              <Link href="/admin/students" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">View All Students</span>
                  <span className="text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/students/add" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Add New Student</span>
                  <div className="bg-white dark:bg-gray-800 p-1 rounded-full shadow-sm text-green-600 dark:text-green-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </div>
              </Link>
              <Link href="/admin/enrollments" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-green-200 dark:hover:border-green-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Manage Enrollments</span>
                  <span className="text-green-600 dark:text-green-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/admissions" className="block p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl hover:bg-white border border-orange-100 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-800 dark:text-gray-100 font-semibold">Admission Applications</span>
                    {stats.pendingAdmissions > 0 && (
                      <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] uppercase font-bold tracking-wider rounded-full">
                        {stats.pendingAdmissions} NEW
                      </span>
                    )}
                  </div>
                  <FileText className="w-4 h-4 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Teacher Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border-t-4 border-yellow-500 dark:border-yellow-400">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <GraduationCap className="w-5 h-5 mr-2 text-yellow-500 dark:text-yellow-400" />
              Teacher Management
            </h3>
            <div className="space-y-3">
              <Link href="/admin/teachers" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">View All Teachers</span>
                  <span className="text-yellow-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/teachers/add" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Add New Teacher</span>
                  <div className="bg-white dark:bg-gray-800 p-1 rounded-full shadow-sm text-yellow-600 dark:text-yellow-400">
                    <UserPlus className="w-4 h-4" />
                  </div>
                </div>
              </Link>
              <Link href="/admin/assignments" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Class Assignments</span>
                  <span className="text-yellow-600 dark:text-yellow-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/teaching-model" className="block p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl hover:bg-white border border-yellow-100 dark:border-yellow-900/30 hover:border-yellow-300 dark:hover:border-yellow-700 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-gray-100 font-semibold">Teaching Model Settings</span>
                  <Settings className="w-4 h-4 text-yellow-600 dark:text-yellow-400 group-hover:rotate-45 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Academic Management */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border-t-4 border-red-600 dark:border-red-500">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <BookOpen className="w-5 h-5 mr-2 text-red-600 dark:text-red-500" />
              Academic Management
            </h3>
            <div className="space-y-3">
              <Link href="/admin/classes" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Manage Classes</span>
                  <span className="text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/subjects" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Manage Subjects</span>
                  <span className="text-red-600 dark:text-red-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/terms" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Academic Terms</span>
                  <Calendar className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
              </Link>
               <Link href="/admin/promotions" className="block p-4 bg-green-50 dark:bg-green-900/10 rounded-xl hover:bg-white border border-green-100 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-gray-100 font-semibold">Student Promotions</span>
                  <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
               <Link href="/admin/results" className="block p-4 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-white border border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-700 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-gray-100 font-semibold">Results Management</span>
                  <FileText className="w-4 h-4 text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
            </div>
          </div>

          {/* Resources & Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border-t-4 border-blue-600 dark:border-blue-500">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-500" />
              Resources & Reports
            </h3>
            <div className="space-y-3">
              <Link href="/admin/resources" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">School Resources</span>
                  <span className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </Link>
              <Link href="/admin/reports" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Generate Reports</span>
                  <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
              <Link href="/admin/finance" className="block p-4 bg-green-50 dark:bg-green-900/10 rounded-xl hover:bg-white border border-green-100 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 dark:text-gray-100 font-semibold">Finance & Fees</span>
                  <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
              <Link href="/admin/admissions" className="block p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-white border border-gray-100 dark:border-gray-700 hover:border-yellow-200 dark:hover:border-yellow-800 transition-all group">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-200 font-medium">Admission Applications</span>
                  <FileText className="w-4 h-4 text-yellow-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 md:mt-10">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-6">Content Management</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            <Link href="/admin/news" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl group-hover:bg-red-100 dark:group-hover:bg-red-900/30 transition-colors">
                  <Newspaper className="w-8 h-8 md:w-10 md:h-10 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-1">News</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Manage school news</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/gallery" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                  <Image className="w-8 h-8 md:w-10 md:h-10 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-1">Gallery</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Upload photos</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/announcements" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <FileText className="w-8 h-8 md:w-10 md:h-10 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-1">Announcements</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Post updates</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/events" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl group-hover:bg-green-100 dark:group-hover:bg-green-900/30 transition-colors">
                  <Calendar className="w-8 h-8 md:w-10 md:h-10 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-1">Events</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Manage calendar</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/complaints" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                  <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-1">Complaints</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">View feedback</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/settings" className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-6 hover:-translate-y-1 border border-gray-100 dark:border-gray-700 group">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-2xl group-hover:bg-gray-100 dark:group-hover:bg-gray-600 transition-colors">
                  <Settings className="w-8 h-8 md:w-10 md:h-10 text-gray-600 dark:text-gray-400 group-hover:rotate-45 transition-transform duration-500" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800 dark:text-gray-100 mb-1">Settings</h3>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Configure system</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
