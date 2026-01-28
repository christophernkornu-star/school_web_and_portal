'use client'

import Link from 'next/link'
import BackButton from '@/components/ui/BackButton'
import { CheckCircle, ArrowLeft, FileText, ChevronRight } from 'lucide-react'

export default function ResultsDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <BackButton href="/admin" />
          <h1 className="text-2xl font-bold text-gray-800">Results Management</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Approval Link */}
          <Link 
            href="/admin/results/approval" 
            className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Approval & Withholding</h3>
            <p className="text-gray-600 text-sm">
              Review class results, approve for publication, or withhold specific student results.
            </p>
          </Link>

          {/* Print Reports Link */}
          <Link 
            href="/admin/results/reports" 
            className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Print Reports</h3>
            <p className="text-gray-600 text-sm">
              Generate and print bulk term reports and transcripts for students.
            </p>
          </Link>

          {/* Broadsheets Link */}
          <Link 
            href="/admin/results/broadsheets" 
            className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Broadsheets</h3>
            <p className="text-gray-600 text-sm">
              View comprehensive result spreadsheets for all students and subjects.
            </p>
          </Link>

          {/* Performance Analysis Link */}
          <Link 
            href="/admin/results/analysis" 
            className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-orange-600" /> {/* Should be ChartIcon if available, reusing FileText for now/Lucide icons */}
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-orange-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Performance Analysis</h3>
            <p className="text-gray-600 text-sm">
              Visualize school performance with charts, graphs, and statistical insights.
            </p>
          </Link>

          {/* Historical Data Link */}
          <Link 
            href="/admin/results/history" 
            className="group bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 hover:border-blue-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-6 h-6 text-gray-600" />
              </div>
              <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Historical Records</h3>
            <p className="text-gray-600 text-sm">
              View active students and teachers from previous academic terms and years.
            </p>
          </Link>
        </div>
      </div>
    </div>
  )
}
