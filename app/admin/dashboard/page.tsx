'use client'

// Admin Dashboard Component
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  GraduationCap, Users, BookOpen, Building2, LogOut, 
  UserPlus, FileText, Settings, BarChart3, Calendar, Newspaper, Image, TrendingUp, DollarSign, MessageSquare
} from 'lucide-react'
import { getCurrentUser, signOut } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    activeEnrollments: 0,
    pendingAdmissions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const user = await getCurrentUser()
      
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load admin profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData)
      }

      // Load statistics
      const [studentsRes, teachersRes, classesRes] = await Promise.all([
        supabase.from('students').select('id', { count: 'exact' }),
        supabase.from('teachers').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('classes').select('id', { count: 'exact' }),
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

    loadData()
  }, [router])

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=admin')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-methodist-gold mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 relative overflow-hidden">
        {/* Ghana Flag Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green"></div>
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">
          <nav className="container mx-auto px-4 md:px-6 py-3 md:py-4">
            <div className="flex items-center justify-between gap-2">
              <Link href="/" className="flex items-center space-x-2 md:space-x-3 min-w-0 flex-1">
                <GraduationCap className="w-10 h-10 text-methodist-blue" />
                <div>
                  <h1 className="text-lg md:text-xl font-bold text-methodist-blue">
                    Biriwa Methodist 'C' Basic School
                  </h1>
                  <p className="text-[10px] md:text-xs text-methodist-blue font-semibold">Administrative Portal</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-ghana-red text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md font-semibold"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
        
        {/* Bottom Accent Line */}
        <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white rounded-lg p-8 mb-8 shadow-lg">
          <div>
            <h2 className="text-xl md:text-3xl font-bold mb-2">
              Welcome, {profile?.full_name || 'Administrator'}!
            </h2>
            <p className="text-sm md:text-base text-blue-100">
              School Management System - Administrative Dashboard
            </p>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Students</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
                <p className="text-[10px] md:text-xs text-green-600 mt-1">Active</p>
              </div>
              <Users className="w-10 h-10 md:w-12 md:h-12 text-blue-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Teachers</p>
                <p className="text-2xl md:text-3xl font-bold text-ghana-green">{stats.totalTeachers}</p>
                <p className="text-[10px] md:text-xs text-green-600 mt-1">Active</p>
              </div>
              <GraduationCap className="w-10 h-10 md:w-12 md:h-12 text-green-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Classes</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-600">{stats.totalClasses}</p>
                <p className="text-[10px] md:text-xs text-gray-500 mt-1">KG & Basic (1-9)</p>
              </div>
              <Building2 className="w-10 h-10 md:w-12 md:h-12 text-purple-200" />
            </div>
          </div>

          <Link href="/admin/admissions" className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Pending Admissions</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-600">{stats.pendingAdmissions}</p>
                <p className="text-[10px] md:text-xs text-orange-600 mt-1 font-medium">Click to review →</p>
              </div>
              <FileText className="w-10 h-10 md:w-12 md:h-12 text-orange-200" />
            </div>
          </Link>
        </div>

        {/* Management Sections */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Student Management */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-ghana-green">
            <h3 className="text-xl font-bold text-methodist-blue mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-ghana-green" />
              Student Management
            </h3>
            <div className="space-y-3">
              <Link href="/admin/students" className="block p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">View All Students</span>
                  <span className="text-blue-600">→</span>
                </div>
              </Link>
              <Link href="/admin/students/add" className="block p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Add New Student</span>
                  <UserPlus className="w-4 h-4 text-blue-600" />
                </div>
              </Link>
              <Link href="/admin/enrollments" className="block p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Manage Enrollments</span>
                  <span className="text-blue-600">→</span>
                </div>
              </Link>
              <Link href="/admin/admissions" className="block p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors border-2 border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-gray-800 font-semibold">Admission Applications</span>
                    {stats.pendingAdmissions > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded-full">
                        {stats.pendingAdmissions} pending
                      </span>
                    )}
                  </div>
                  <FileText className="w-4 h-4 text-orange-600" />
                </div>
              </Link>
            </div>
          </div>

          {/* Teacher Management */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-methodist-gold">
            <h3 className="text-xl font-bold text-methodist-blue mb-4 flex items-center">
              <GraduationCap className="w-6 h-6 mr-2 text-methodist-gold" />
              Teacher Management
            </h3>
            <div className="space-y-3">
              <Link href="/admin/teachers" className="block p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">View All Teachers</span>
                  <span className="text-ghana-green">→</span>
                </div>
              </Link>
              <Link href="/admin/teachers/add" className="block p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Add New Teacher</span>
                  <UserPlus className="w-4 h-4 text-ghana-green" />
                </div>
              </Link>
              <Link href="/admin/assignments" className="block p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Class Assignments</span>
                  <span className="text-ghana-green">→</span>
                </div>
              </Link>
              <Link href="/admin/teaching-model" className="block p-3 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border-2 border-yellow-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 font-semibold">Teaching Model Settings</span>
                  <Settings className="w-4 h-4 text-methodist-gold" />
                </div>
              </Link>
            </div>
          </div>

          {/* Academic Management */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-ghana-red">
            <h3 className="text-xl font-bold text-methodist-blue mb-4 flex items-center">
              <BookOpen className="w-6 h-6 mr-2 text-ghana-red" />
              Academic Management
            </h3>
            <div className="space-y-3">
              <Link href="/admin/classes" className="block p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Manage Classes</span>
                  <span className="text-purple-600">→</span>
                </div>
              </Link>
              <Link href="/admin/subjects" className="block p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Manage Subjects</span>
                  <span className="text-purple-600">→</span>
                </div>
              </Link>
              <Link href="/admin/terms" className="block p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Academic Terms</span>
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
              </Link>
              <Link href="/admin/promotions" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 font-semibold">Student Promotions</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              </Link>
              <Link href="/admin/results/approval" className="block p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border-2 border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 font-semibold">Results Approval</span>
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
              </Link>
            </div>
          </div>

          {/* Resources & Reports */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-t-4 border-methodist-blue">
            <h3 className="text-xl font-bold text-methodist-blue mb-4 flex items-center">
              <Building2 className="w-6 h-6 mr-2 text-methodist-blue" />
              Resources & Reports
            </h3>
            <div className="space-y-3">
              <Link href="/admin/resources" className="block p-3 bg-gray-50 rounded-lg hover:bg-yellow-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">School Resources</span>
                  <span className="text-methodist-gold">→</span>
                </div>
              </Link>
              <Link href="/admin/reports" className="block p-3 bg-gray-50 rounded-lg hover:bg-yellow-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Generate Reports</span>
                  <BarChart3 className="w-4 h-4 text-methodist-gold" />
                </div>
              </Link>
              <Link href="/admin/finance" className="block p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border-2 border-green-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-800 font-semibold">Finance & Fees</span>
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
              </Link>
              <Link href="/admin/admissions" className="block p-3 bg-gray-50 rounded-lg hover:bg-yellow-50 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Admission Applications</span>
                  <FileText className="w-4 h-4 text-methodist-gold" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 md:mt-8">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6">Content Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-6">
            <Link href="/admin/news" className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-br from-red-100 to-red-200 p-4 rounded-2xl">
                  <Newspaper className="w-10 h-10 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">News</h3>
                  <p className="text-sm text-gray-500">Manage school news</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/gallery" className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-2xl">
                  <Image className="w-10 h-10 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Gallery</h3>
                  <p className="text-sm text-gray-500">Upload photos</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/announcements" className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-2xl">
                  <FileText className="w-10 h-10 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Announcements</h3>
                  <p className="text-sm text-gray-500">Post updates</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/events" className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-2xl">
                  <Calendar className="w-10 h-10 text-ghana-green" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Events</h3>
                  <p className="text-sm text-gray-500">Manage calendar</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/complaints" className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-2xl">
                  <MessageSquare className="w-10 h-10 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Complaints</h3>
                  <p className="text-sm text-gray-500">View feedback</p>
                </div>
              </div>
            </Link>

            <Link href="/admin/settings" className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-4 rounded-2xl">
                  <Settings className="w-10 h-10 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-800 mb-1">Settings</h3>
                  <p className="text-sm text-gray-500">Configure system</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
