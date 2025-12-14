'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, BookOpen, BarChart3, Calendar, LogOut, User, FileText, Megaphone, Bell } from 'lucide-react'
import { getCurrentUser, getStudentData, signOut } from '@/lib/auth'
import type { Student, Profile } from '@/lib/supabase'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface Announcement {
  id: string
  title: string
  content: string
  target_audience: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  category?: string
}

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [student, setStudent] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allowCumulativeDownload, setAllowCumulativeDownload] = useState(false)
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [stats, setStats] = useState<{
    currentTerm: string
    attendance: number | string
    averageScore: number
    classPosition: string
  }>({
    currentTerm: 'N/A',
    attendance: 'No Data',
    averageScore: 0,
    classPosition: 'N/A'
  })

  useEffect(() => {
    async function loadUserData() {
      const user = await getCurrentUser()
      
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      // Load student data
      const studentResult = await getStudentData(user.id)
      
      if (!studentResult.data) {
        console.error('No student record found for this user')
        console.error('User ID:', user.id)
        console.error('User email:', user.email)
        setError('No student record found for your account. Please contact the administrator.')
        setLoading(false)
        return
      }
      
      console.log('Student data loaded:', studentResult.data)
      setStudent(studentResult.data)
      setProfile(studentResult.data.profiles)
      
      // Load real statistics using the database id (not student_id which is a string)
      await loadStats(studentResult.data.id)
      
      // Load system settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'allow_cumulative_download')
        .maybeSingle()
      
      setAllowCumulativeDownload(settingsData?.setting_value === 'true')

      // Load announcements
      await loadAnnouncements()
      
      setLoading(false)
    }

    loadUserData()
  }, [router])

  async function loadAnnouncements() {
    try {
      // Get announcements - try with target_audience first, fallback to all published
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5) as { data: any[] | null, error: any }

      if (error) {
        console.log('Error loading announcements:', error.message)
        return
      }

      if (data && data.length > 0) {
        // Filter client-side if target_audience exists
        const filteredData = data.filter(announcement => {
          // If no target_audience field, show to all
          if (!announcement.target_audience) return true
          // If target_audience exists, check if it includes students, parents, or all
          const audience = announcement.target_audience as string[]
          return audience.includes('students') || audience.includes('parents') || audience.includes('all')
        })
        setAnnouncements(filteredData)
      }
    } catch (error) {
      console.error('Error loading announcements:', error)
    }
  }

  async function loadStats(studentId: string) {
    try {
      // Get student data including class_id
      const { data: studentInfo } = await supabase
        .from('students')
        .select(`
          id,
          class_id,
          classes(id, name)
        `)
        .eq('id', studentId)
        .single()

      console.log('Student info loaded:', studentInfo)

      // Get current term ID from system settings
      const { data: termSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'current_term')
        .single() as { data: any }

      const currentTermId = termSetting?.setting_value
      console.log('Current term ID:', currentTermId)

      if (currentTermId) {
        // Get term name
        const { data: term } = await supabase
          .from('academic_terms')
          .select('name')
          .eq('id', currentTermId)
          .maybeSingle() as { data: any }

        if (term) {
          setStats(prev => ({ ...prev, currentTerm: term.name }))
        }

        // Get attendance - count days where student was present or late
        const { count: daysPresent } = await supabase
          .from('attendance')
          .select('id', { count: 'exact' })
          .eq('student_id', studentId)
          .in('status', ['present', 'late']) as { count: number | null }

        // Get total days from term data
        const { data: termInfo } = await supabase
          .from('academic_terms')
          .select('total_days')
          .eq('id', currentTermId)
          .maybeSingle() as { data: any }

        const totalDays = termInfo?.total_days || 0
        const display = `${daysPresent || 0}/${totalDays}`
        setStats(prev => ({ ...prev, attendance: display }))

        // Calculate average score from scores table FOR CURRENT TERM ONLY
        const { data: scores } = await supabase
          .from('scores')
          .select('total')
          .eq('student_id', studentId)
          .eq('term_id', currentTermId) as { data: any[] | null }

        if (scores && scores.length > 0) {
          const validScores = scores.filter((g: any) => g.total !== null && g.total !== undefined)
          if (validScores.length > 0) {
            const avg = validScores.reduce((sum: number, g: any) => sum + (g.total || 0), 0) / validScores.length
            setStats(prev => ({ ...prev, averageScore: Math.round(avg * 10) / 10 }))
          } else {
            setStats(prev => ({ ...prev, averageScore: 0 }))
          }
        } else {
          setStats(prev => ({ ...prev, averageScore: 0 }))
        }
      } else {
        // No current term set
        setStats(prev => ({ ...prev, averageScore: 0 }))
      }

      // Calculate class position for current term
      try {
        const { data: currentTermData } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'current_term')
          .single() as { data: any }

        if (currentTermData?.setting_value && studentInfo?.class_id) {
          // Use API route to get class rankings (bypasses RLS)
          const response = await fetch(
            `/api/class-rankings?classId=${studentInfo.class_id}&termId=${currentTermData.setting_value}`
          )
          const rankingsData = await response.json()

          console.log('Rankings data:', rankingsData)
          const allTermScores = rankingsData.scores || []
          const totalStudents = rankingsData.totalClassSize || 1

          console.log('All term scores fetched:', allTermScores?.length)
          console.log('Total students in class:', totalStudents)

          if (allTermScores && allTermScores.length > 0) {
            // Calculate total scores per student
            const studentTotals: { [studentId: string]: number} = {}
            allTermScores.forEach((score: any) => {
              if (!studentTotals[score.student_id]) {
                studentTotals[score.student_id] = 0
              }
              studentTotals[score.student_id] += score.total || 0
            })

            // Sort students by total score (descending)
            const sortedStudents = Object.entries(studentTotals)
              .sort(([, totalA], [, totalB]) => totalB - totalA)

            // Find current student's position
            const position = sortedStudents.findIndex(([sid]) => sid === studentId) + 1
            
            console.log('Position:', position, 'out of', totalStudents, 'students')

            if (position > 0) {
              const ordinal = getOrdinalSuffix(position)
              setStats(prev => ({ ...prev, classPosition: `${position}${ordinal} / ${totalStudents}` }))
            }
          } else {
            console.log('No scores found for current term')
          }
        }
      } catch (error) {
        console.error('Error calculating class position:', error)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  function getOrdinalSuffix(num: number): string {
    const j = num % 10
    const k = num % 100
    if (j === 1 && k !== 11) return 'st'
    if (j === 2 && k !== 12) return 'nd'
    if (j === 3 && k !== 13) return 'rd'
    return 'th'
  }

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`
    
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=student')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-methodist-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="bg-red-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="bg-methodist-blue text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors w-full"
          >
            Sign Out
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="ghana-flag-border bg-white shadow-md">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3">
              <GraduationCap className="w-10 h-10 text-methodist-blue" />
              <div>
                <h1 className="text-xl font-bold text-methodist-blue">
                  Biriwa Methodist 'C' Basic School
                </h1>
                <p className="text-xs text-gray-600">Student Portal</p>
              </div>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-gray-700 hover:text-red-600"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-methodist-blue to-blue-700 text-white rounded-lg p-6 md:p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Welcome back, {student?.last_name && student?.first_name 
                  ? `${student.last_name} ${student.first_name}` 
                  : profile?.full_name || 'Student'}!
              </h2>
              <p className="text-blue-100 text-sm md:text-base">
                <span className="font-semibold">Student ID:</span> {student?.student_id || 'Loading...'} | <span className="font-semibold">Class:</span> {student?.classes?.name || 'Loading...'}
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center">
                <User className="w-16 h-16 text-methodist-blue" />
              </div>
            </div>
          </div>
        </div>

        {/* Withheld Banner */}
        {student?.results_withheld && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Results Withheld</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Your results have been withheld by the administration. 
                    {student.withheld_reason ? ` Reason: ${student.withheld_reason}` : ' Please contact the school office for more information.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-2">
              <div className="text-center md:text-left">
                <p className="text-gray-600 text-xs md:text-sm">Current Term</p>
                <p className="text-lg md:text-2xl font-bold text-methodist-blue">{stats.currentTerm}</p>
              </div>
              <Calendar className="w-8 h-8 md:w-10 md:h-10 text-blue-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-2">
              <div className="text-center md:text-left">
                <p className="text-gray-600 text-xs md:text-sm">Attendance</p>
                <p className="text-lg md:text-2xl font-bold text-green-600">
                  {stats.attendance}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 md:w-10 md:h-10 text-green-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-2">
              <div className="text-center md:text-left">
                <p className="text-gray-600 text-xs md:text-sm">Average Score</p>
                <p className="text-lg md:text-2xl font-bold text-purple-600">
                  {student?.results_withheld ? '---' : (stats.averageScore > 0 ? `${stats.averageScore}%` : 'No Data')}
                </p>
              </div>
              <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-purple-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center md:justify-between gap-2">
              <div className="text-center md:text-left">
                <p className="text-gray-600 text-xs md:text-sm">Class Position</p>
                <p className="text-lg md:text-2xl font-bold text-yellow-600">
                  {student?.results_withheld ? '---' : stats.classPosition}
                </p>
              </div>
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-yellow-200" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Link href="/student/report-card" className="dashboard-card group hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow border border-transparent hover:border-green-100">
              <div className="bg-green-100 p-3 md:p-4 rounded-lg group-hover:bg-green-200 transition-colors">
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-ghana-green" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-gray-800">Results</h3>
                <p className="text-xs md:text-sm text-gray-600">Check your exam scores and grades</p>
              </div>
            </div>
          </Link>

          <Link href="/student/attendance" className="dashboard-card group hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow border border-transparent hover:border-purple-100">
              <div className="bg-purple-100 p-3 md:p-4 rounded-lg group-hover:bg-purple-200 transition-colors">
                <Calendar className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-gray-800">Attendance</h3>
                <p className="text-xs md:text-sm text-gray-600">View attendance records</p>
              </div>
            </div>
          </Link>

          <Link href="/student/performance" className="dashboard-card group hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow border border-transparent hover:border-yellow-100">
              <div className="bg-yellow-100 p-3 md:p-4 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-gray-800">Performance Trends</h3>
                <p className="text-xs md:text-sm text-gray-600">Track your academic progress</p>
              </div>
            </div>
          </Link>

          {allowCumulativeDownload ? (
            <Link href="/student/cumulative" className="dashboard-card group hover:shadow-md transition-all duration-200">
              <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow border border-transparent hover:border-orange-100">
                <div className="bg-orange-100 p-3 md:p-4 rounded-lg group-hover:bg-orange-200 transition-colors">
                  <FileText className="w-6 h-6 md:w-8 md:h-8 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-800">Cumulative Record</h3>
                  <p className="text-xs md:text-sm text-gray-600">View full academic history</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="dashboard-card opacity-60 cursor-not-allowed">
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg shadow border border-transparent">
                <div className="bg-gray-200 p-3 md:p-4 rounded-lg">
                  <FileText className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-bold text-base md:text-lg text-gray-500 flex items-center gap-2">
                    Cumulative Record
                    <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Locked</span>
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500">Available when released by admin</p>
                </div>
              </div>
            </div>
          )}



          <Link href="/student/profile" className="dashboard-card group hover:shadow-md transition-all duration-200">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow border border-transparent hover:border-indigo-100">
              <div className="bg-indigo-100 p-3 md:p-4 rounded-lg group-hover:bg-indigo-200 transition-colors">
                <User className="w-6 h-6 md:w-8 md:h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-base md:text-lg text-gray-800">My Profile</h3>
                <p className="text-xs md:text-sm text-gray-600">Update your information</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Announcements */}
        <div className="mt-8 bg-white rounded-lg shadow p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Megaphone className="w-5 h-5 md:w-6 md:h-6 text-methodist-blue" />
            <h3 className="text-lg md:text-xl font-bold text-gray-800">Recent Announcements</h3>
          </div>
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Bell className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm md:text-base">No announcements at this time</p>
                <p className="text-xs md:text-sm">Check back later for updates from your school</p>
              </div>
            ) : (
              announcements.map((announcement) => (
                <div 
                  key={announcement.id} 
                  className={`border-l-4 pl-4 py-3 rounded-r-lg ${
                    announcement.priority === 'urgent' 
                      ? 'border-red-500 bg-red-50' 
                      : announcement.priority === 'high'
                      ? 'border-orange-500 bg-orange-50'
                      : announcement.category === 'academic'
                      ? 'border-methodist-blue bg-blue-50'
                      : 'border-ghana-green bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <h4 className="font-semibold text-gray-800">{announcement.title}</h4>
                    {announcement.priority === 'urgent' && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded-full">Urgent</span>
                    )}
                    {announcement.priority === 'high' && (
                      <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded-full">Important</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{announcement.content}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {formatTimeAgo(announcement.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
