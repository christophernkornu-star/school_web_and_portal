'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: 'admin' | 'teacher' | 'student'
  redirectTo?: string
}

export default function AuthGuard({ children, requiredRole, redirectTo = '/login' }: AuthGuardProps) {
  const supabase = getSupabaseBrowserClient()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const checkAuth = useCallback(async () => {
    try {
      // Use getSession first - it doesn't throw errors
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.log('Session error:', sessionError)
        router.push(redirectTo)
        return
      }
      
      if (!session) {
        // Try refreshing the session once before giving up
        const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
        
        if (!refreshedSession) {
          console.log('No session found after refresh, redirecting to login')
          router.push(redirectTo)
          return
        }
        
        // Continue with refreshed session
        const user = refreshedSession.user
        await checkUserRole(user.id)
        return
      }

      const user = session.user
      await checkUserRole(user.id)
      
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsLoading(false)
    }
  }, [supabase, router, redirectTo, requiredRole])

  const checkUserRole = async (userId: string) => {
    // If no specific role is required, just being logged in is enough
    if (!requiredRole) {
      setIsAuthorized(true)
      setIsLoading(false)
      return
    }

    // Check user role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single() as { data: any, error: any }

    if (error) {
      console.error('Error fetching profile:', error)
      setIsLoading(false)
      return
    }
    
    if (!profile) {
      console.error('No profile found for user')
      setIsLoading(false)
      return
    }

    if (profile.role !== requiredRole) {
      console.warn(`Access denied: User role ${profile.role} does not match required role ${requiredRole}`)
      router.push(`/${profile.role}/dashboard`)
      return
    }

    setIsAuthorized(true)
    setIsLoading(false)
  }

  useEffect(() => {
    checkAuth()
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: any, session: any) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthorized(false)
        router.push(redirectTo)
      } else if (event === 'SIGNED_IN' && session) {
        checkAuth()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [checkAuth, supabase, router, redirectTo])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Login
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
