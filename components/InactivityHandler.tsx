'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'

const INACTIVITY_LIMIT = 30 * 60 * 1000 // 30 minutes in milliseconds

export default function InactivityHandler() {
  const router = useRouter()
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(handleLogout, INACTIVITY_LIMIT)
    }

    const handleLogout = async () => {
      try {
        await signOut()
        router.push('/login?reason=inactivity')
      } catch (error) {
        console.error('Error signing out due to inactivity:', error)
      }
    }

    // Events to track activity
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart']

    // Add event listeners
    events.forEach((event) => {
      document.addEventListener(event, resetTimer)
    })

    // Initial timer start
    resetTimer()

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer)
      })
    }
  }, [router])

  return null
}
