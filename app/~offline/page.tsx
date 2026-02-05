'use client'

import { WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md">
        <div className="bg-gray-200 p-6 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
          <WifiOff className="w-12 h-12 text-gray-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">You are offline</h1>
        <p className="text-gray-600 mb-8">
          It seems you have lost your internet connection. Please check your network settings and try again.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-methodist-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
