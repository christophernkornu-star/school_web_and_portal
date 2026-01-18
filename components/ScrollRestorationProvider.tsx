'use client'

import { createContext, useContext, useEffect, useRef, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

// Storage key for sessionStorage
const STORAGE_KEY = 'app_scroll_positions'

// Get scroll positions from sessionStorage or create new map
const getScrollPositions = (): Map<string, number> => {
  if (typeof window === 'undefined') return new Map()
  
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return new Map(Object.entries(parsed))
    }
  } catch (e) {
    // Ignore errors
  }
  return new Map()
}

// Save scroll positions to sessionStorage
const saveScrollPositions = (positions: Map<string, number>) => {
  if (typeof window === 'undefined') return
  
  try {
    const obj = Object.fromEntries(positions)
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj))
  } catch (e) {
    // Ignore errors
  }
}

// Global scroll positions store - persists across navigations
let scrollPositions = new Map<string, number>()

// Initialize from sessionStorage on load
if (typeof window !== 'undefined') {
  scrollPositions = getScrollPositions()
}

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
  const previousPathRef = useRef<string>(pathname)
  const hasRestoredRef = useRef(false)
  const isFirstRender = useRef(true)

  // Initialize scroll positions from sessionStorage on mount
  useEffect(() => {
    scrollPositions = getScrollPositions()
  }, [])

  // Save scroll position helper
  const savePosition = useCallback((path: string, position: number) => {
    scrollPositions.set(path, position)
    saveScrollPositions(scrollPositions)
  }, [])

  // Save current scroll position
  const saveCurrentPosition = useCallback(() => {
    savePosition(pathname, window.scrollY)
  }, [pathname, savePosition])

  // Clear scroll position
  const clearPosition = useCallback((path?: string) => {
    scrollPositions.delete(path || pathname)
    saveScrollPositions(scrollPositions)
  }, [pathname])

  // Clear all scroll positions
  const clearAll = useCallback(() => {
    scrollPositions.clear()
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  // Intercept all link clicks to save scroll position BEFORE navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      const button = target.closest('button')
      
      // Check if it's a navigation action
      if (link || button) {
        // Save current scroll position immediately before any navigation
        const currentScroll = window.scrollY
        scrollPositions.set(pathname, currentScroll)
        saveScrollPositions(scrollPositions)
      }
    }

    // Use capture phase to catch the click before navigation happens
    document.addEventListener('click', handleClick, { capture: true })

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
    }
  }, [pathname])

  // Also save on scroll (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        scrollPositions.set(pathname, window.scrollY)
        saveScrollPositions(scrollPositions)
      }, 200)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pathname])

  // Handle route changes - restore scroll position
  useEffect(() => {
    // Skip first render - let the page load naturally
    if (isFirstRender.current) {
      isFirstRender.current = false
      // But still try to restore if we have a saved position (e.g., page refresh)
      const savedPosition = scrollPositions.get(pathname)
      if (savedPosition !== undefined && savedPosition > 0) {
        setTimeout(() => {
          window.scrollTo(0, savedPosition)
        }, 100)
      }
      return
    }

    // If we're on a new path (navigation occurred)
    if (previousPathRef.current !== pathname) {
      // Reset restoration flag for new page
      hasRestoredRef.current = false
      previousPathRef.current = pathname
    }

    // Restore scroll position for this path if we have one saved
    if (!hasRestoredRef.current) {
      const savedPosition = scrollPositions.get(pathname)
      
      if (savedPosition !== undefined && savedPosition > 0) {
        // Multiple attempts to restore - handles dynamic content loading
        const restore = () => {
          window.scrollTo(0, savedPosition)
        }

        // Immediate
        restore()
        
        // After paint and with delays for dynamic content
        requestAnimationFrame(() => {
          restore()
          setTimeout(restore, 50)
          setTimeout(restore, 100)
          setTimeout(restore, 250)
          setTimeout(restore, 500)
        })
      }
      
      hasRestoredRef.current = true
    }
  }, [pathname])

  // Save position before page unload (browser refresh/close)
  useEffect(() => {
    const handleBeforeUnload = () => {
      scrollPositions.set(pathname, window.scrollY)
      saveScrollPositions(scrollPositions)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pathname])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      // Small delay to let the pathname update
      setTimeout(() => {
        const savedPosition = scrollPositions.get(window.location.pathname)
        if (savedPosition !== undefined && savedPosition > 0) {
          window.scrollTo(0, savedPosition)
          // Multiple attempts
          setTimeout(() => window.scrollTo(0, savedPosition), 50)
          setTimeout(() => window.scrollTo(0, savedPosition), 150)
        }
      }, 10)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
