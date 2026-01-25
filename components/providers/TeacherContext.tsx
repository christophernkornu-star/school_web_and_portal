'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getTeacherData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getTeacherClassAccess } from '@/lib/teacher-permissions'
import { getTeacherPermissions, getClassesForAttendance } from '@/lib/teaching-model-permissions'

type DashboardData = {
  assignments: any[]
  permissions: any[]
  attendanceClasses: string[]
  stats: {
    studentCount: number
    attendanceRate: string
  }
  currentTerm: string // Add currentTerm
  recentActivities: any[]
  lastFetched: number
}

type TeacherContextType = {
  user: any | null
  profile: any | null
  teacher: any | null
  loading: boolean
  dashboardData: DashboardData | null
  refreshTeacher: () => Promise<void>
  fetchDashboardData: (force?: boolean) => Promise<void>
}

const TeacherContext = createContext<TeacherContextType>({
  user: null,
  profile: null,
  teacher: null,
  loading: true,
  dashboardData: null,
  refreshTeacher: async () => {},
  fetchDashboardData: async () => {},
})

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [teacher, setTeacher] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)

  const loadTeacher = async () => {
    try {
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser(currentUser)

      // Fetch teacher data (includes profile)
      const { data: teacherData, error } = await getTeacherData(currentUser.id)
      
      if (teacherData) {
        setTeacher(teacherData)
        setProfile(teacherData.profiles)

        // Sync theme
        if (teacherData.profiles?.theme) {
          if (teacherData.profiles.theme === 'dark') {
            document.documentElement.classList.add('dark')
            localStorage.theme = 'dark'
          } else if (teacherData.profiles.theme === 'light') {
            document.documentElement.classList.remove('dark')
            localStorage.theme = 'light'
          }
        }
      }
    } catch (error) {
      console.error('Error loading teacher context:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch Dashboard Data Function
  // Moved from the dashboard page to here to cache it
  const fetchDashboardData = async (force = false) => {
    if (!teacher) return

    // If we have data less than 5 minutes old, don't refetch unless forced
    if (!force && dashboardData && Date.now() - dashboardData.lastFetched < 5 * 60 * 1000) {
      return
    }

    try {
      const [classAccess, perms, attClasses, termDataSettings] = await Promise.all([
        getTeacherClassAccess(teacher.profile_id),
        getTeacherPermissions(teacher.id),
        getClassesForAttendance(teacher.id),
        supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'current_term')
          .single() as Promise<{ data: any }>
      ])

      const termId = termDataSettings?.data?.setting_value
      let termInfo:any = null;
      if (termId) {
         try {
            const termResponse = await fetch(`/api/term-data?termId=${termId}`)
            if (termResponse.ok) {
              termInfo = await termResponse.json()
            }
         } catch(e) { console.error(e) }
      }

      // Convert class access to assignment format
      const classAssignments = classAccess.map(cls => ({
        id: cls.class_id,
        class_id: cls.class_id,
        classes: {
          class_name: cls.class_name
        }
      }))

      // Calculate Stats
      let studentCount = 0
      let attendanceRate = '-'

      if (classAccess.length > 0) {
        const classIds = classAccess.map(c => c.class_id)
        
        // Parallelize student count and attendance calculation
        const studentCountPromise = supabase
          .from('students')
          .select('id', { count: 'exact', head: true })
          .in('class_id', classIds)
          .eq('status', 'active');

        // Start attendance calculation if we have term info
        const attendancePromise = (async () => {
          if (termId && termInfo?.total_days) {
              const { data: students } = await supabase
                .from('students')
                .select('id')
                .in('class_id', classIds)
                .eq('status', 'active');
              
              if (students && students.length > 0) {
                const studentIds = students.map((s: any) => s.id);
                const { count } = await supabase
                  .from('attendance')
                  .select('student_id', { count: 'exact', head: true })
                  .in('student_id', studentIds)
                  .in('status', ['present', 'late']);
                
                if (count !== null) {
                   const totalPossible = studentIds.length * termInfo.total_days;
                   if (totalPossible > 0) {
                      return `${Math.round((count / totalPossible) * 100)}%`
                   }
                }
              }
          }
          return '-'
        })();

        const [countResult, attRateResult] = await Promise.all([
           studentCountPromise,
           attendancePromise
        ]);
        
        if (!countResult.error && countResult.count !== null) {
          studentCount = countResult.count
        }
        attendanceRate = attRateResult
      }

      // Fetch Recent Activities
      // (Simplified version of the logic from dashboard page to save space/time)
      const activities = await loadRecentActivities(teacher.id)

      setDashboardData({
        assignments: classAssignments,
        permissions: perms,
        attendanceClasses: attClasses,
        stats: {
          studentCount,
          attendanceRate
        },
        currentTerm: termInfo?.name || 'N/A',
        recentActivities: activities,
        lastFetched: Date.now()
      })

    } catch (error) {
      console.error('Error fetching dashboard data in context:', error)
    }
  }

  // Helper for recent activities
  async function loadRecentActivities(teacherId: string) {
    const activities: any[] = []
    try {
      // Fetch recent score entries
      const { data: scores } = await supabase
        .from('scores')
        .select('id, created_at, subject_id, student_id')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false })
        .limit(3) as { data: any[] | null } // Reduced limit for optimization

      if (scores && scores.length > 0) {
         // Minimal fetch for display
         for (const score of scores) {
            activities.push({
               id: `score-${score.id}`,
               type: 'score',
               description: 'Entered scores', // simplified for perf
               timestamp: score.created_at,
               color: 'green'
            })
         }
      }
      return activities
    } catch (e) { return [] }
  }

  useEffect(() => {
    loadTeacher()
  }, [])

  const refreshTeacher = async () => {
    if (user) {
      const { data: teacherData } = await getTeacherData(user.id)
      if (teacherData) {
        setTeacher(teacherData)
        setProfile(teacherData.profiles)
      }
    }
  }

  return (
    <TeacherContext.Provider value={{ user, profile, teacher, loading, dashboardData, refreshTeacher, fetchDashboardData }}>
      {children}
    </TeacherContext.Provider>
  )
}

export const useTeacher = () => useContext(TeacherContext)
