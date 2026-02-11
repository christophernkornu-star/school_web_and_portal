'use client'

import { useEffect } from 'react'

export default function ServiceWorkerDevFix() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          console.log('Unregistering service worker in dev mode:', registration)
          registration.unregister()
        }
      })
    }
  }, [])

  return null
}
