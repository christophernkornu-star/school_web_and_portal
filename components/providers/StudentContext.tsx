'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getStudentData } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

type Announcement = {
  id: string
  title: string
  content: string
  target_audience: string[]
  priority: 'low' | 'normal' | 'high' | 'urgent'
  created_at: string
  category?: string
}

type StudentDashboardData = {
  announcements: Announcement[]
  allowCumulativeDownload: boolean
  stats: {
    currentTerm: string
    attendance: number | string
    averageScore: number
    classPosition: string
  }
  lastFetched: number
}

type StudentContextType = {
  user: any | null
  profile: any | null
  student: any | null
  loading: boolean
  dashboardData: StudentDashboardData | null
  refreshStudent: () => Promise<void>
  fetchDashboardData: (force?: boolean) => Promise<void>
}

const StudentContext = createContext<StudentContextType>({
  user: null,
  profile: null,
  student: null,
  loading: true,
  dashboardData: null,
  refreshStudent: async () => {},
  fetchDashboardData: async () => {},
})

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [student, setStudent] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null)

  const loadStudent = async () => {
    try {
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        setUser(null)
        setLoading(false)
        return
      }

      setUser(currentUser)

      // Fetch student data (includes profile and classes)
      const { data: studentData, error } = await getStudentData(currentUser.id)
      
      if (studentData) {
        setStudent(studentData)
        setProfile(studentData.profiles)

        // Sync theme
        if (studentData.profiles?.theme) {
          if (studentData.profiles.theme === 'dark') {
            document.documentElement.classList.add('dark')
            localStorage.theme = 'dark'
          } else if (studentData.profiles.theme === 'light') {
            document.documentElement.classList.remove('dark')
            localStorage.theme = 'light'
          }
        }
      }
    } catch (error) {
      console.error('Error loading student context:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDashboardData = async (force = false) => {
    if (!student) return

    if (!force && dashboardData && Date.now() - dashboardData.lastFetched < 5 * 60 * 1000) {
      return
    }

    try {
      // Parallelize Fetching
      const loadAnnouncementsPromise = (async () => {
         const now = new Date().toISOString()
         const { data } = await supabase
           .from('announcements')
           .select('*')
           .eq('published', true)
           .or(`expires_at.is.null,expires_at.gt.${now}`)
           .order('created_at', { ascending: false })
           .limit(5)
         
         if (data) {
           return data.filter((a: any) => {
             if (!a.target_audience) return true
             const audience = a.target_audience
             return audience.includes('students') || audience.includes('parents') || audience.includes('all')
           })
         }
         return []
      })();

      const loadSettingsPromise = supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'allow_cumulative_download')
        .maybeSingle()

      const loadStatsPromise = (async () => {
            let classPosition = 'N/A'
            let averageScore = 0
            let attendance = 'No Data'
            let currentTerm = 'N/A'

            const { data: termSetting } = await supabase
               .from('system_settings')
               .select('setting_value')
               .eq('setting_key', 'current_term')
               .single()
               
            const currentTermId = termSetting?.setting_value
            
            if (currentTermId) {
               const { data: term } = await supabase
                 .from('academic_terms')
                 .select('name, academic_year')
                 .eq('id', currentTermId)
                 .single()
               if (term) currentTerm = `${term.name} ${term.academic_year}`
               
               if (student?.class_id && student?.id) {
                   try {
                       const rankRes = await fetch(`/api/class-rankings?classId=${student.class_id}&termId=${currentTermId}`)
                       if (rankRes.ok) {
                           const rankData = await rankRes.json()
                           const classScores = rankData.scores || []
                           const uniqueSubjects = new Set(classScores.map((s: any) => s.subject_id))
                           const totalSubjs = uniqueSubjects.size || 1
                           const totals: Record<string, number> = {}
                           
                           classScores.forEach((s: any) => { 
                               if (!totals[s.student_id]) totals[s.student_id] = 0
                               totals[s.student_id] += (s.total || 0) 
                           })
                           
                           const sorted = Object.entries(totals)
                               .map(([sid, t]) => ({sid, avg: t/totalSubjs}))
                               .sort((a,b) => b.avg - a.avg)
                           
                           const pIdx = sorted.findIndex(s => s.sid === student.id)
                           if (pIdx >= 0) {
                               const pos = pIdx + 1
                               
                               const pr = new Intl.PluralRules("en-US", { type: "ordinal" })
                               const suffixes = new Map([
                                   ["one", "st"],
                                   ["two", "nd"],
                                   ["few", "rd"],
                                   ["other", "th"]
                               ])
                               const suffix = suffixes.get(pr.select(pos)) || "th"
                               
                               classPosition = `${pos}${suffix} / ${rankData.totalClassSize || 1}`
                               averageScore = Math.round(sorted[pIdx].avg * 10) / 10
                           }
                       }
                   } catch (e) {
                       console.error('Failed to get student ranking stats', e)
                   }
               }
            }
  
            return { 
               currentTerm,
               attendance, 
               averageScore, 
               classPosition 
            }
      })();

      const [announcements, settings, stats] = await Promise.all([
         loadAnnouncementsPromise,
         loadSettingsPromise,
         loadStatsPromise
      ])

      setDashboardData({
        announcements,
        allowCumulativeDownload: settings.data?.setting_value === 'true',
        stats,
        lastFetched: Date.now()
      })

    } catch (error) {
      console.error('Error fetching student dashboard data:', error)
    }
  }

  useEffect(() => {
    loadStudent()
  }, [])

  const refreshStudent = async () => {
    if (user) {
      const { data: studentData } = await getStudentData(user.id)
      if (studentData) {
        setStudent(studentData)
        setProfile(studentData.profiles)
      }
    }
  }

  return (
    <StudentContext.Provider value={{ user, profile, student, loading, dashboardData, refreshStudent, fetchDashboardData }}>
      {children}
    </StudentContext.Provider>
  )
}

export const useStudent = () => useContext(StudentContext)
