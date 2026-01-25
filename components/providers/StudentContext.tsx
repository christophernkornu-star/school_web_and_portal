'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser, getStudentData } from '@/lib/auth'

type StudentContextType = {
  user: any | null
  profile: any | null
  student: any | null
  loading: boolean
  refreshStudent: () => Promise<void>
}

const StudentContext = createContext<StudentContextType>({
  user: null,
  profile: null,
  student: null,
  loading: true,
  refreshStudent: async () => {},
})

export function StudentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [student, setStudent] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

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
    <StudentContext.Provider value={{ user, profile, student, loading, refreshStudent }}>
      {children}
    </StudentContext.Provider>
  )
}

export const useStudent = () => useContext(StudentContext)
