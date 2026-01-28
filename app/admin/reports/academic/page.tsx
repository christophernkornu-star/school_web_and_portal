'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import BackButton from '@/components/ui/BackButton'

export default function AcademicPerformancePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-8 gap-4">
          <BackButton href="/admin/reports" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Academic Performance</h1>
            <p className="text-gray-600">Class and subject performance analysis</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Coming Soon</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            The academic performance analysis module is currently under development. Please check back later for detailed class and subject insights.
          </p>
          <Link 
            href="/admin/reports"
            className="inline-block mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Reports
          </Link>
        </div>
      </div>
    </div>
  )
}
