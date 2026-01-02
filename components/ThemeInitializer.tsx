'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function ThemeInitializer() {
  const pathname = usePathname()

  useEffect(() => {
    // Only allow dark mode in teacher portal
    if (!pathname?.startsWith('/teacher')) {
      document.documentElement.classList.remove('dark')
      return
    }

    // Check local storage or system preference
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [pathname])

  return null
}
