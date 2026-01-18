'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Store scroll positions globally to persist across component unmounts
const scrollPositions: Map<string, number> = new Map()

/**
 * Hook to save and restore scroll position when navigating between pages.
 * Call this hook in any page component to enable scroll restoration.
 */
export function useScrollRestoration() {
  const pathname = usePathname()
  const isRestored = useRef(false)

  // Save scroll position before leaving
  useEffect(() => {
    const handleScroll = () => {
      scrollPositions.set(pathname, window.scrollY)
    }

    // Save position on scroll
    window.addEventListener('scroll', handleScroll, { passive: true })

    // Save position before unload/navigation
    const handleBeforeUnload = () => {
      scrollPositions.set(pathname, window.scrollY)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      // Save final position when unmounting
      scrollPositions.set(pathname, window.scrollY)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [pathname])

  // Restore scroll position when mounting
  useEffect(() => {
    if (isRestored.current) return

    const savedPosition = scrollPositions.get(pathname)
    
    if (savedPosition !== undefined && savedPosition > 0) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        window.scrollTo(0, savedPosition)
        isRestored.current = true
      })
    } else {
      isRestored.current = true
    }
  }, [pathname])

  // Reset restored flag when pathname changes
  useEffect(() => {
    isRestored.current = false
  }, [pathname])

  return {
    saveScrollPosition: () => {
      scrollPositions.set(pathname, window.scrollY)
    },
    clearScrollPosition: () => {
      scrollPositions.delete(pathname)
    }
  }
}

/**
 * Save scroll position for a specific path before navigating away
 */
export function saveScrollPositionForPath(path: string) {
  scrollPositions.set(path, window.scrollY)
}

/**
 * Get saved scroll position for a path
 */
export function getScrollPosition(path: string): number | undefined {
  return scrollPositions.get(path)
}

/**
 * Clear all saved scroll positions
 */
export function clearAllScrollPositions() {
  scrollPositions.clear()
}
