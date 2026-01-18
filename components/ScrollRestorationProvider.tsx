'use client'

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// Global scroll positions store
const scrollPositions = new Map<string, number>()

// Navigation history stack to track back/forward navigation
const navigationHistory: string[] = []

interface ScrollRestorationContextType {
  saveCurrentPosition: () => void
  clearPosition: (path?: string) => void
  clearAll: () => void
}

const ScrollRestorationContext = createContext<ScrollRestorationContextType | null>(null)

export function useScrollRestorationContext() {
  const context = useContext(ScrollRestorationContext)
  if (!context) {
    throw new Error('useScrollRestorationContext must be used within ScrollRestorationProvider')
  }
  return context
}

interface ScrollRestorationProviderProps {
  children: ReactNode
}

export function ScrollRestorationProvider({ children }: ScrollRestorationProviderProps) {
  const pathname = usePathname()
  const previousPathRef = useRef<string | null>(null)
  const isInitialMount = useRef(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Save scroll position for a given path
  const savePosition = useCallback((path: string, position: number) => {
    scrollPositions.set(path, position)
  }, [])

  // Save current scroll position
  const saveCurrentPosition = useCallback(() => {
    savePosition(pathname, window.scrollY)
  }, [pathname, savePosition])

  // Clear scroll position
  const clearPosition = useCallback((path?: string) => {
    scrollPositions.delete(path || pathname)
  }, [pathname])

  // Clear all scroll positions
  const clearAll = useCallback(() => {
    scrollPositions.clear()
    navigationHistory.length = 0
  }, [])

  // Handle scroll events - save position continuously
  useEffect(() => {
    const handleScroll = () => {
      // Debounce scroll position saving
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
      scrollTimeoutRef.current = setTimeout(() => {
        savePosition(pathname, window.scrollY)
      }, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [pathname, savePosition])

  // Handle navigation and scroll restoration
  useEffect(() => {
    // Skip initial mount - don't restore on first page load
    if (isInitialMount.current) {
      isInitialMount.current = false
      previousPathRef.current = pathname
      return
    }

    // Save scroll position of previous page before leaving
    if (previousPathRef.current && previousPathRef.current !== pathname) {
      // Already saved by scroll handler, but ensure final position is saved
    }

    // Check if this is a back navigation (going to a page we've been to before)
    const savedPosition = scrollPositions.get(pathname)
    const isBackNavigation = navigationHistory.includes(pathname)

    // Update navigation history
    if (!isBackNavigation) {
      navigationHistory.push(pathname)
      // Keep history manageable
      if (navigationHistory.length > 50) {
        navigationHistory.shift()
      }
    }

    // Restore scroll position if we have one saved
    if (savedPosition !== undefined && savedPosition > 0) {
      // Multiple attempts to ensure scroll works after content loads
      const restoreScroll = () => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' })
      }

      // Immediate attempt
      restoreScroll()

      // Delayed attempts for dynamic content
      requestAnimationFrame(restoreScroll)
      setTimeout(restoreScroll, 50)
      setTimeout(restoreScroll, 150)
      setTimeout(restoreScroll, 300)
    } else {
      // New page - scroll to top
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    previousPathRef.current = pathname
  }, [pathname])

  // Save position before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      savePosition(pathname, window.scrollY)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pathname, savePosition])

  const contextValue: ScrollRestorationContextType = {
    saveCurrentPosition,
    clearPosition,
    clearAll
  }

  return (
    <ScrollRestorationContext.Provider value={contextValue}>
      {children}
    </ScrollRestorationContext.Provider>
  )
}
