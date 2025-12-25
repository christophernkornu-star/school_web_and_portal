'use client'

import { useState, useEffect } from 'react'
import { Download, X, Share } from 'lucide-react'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if already in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true)
    }

    // Check session storage
    const hasSeenPrompt = sessionStorage.getItem('pwaPromptShown')
    if (hasSeenPrompt) {
      return // Don't show if already seen in this session
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Handle beforeinstallprompt for Android/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Only show if not already installed and not seen in session
      if (!window.matchMedia('(display-mode: standalone)').matches && !sessionStorage.getItem('pwaPromptShown')) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Show iOS prompt if not standalone
    if (isIosDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(true)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    sessionStorage.setItem('pwaPromptShown', 'true')
  }

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      setShowPrompt(false)
      sessionStorage.setItem('pwaPromptShown', 'true')
    }
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-full -mr-10 -mt-10 z-0"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-yellow-50 rounded-full -ml-8 -mb-8 z-0"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <div className="bg-methodist-blue p-2 rounded-lg">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Install App</h3>
                <p className="text-xs text-gray-500">Get the best experience</p>
              </div>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Install the Biriwa Methodist SMS app for easier access and offline capabilities.
          </p>

          {isIOS ? (
            <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-700 border border-gray-100">
              <p className="flex items-center gap-2 mb-1 font-medium">
                To install on iOS:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-xs text-gray-600 ml-1">
                <li className="flex items-center gap-1">
                  Tap the <Share className="w-3 h-3 inline" /> Share button
                </li>
                <li>Scroll down and tap "Add to Home Screen"</li>
              </ol>
              <button 
                onClick={handleDismiss}
                className="mt-3 w-full py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
              >
                Later
              </button>
              <button
                onClick={handleInstallClick}
                className="flex-1 px-4 py-2 bg-methodist-blue text-white rounded-lg font-semibold hover:bg-blue-800 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Install
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
