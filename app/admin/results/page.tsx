'use client'

import Link from 'next/link'
import { CheckCircle, ArrowLeft, FileText, ChevronRight } from 'lucide-react'

export default function ResultsDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center space-x-4 mb-6">
          <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
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

          {/* Placeholder for future Result Reports */}
          {/* 
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 opacity-60 cursor-not-allowed">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-400 mb-2">Print Reports</h3>
            <p className="text-gray-400 text-sm">
              Generate and print term reports, broadsheets, and transcripts.
            </p>
          </div> 
          */}
        </div>
      </div>
    </div>
  )
}
