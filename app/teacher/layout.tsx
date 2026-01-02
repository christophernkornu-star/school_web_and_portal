'use client'

import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const syncTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('theme')
            .eq('id', user.id)
            .single()
          
          if (profile?.theme) {
            if (profile.theme === 'dark') {
              document.documentElement.classList.add('dark')
              localStorage.theme = 'dark'
            } else if (profile.theme === 'light') {
              document.documentElement.classList.remove('dark')
              localStorage.theme = 'light'
            }
          }
        }
      } catch (error) {
        console.error('Error syncing theme:', error)
      }
    }
    
    syncTheme()
  }, [])

  return <>{children}</>
}
