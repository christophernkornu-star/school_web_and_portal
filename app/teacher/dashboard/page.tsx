'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, Users, FileText, BarChart3, LogOut, BookOpen, Calendar, AlertCircle, Camera, CheckCircle, TrendingUp, DollarSign, Printer } from 'lucide-react'
import { getCurrentUser, getTeacherData, getTeacherAssignments, signOut } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { getTeacherPermissions, getClassesForAttendance } from '@/lib/teaching-model-permissions'
import { ClassPermissionCard } from '@/components/TeachingModelComponents'

export default function TeacherDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [profile, setProfile] = useState<any>(null)
  const [teacher, setTeacher] = useState<any>(null)
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
    async function loadUserData() {
      try {
        const user = await getCurrentUser()
        
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }

        const { data: teacherData, error: teacherError } = await getTeacherData(user.id)
        
        if (teacherError) {
          setError('Failed to load teacher data. Please try again.')
          console.error('Teacher data error:', teacherError)
          setLoading(false)
          return
        }

        if (!teacherData) {
          setError('Teacher profile not found. Please contact the administrator.')
          setLoading(false)
          return
        }
        
        setTeacher(teacherData)
        setProfile(teacherData.profiles)
        
        // Load teacher class assignments and related data
        try {
          const classAccess = await getTeacherClassAccess(teacherData.profile_id)
          
          // Convert class access to assignment format for display
          const classAssignments = classAccess.map(cls => ({
            id: cls.class_id,
            class_id: cls.class_id,
            classes: {
              class_name: cls.class_name
            }
          }))
          setAssignments(classAssignments)

          // Load teaching model permissions
          const perms = await getTeacherPermissions(teacherData.id)
          setPermissions(perms)

          // Load classes where teacher can mark attendance
          const attClasses = await getClassesForAttendance(teacherData.id)
          setAttendanceClasses(attClasses)

          // Load student count from teacher's assigned classes
          if (classAccess.length > 0) {
            const classIds = classAccess.map(c => c.class_id)
            const { count, error: countError } = await supabase
              .from('students')
              .select('*', { count: 'exact', head: true })
              .in('class_id', classIds)
              .eq('status', 'active')
            
            if (!countError && count !== null) {
              setStudentCount(count)
            }

            // Calculate attendance rate for teacher's classes
            try {
              // Get current term ID
              const { data: termData } = await supabase
                .from('system_settings')
                .select('setting_value')
                .eq('setting_key', 'current_term')
                .single() as { data: any }
              
              if (termData?.setting_value) {
                // Get all students in teacher's classes
                const { data: students } = await supabase
                  .from('students')
                  .select('id')
                  .in('class_id', classIds)
                  .eq('status', 'active') as { data: any[] | null }
                
                if (students && students.length > 0) {
                  const studentIds = students.map((s: any) => s.id)
                  
                  // Get attendance records - count present/late days per student
                  const { data: attendance } = await supabase
                    .from('attendance')
                    .select('student_id')
                    .in('student_id', studentIds)
                    .in('status', ['present', 'late']) as { data: any[] | null }
                  
                  // Get total days in term via API to bypass RLS
                  let termInfo = null
                  try {
                    const termResponse = await fetch(`/api/term-data?termId=${termData.setting_value}`)
                    if (termResponse.ok) {
                      termInfo = await termResponse.json()
                    }
                  } catch (e) {
                    console.error('Error fetching term info:', e)
                  }
                  
                  if (attendance && termInfo?.total_days) {
                    const totalPresent = attendance.length
                    const totalPossible = studentIds.length * termInfo.total_days
                    
                    if (totalPossible > 0) {
                      const rate = Math.round((totalPresent / totalPossible) * 100)
                      setAttendanceRate(`${rate}%`)
                    } else {
                      setAttendanceRate('0%')
                    }
                  }
                }
              }
            } catch (err) {
              console.error('Error calculating attendance rate:', err)
            }
          }
        } catch (err) {
          console.error('Error loading class assignments:', err)
        }

        // Load current term from system settings
        try {
          const { data: termData } = await supabase
            .from('system_settings')
            .select('setting_value')
            .eq('setting_key', 'current_term')
            .single() as { data: any }
          
          if (termData?.setting_value) {
            // Fetch the actual term name using API to bypass RLS
            try {
              const termResponse = await fetch(`/api/term-data?termId=${termData.setting_value}`)
              if (termResponse.ok) {
                const term = await termResponse.json()
                if (term) {
                  setCurrentTerm(`${term.name} (${term.academic_year})`)
                } else {
                  setCurrentTerm('N/A')
                }
              } else {
                setCurrentTerm('N/A')
              }
            } catch (e) {
              console.error('Error fetching term:', e)
              setCurrentTerm('N/A')
            }
          }
        } catch (err) {
          console.error('Error loading current term:', err)
        }

        // Load recent activities
        if (teacherData?.id) {
          try {
            await loadRecentActivities(teacherData.id)
          } catch (err) {
            console.error('Error loading recent activities:', err)
          }
        }
      } catch (err: any) {
        console.error('Unexpected error:', err)
        setError('An unexpected error occurred. Please refresh the page.')
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [router])

  async function loadRecentActivities(teacherId: string) {
    const activities: any[] = []

    try {
      // Fetch recent score entries
      const { data: scores } = await supabase
        .from('scores')
        .select('id, created_at, subject_id, student_id')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(5) as { data: any[] | null }

      if (scores && scores.length > 0) {
        // Get unique subject and student IDs
        const subjectIds = [...new Set(scores.map((s: any) => s.subject_id).filter(Boolean))]
        const studentIds = [...new Set(scores.map((s: any) => s.student_id).filter(Boolean))]
        
        // Batch fetch subjects
        const { data: subjects } = await supabase
          .from('subjects')
          .select('id, name')
          .in('id', subjectIds) as { data: any[] | null }
        const subjectMap = new Map(subjects?.map((s: any) => [s.id, s.name]))
        
        // Batch fetch students with their classes
        const { data: students } = await supabase
          .from('students')
          .select('id, class_id')
          .in('id', studentIds) as { data: any[] | null }
        const studentClassMap = new Map(students?.map((s: any) => [s.id, s.class_id]))
        
        // Batch fetch classes
        const classIds = [...new Set(students?.map((s: any) => s.class_id).filter(Boolean) || [])]
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds) as { data: any[] | null }
        const classMap = new Map(classes?.map((c: any) => [c.id, c.name]))
        
        // Create activities
        for (const score of scores) {
          const subjectName = subjectMap.get(score.subject_id) || 'Unknown Subject'
          const classId = studentClassMap.get(score.student_id)
          const className = classId ? (classMap.get(classId) || 'Unknown Class') : 'Unknown Class'
          
          activities.push({
            id: `score-${score.id}`,
            type: 'score',
            description: `Entered scores for ${subjectName} - ${className}`,
            timestamp: score.created_at,
            color: 'green'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching score activities:', err)
    }

    try {
      // Fetch recent attendance records (if table exists and has teacher_id)
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .limit(5)
        .order('created_at', { ascending: false }) as { data: any[] | null }

      if (attendance && attendance.length > 0) {
        // Filter by teacher if column exists
        const teacherAttendance = attendance.filter((a: any) => 
          !a.teacher_id || a.teacher_id === teacherId
        )
        
        // Get class IDs and fetch class names
        const classIds = [...new Set(teacherAttendance.map((a: any) => a.class_id).filter(Boolean))]
        const { data: classes } = await supabase
          .from('classes')
          .select('id, name')
          .in('id', classIds) as { data: any[] | null }
        const classMap = new Map(classes?.map((c: any) => [c.id, c.name]))
        
        for (const record of teacherAttendance.slice(0, 5)) {
          const className = classMap.get(record.class_id) || 'Unknown Class'
          activities.push({
            id: `attendance-${record.id}`,
            type: 'attendance',
            description: `Marked attendance for ${className}`,
            timestamp: record.created_at,
            color: 'blue'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching attendance activities:', err)
    }

    try {
      // Fetch recent assessments (table has limited columns: id, created_at, title)
      // Note: assessments table doesn't have teacher_id, so we fetch recent ones
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, created_at, title')
        .order('created_at', { ascending: false })
        .limit(10) as { data: any[] | null }

      if (assessments && assessments.length > 0) {
        // Since we can't filter by teacher, just take the most recent ones
        for (const assessment of assessments.slice(0, 3)) {
          const displayName = assessment.title || 'Assessment'
          
          activities.push({
            id: `assessment-${assessment.id}`,
            type: 'assessment',
            description: `Assessment created: ${displayName}`,
            timestamp: assessment.created_at,
            color: 'purple'
          })
        }
      }
    } catch (err) {
      console.error('Error fetching assessment activities:', err)
    }

    // Sort all activities by timestamp and take the 5 most recent
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    setRecentActivities(activities.slice(0, 5))
  }

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
    return past.toLocaleDateString()
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=teacher')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-ghana-green mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  if (!teacher || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto text-center">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Profile Not Found</h2>
              <p className="text-gray-600 mb-6">
                Your teacher profile could not be found. Please contact the school administrator.
              </p>
            <button
              onClick={handleLogout}
              className="w-full bg-ghana-green text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
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
                  <p className="text-[10px] md:text-xs text-methodist-blue font-semibold">Teacher Portal</p>
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
        <div className="bg-gradient-to-r from-methodist-blue to-blue-800 text-white rounded-lg p-8 mb-8 shadow-lg">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome, {teacher?.first_name} {teacher?.middle_name ? `${teacher.middle_name} ` : ''}{teacher?.last_name}!
            </h2>
            <p className="text-blue-100 text-sm md:text-base">
              Teacher ID: {teacher?.teacher_id} | {teacher?.specialization || 'General Education'}
            </p>
            <p className="text-blue-100 text-xs md:text-sm mt-2">
              You are assigned to {assignments.length} class{assignments.length !== 1 ? 'es' : ''}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Classes</p>
                <p className="text-xl md:text-2xl font-bold text-ghana-green">{assignments.length}</p>
              </div>
              <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-green-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Total Students</p>
                <p className="text-xl md:text-2xl font-bold text-blue-600">{studentCount}</p>
              </div>
              <Users className="w-8 h-8 md:w-10 md:h-10 text-blue-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Attendance Rate</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-600">{attendanceRate}</p>
              </div>
              <FileText className="w-8 h-8 md:w-10 md:h-10 text-yellow-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-xs md:text-sm">Current Term</p>
                <p className="text-sm md:text-lg font-bold text-purple-600">{currentTerm}</p>
              </div>
              <Calendar className="w-8 h-8 md:w-10 md:h-10 text-purple-200" />
            </div>
          </div>
        </div>

        {/* My Classes/Assignments with Teaching Model Context */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-t-4 border-ghana-green">
          <h3 className="text-lg md:text-xl font-bold text-methodist-blue mb-4 flex items-center">
            <BookOpen className="w-6 h-6 mr-2 text-ghana-green" />
            My Class Assignments
          </h3>
          
          {attendanceClasses.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs md:text-sm text-yellow-800">
                <strong>Class Teacher Responsibilities:</strong> You can mark attendance and manage students for {attendanceClasses.length} class{attendanceClasses.length !== 1 ? 'es' : ''}.
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.length === 0 ? (
              <p className="text-gray-500 col-span-full text-center py-8">
                No class assignments found. Please contact the administrator.
              </p>
            ) : (
              permissions.map((perm) => (
                <ClassPermissionCard
                  key={perm.class_id}
                  className={perm.class_name}
                  teachingModel={perm.teaching_model}
                  isClassTeacher={perm.is_class_teacher}
                  subjectCount={perm.subjects.filter((s: any) => s.can_edit).length}
                  canMarkAttendance={perm.can_mark_attendance}
                />
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <h3 className="text-lg md:text-xl font-bold text-methodist-blue mb-4 flex items-center">
          <BarChart3 className="w-6 h-6 mr-2 text-methodist-gold" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Link href="/teacher/manage-scores" className="dashboard-card">
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2 md:space-x-4">
                <div className="bg-blue-100 p-2 md:p-4 rounded-lg">
                  <FileText className="w-5 h-5 md:w-8 md:h-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xs md:text-lg text-gray-800">Manage Scores</h3>
                  <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">Assessments, Exams & Grades</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 pl-2 pt-2 border-t border-gray-100">
                <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-ghana-green" />
                <span className="text-[10px] md:text-xs text-ghana-green font-medium">Unified Score Management</span>
              </div>
            </div>
          </Link>

          <Link href="/teacher/students" className="dashboard-card">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-green-100 p-2 md:p-4 rounded-lg">
                <Users className="w-5 h-5 md:w-8 md:h-8 text-ghana-green" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-lg text-gray-800">My Students</h3>
                <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">View student information</p>
              </div>
            </div>
          </Link>

          <Link href="/teacher/performance" className="dashboard-card">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-purple-100 p-2 md:p-4 rounded-lg">
                <BarChart3 className="w-5 h-5 md:w-8 md:h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-lg text-gray-800">Performance Analytics</h3>
                <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">Track student progress</p>
              </div>
            </div>
          </Link>

          <Link href="/teacher/promotions" className="dashboard-card">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-indigo-100 p-2 md:p-4 rounded-lg">
                <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-lg text-gray-800">Student Promotions</h3>
                <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">End-of-year promotion decisions</p>
              </div>
            </div>
          </Link>

          <Link href="/teacher/attendance" className="dashboard-card">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-yellow-100 p-2 md:p-4 rounded-lg">
                <Calendar className="w-5 h-5 md:w-8 md:h-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-lg text-gray-800">Mark Attendance</h3>
                <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">Record student attendance</p>
              </div>
            </div>
          </Link>

          <Link href="/teacher/reports" className="dashboard-card">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-indigo-100 p-2 md:p-4 rounded-lg">
                <FileText className="w-5 h-5 md:w-8 md:h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-lg text-gray-800">Generate Reports</h3>
                <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">Class performance reports</p>
              </div>
            </div>
          </Link>

          <Link href="/teacher/fees" className="dashboard-card">
            <div className="flex items-center space-x-2 md:space-x-4">
              <div className="bg-green-100 p-2 md:p-4 rounded-lg">
                <DollarSign className="w-5 h-5 md:w-8 md:h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-xs md:text-lg text-gray-800">Fee Collection</h3>
                <p className="text-[10px] md:text-sm text-gray-600 hidden md:block">Record student payments</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Recent Activity</h3>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className={`flex items-center justify-between py-2 ${index < recentActivities.length - 1 ? 'border-b' : ''}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 bg-${activity.color}-500 rounded-full`}></div>
                    <span className="text-xs md:text-sm text-gray-700">{activity.description}</span>
                  </div>
                  <span className="text-[10px] md:text-sm text-gray-500" suppressHydrationWarning>
                    {getTimeAgo(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No recent activity</p>
              <p className="text-xs md:text-sm mt-2">Start entering scores or marking attendance to see activity here</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
