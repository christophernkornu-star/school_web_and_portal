'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadScoresPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/teacher/upload-scores/class')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ghana-green mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
