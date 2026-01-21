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
  const restorationAttemptsRef = useRef<NodeJS.Timeout[]>([])

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

  // Clear any pending restoration attempts
  const clearRestorationAttempts = useCallback(() => {
    restorationAttemptsRef.current.forEach(timeout => clearTimeout(timeout))
    restorationAttemptsRef.current = []
  }, [])

  // Restore scroll position with multiple attempts
  const restoreScrollPosition = useCallback((targetPosition: number) => {
    clearRestorationAttempts()

    const restore = () => {
      if (Math.abs(window.scrollY - targetPosition) > 10) {
        window.scrollTo({ top: targetPosition, behavior: 'instant' })
      }
    }

    // Immediate restoration
    restore()

    // Schedule multiple restoration attempts for dynamic content
    const delays = [0, 50, 100, 200, 300, 500, 750, 1000, 1500]
    delays.forEach(delay => {
      const timeout = setTimeout(restore, delay)
      restorationAttemptsRef.current.push(timeout)
    })
  }, [clearRestorationAttempts])

  // Intercept all clicks to save scroll position BEFORE navigation
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]')
      const button = target.closest('button')
      
      // Save scroll position on any interactive element click
      if (link || button) {
        scrollPositions.set(pathname, window.scrollY)
        saveScrollPositions(scrollPositions)
      }
    }

    // Capture phase ensures we save before navigation
    document.addEventListener('click', handleClick, { capture: true })
    
    // Also intercept keyboard navigation (Enter on links)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const target = e.target as HTMLElement
        if (target.tagName === 'A' || target.closest('a[href]')) {
          scrollPositions.set(pathname, window.scrollY)
          saveScrollPositions(scrollPositions)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown, { capture: true })

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      document.removeEventListener('keydown', handleKeyDown, { capture: true })
    }
  }, [pathname])

  // Save scroll position continuously (debounced)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null

    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        scrollPositions.set(pathname, window.scrollY)
        saveScrollPositions(scrollPositions)
      }, 100)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [pathname])

  // Handle route changes
  useEffect(() => {
    // Check if this is a navigation (path changed)
    if (previousPathRef.current !== pathname) {
      // Clear any pending restorations from previous page
      clearRestorationAttempts()
      
      // Update previous path
      previousPathRef.current = pathname
      
      // Check for saved scroll position
      const savedPosition = scrollPositions.get(pathname)
      
      if (savedPosition !== undefined && savedPosition > 0) {
        // Restore scroll position
        restoreScrollPosition(savedPosition)
      } else {
        // New page - scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' })
      }
    }

    return () => {
      // Save position when component unmounts or path changes
      scrollPositions.set(pathname, window.scrollY)
      saveScrollPositions(scrollPositions)
    }
  }, [pathname, clearRestorationAttempts, restoreScrollPosition])

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      // Give the browser a moment to update the URL
      requestAnimationFrame(() => {
        const currentPath = window.location.pathname
        const savedPosition = scrollPositions.get(currentPath)
        
        if (savedPosition !== undefined && savedPosition > 0) {
          restoreScrollPosition(savedPosition)
        }
      })
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [restoreScrollPosition])

  // Save position before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      scrollPositions.set(pathname, window.scrollY)
      saveScrollPositions(scrollPositions)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pathname])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRestorationAttempts()
    }
  }, [clearRestorationAttempts])

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
