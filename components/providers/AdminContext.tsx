'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

type AdminContextType = {
  user: any | null
  profile: any | null
  loading: boolean
  refreshProfile: () => Promise<void>
}

const AdminContext = createContext<AdminContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
})

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [user, setUser] = useState<any | null>(null)
  const [profile, setProfile] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser()
      
      if (!currentUser) {
        // Don't redirect here, let the page handle it or middleware
        // But for a layout, we might want to redirect if strict
        setUser(null)
        setLoading(false)
        return
      }

      setUser(currentUser)

      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()
      
      if (profileData) {
        setProfile(profileData)
        
        // Sync theme
        if (profileData.theme) {
          if (profileData.theme === 'dark') {
            document.documentElement.classList.add('dark')
            localStorage.theme = 'dark'
          } else if (profileData.theme === 'light') {
            document.documentElement.classList.remove('dark')
            localStorage.theme = 'light'
          }
        }
      }
    } catch (error) {
      console.error('Error loading admin context:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  const refreshProfile = async () => {
    if (user) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profileData) {
        setProfile(profileData)
      }
    }
  }

  return (
    <AdminContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AdminContext.Provider>
  )
}

export const useAdmin = () => useContext(AdminContext)
