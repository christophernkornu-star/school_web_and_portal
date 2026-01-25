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

import { useRef } from 'react'
import { useStudent } from '@/components/providers/StudentContext'

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const { user, profile, student, loading: contextLoading } = useStudent()
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
  
  // Use a ref to prevent double fetching
  const statsLoaded = useRef(false)

  useEffect(() => {
    if (contextLoading) return

    if (!user) {
      router.push('/login?portal=student')
      return
    }

    if (!student) {
      setError('No student record found for your account. Please contact the administrator.')
      setLoading(false)
      return
    }

    async function initializeDashboard() {
      // Prevent reloading if we already have data
      if (statsLoaded.current) {
         setLoading(false)
         return
      }

      // Load system settings
      const { data: settingsData } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'allow_cumulative_download')
        .maybeSingle()
      
      setAllowCumulativeDownload(settingsData?.setting_value === 'true')

      // Load announcements in parallel
      const loadAnnouncementsPromise = loadAnnouncements()
      
      // Load stats
      const loadStatsPromise = loadStats(student.id)

      await Promise.all([loadAnnouncementsPromise, loadStatsPromise])
      
      statsLoaded.current = true
      setLoading(false)
    }

    initializeDashboard()
  }, [user, student, contextLoading, router])

  async function loadAnnouncements() {
    try {
      const now = new Date().toISOString()
      // Get announcements - try with target_audience first, fallback to all published
      // Also filter out expired announcements
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('published', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
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
      <header className="sticky top-0 z-50 relative overflow-hidden">
        {/* Ghana Flag Border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-ghana-red via-ghana-gold to-ghana-green"></div>
        
        {/* Main Header */}
        <div className="bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 shadow-lg border-b-4 border-yellow-700">
          <nav className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-3">
                <GraduationCap className="w-8 h-8 md:w-10 md:h-10 text-methodist-blue" />
                <div>
                  <h1 className="text-base md:text-xl font-bold text-methodist-blue">
                    Biriwa Methodist 'C' Basic School
                  </h1>
                  <p className="text-[10px] md:text-xs text-methodist-blue font-semibold">Student Portal</p>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-ghana-red text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-red-700 transition-colors shadow-md font-semibold text-xs md:text-sm"
              >
                <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                <span>Logout</span>
              </button>
          </div>
        </nav>
      </div>
      
      {/* Bottom Accent Line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"></div>
    </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-methodist-blue to-blue-900 text-white rounded-2xl p-6 md:p-10 mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-methodist-gold opacity-10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-4xl font-bold mb-2 tracking-tight">
                Welcome back, {student ? `${student.first_name} ${student.last_name}` : 'Student'}!
              </h2>
              <p className="text-blue-100 text-sm md:text-base font-medium opacity-90">
                <span className="inline-block bg-blue-800/50 px-3 py-1 rounded-full text-xs md:text-sm backdrop-blur-sm border border-blue-700/50 mr-2">
                  ID: {student?.student_id || '...'}
                </span>
                <span className="inline-block bg-blue-800/50 px-3 py-1 rounded-full text-xs md:text-sm backdrop-blur-sm border border-blue-700/50">
                  Class: {student?.classes?.name || '...'}
                </span>
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-inner">
                <User className="w-10 h-10 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Withheld Banner */}
        {student?.results_withheld && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8 rounded-r-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-bold text-red-800">Results Withheld</h3>
                <div className="mt-1 text-sm text-red-700">
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
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-blue-50 p-2.5 rounded-lg group-hover:bg-blue-100 transition-colors">
                <Calendar className="w-5 h-5 text-methodist-blue" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Term</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{stats.currentTerm}</p>
              <p className="text-xs text-gray-500 mt-1">Current Academic Term</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-green-50 p-2.5 rounded-lg group-hover:bg-green-100 transition-colors">
                <BarChart3 className="w-5 h-5 text-ghana-green" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Attendance</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">{stats.attendance}</p>
              <p className="text-xs text-gray-500 mt-1">Days Present / Total</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-purple-50 p-2.5 rounded-lg group-hover:bg-purple-100 transition-colors">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Avg. Score</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {student?.results_withheld ? '---' : (stats.averageScore > 0 ? `${stats.averageScore}%` : 'No Data')}
              </p>
              <p className="text-xs text-gray-500 mt-1">Across all subjects</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between hover:shadow-md transition-all duration-300 group">
            <div className="flex justify-between items-start mb-2">
              <div className="bg-yellow-50 p-2.5 rounded-lg group-hover:bg-yellow-100 transition-colors">
                <FileText className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Position</span>
            </div>
            <div>
              <p className="text-xl md:text-2xl font-bold text-gray-800">
                {student?.results_withheld ? '---' : stats.classPosition}
              </p>
              <p className="text-xs text-gray-500 mt-1">Class Ranking</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
          <span className="w-1 h-6 bg-methodist-blue rounded-full mr-2"></span>
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <Link href="/student/report-card" className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-green-200 transition-all duration-300 flex items-start space-x-4">
            <div className="bg-green-50 p-3 rounded-xl group-hover:bg-green-100 transition-colors">
              <BookOpen className="w-6 h-6 text-ghana-green" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 group-hover:text-ghana-green transition-colors">Results</h3>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Check your exam scores and grades</p>
            </div>
          </Link>

          <Link href="/student/attendance" className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all duration-300 flex items-start space-x-4">
            <div className="bg-purple-50 p-3 rounded-xl group-hover:bg-purple-100 transition-colors">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors">Attendance</h3>
              <p className="text-sm text-gray-500 mt-1 leading-tight">View attendance records</p>
            </div>
          </Link>

          <Link href="/student/performance" className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-yellow-200 transition-all duration-300 flex items-start space-x-4">
            <div className="bg-yellow-50 p-3 rounded-xl group-hover:bg-yellow-100 transition-colors">
              <BarChart3 className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 group-hover:text-yellow-600 transition-colors">Performance</h3>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Track your academic progress</p>
            </div>
          </Link>

          {allowCumulativeDownload ? (
            <Link href="/student/cumulative" className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-orange-200 transition-all duration-300 flex items-start space-x-4">
              <div className="bg-orange-50 p-3 rounded-xl group-hover:bg-orange-100 transition-colors">
                <FileText className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">Cumulative Record</h3>
                <p className="text-sm text-gray-500 mt-1 leading-tight">View full academic history</p>
              </div>
            </Link>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 flex items-start space-x-4 opacity-75 cursor-not-allowed relative overflow-hidden">
              <div className="bg-gray-200 p-3 rounded-xl">
                <FileText className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-500 flex items-center gap-2">
                  Cumulative Record
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full uppercase tracking-wide font-semibold">Locked</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1 leading-tight">Available when released by admin</p>
              </div>
            </div>
          )}

          <Link href="/student/profile" className="group bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex items-start space-x-4">
            <div className="bg-indigo-50 p-3 rounded-xl group-hover:bg-indigo-100 transition-colors">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">My Profile</h3>
              <p className="text-sm text-gray-500 mt-1 leading-tight">Update your information</p>
            </div>
          </Link>
        </div>

        {/* Recent Announcements */}
        <div className="mt-10">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <span className="w-1 h-6 bg-methodist-gold rounded-full mr-2"></span>
            Recent Announcements
          </h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {announcements.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-gray-300" />
                </div>
                <p className="text-base font-medium text-gray-600">No announcements at this time</p>
                <p className="text-sm text-gray-400 mt-1">Check back later for updates from your school</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {announcements.map((announcement) => (
                  <div 
                    key={announcement.id} 
                    className="p-5 hover:bg-gray-50 transition-colors duration-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {announcement.priority === 'urgent' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Urgent
                          </span>
                        )}
                        {announcement.priority === 'high' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                            Important
                          </span>
                        )}
                        {announcement.category === 'academic' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Academic
                          </span>
                        )}
                        <h4 className="font-bold text-gray-800 text-base">{announcement.title}</h4>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                        {formatTimeAgo(announcement.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{announcement.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
