'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Camera, Eye, CheckCircle } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { Skeleton } from "@/components/ui/skeleton"

export default function ManageScoresPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push('/login?portal=teacher')
          return
        }
        setLoading(false)
      } catch (error) {
        console.error('Auth error:', error)
        setLoading(false)
      }
    }
    checkAuth()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded-full" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
        </header>
  
        <main className="container mx-auto px-4 md:px-6 py-8">
          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-5 w-5 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full mb-4" />
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow transition-colors">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/teacher/dashboard" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <div>
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800 dark:text-gray-100">Manage Scores</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Upload assessments, enter exam scores & review grades</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Class Scores */}
          <Link href="/teacher/upload-scores/class" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 md:p-3 rounded-lg group-hover:bg-green-200 dark:group-hover:bg-green-900/50 transition-colors">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400" />
              </div>
              <Camera className="w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Class Scores</h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4">Upload class assessments using manual entry, CSV, or OCR.</p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs md:text-sm text-green-600 dark:text-green-400 font-medium">Manual, CSV & OCR</span>
            </div>
          </Link>

          {/* Exam Scores */}
          <Link href="/teacher/scores" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-3 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <Camera className="w-4 h-4 md:w-5 md:h-5 text-gray-400 dark:text-gray-500" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">Exam Scores</h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4">Enter end-of-term exam scores manually or via OCR.</p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs md:text-sm text-blue-600 dark:text-blue-400 font-medium">OCR Available</span>
            </div>
          </Link>

          {/* View & Edit Scores */}
          <Link href="/teacher/scores/view" className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-teal-100 dark:bg-teal-900/30 p-2 md:p-3 rounded-lg group-hover:bg-teal-200 dark:group-hover:bg-teal-900/50 transition-colors">
                <Eye className="w-5 h-5 md:w-6 md:h-6 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">View & Edit Scores</h3>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mb-4">Review all recorded scores and make necessary corrections.</p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-teal-600 dark:text-teal-400" />
              <span className="text-xs md:text-sm text-teal-600 dark:text-teal-400 font-medium">Review & Edit</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
