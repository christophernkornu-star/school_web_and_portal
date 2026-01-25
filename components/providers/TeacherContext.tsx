'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getTeacherData } from '@/lib/auth'

type TeacherContextType = {
  user: any | null
  profile: any | null
  teacher: any | null
  loading: boolean
  refreshTeacher: () => Promise<void>
}

const TeacherContext = createContext<TeacherContextType>({
  user: null,
  profile: null,
  teacher: null,
  loading: true,
  refreshTeacher: async () => {},
})

export function TeacherProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [teacher, setTeacher] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

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
    <TeacherContext.Provider value={{ user, profile, teacher, loading, refreshTeacher }}>
      {children}
    </TeacherContext.Provider>
  )
}

export const useTeacher = () => useContext(TeacherContext)
