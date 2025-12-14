'use client'

import Link from 'next/link'
import { ArrowLeft, FileText, Camera, Eye, CheckCircle } from 'lucide-react'

export default function ManageScoresPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/teacher/dashboard" className="text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
            </Link>
            <div>
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-800">Manage Scores</h1>
              <p className="text-xs md:text-sm text-gray-600">Upload assessments, enter exam scores & review grades</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {/* Class Scores */}
          <Link href="/teacher/upload-scores/class" className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-100 p-2 md:p-3 rounded-lg group-hover:bg-green-200 transition-colors">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
              <Camera className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2">Class Scores</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">Upload class assessments using manual entry, CSV, or OCR.</p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
              <span className="text-xs md:text-sm text-green-600 font-medium">Manual, CSV & OCR</span>
            </div>
          </Link>

          {/* Exam Scores */}
          <Link href="/teacher/scores" className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-2 md:p-3 rounded-lg group-hover:bg-blue-200 transition-colors">
                <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
              <Camera className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            </div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2">Exam Scores</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">Enter end-of-term exam scores manually or via OCR.</p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-blue-600" />
              <span className="text-xs md:text-sm text-blue-600 font-medium">OCR Available</span>
            </div>
          </Link>

          {/* View & Edit Scores */}
          <Link href="/teacher/scores/view" className="bg-white rounded-lg shadow-lg p-4 md:p-6 hover:shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-teal-100 p-2 md:p-3 rounded-lg group-hover:bg-teal-200 transition-colors">
                <Eye className="w-5 h-5 md:w-6 md:h-6 text-teal-600" />
              </div>
            </div>
            <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2">View & Edit Scores</h3>
            <p className="text-xs md:text-sm text-gray-600 mb-4">Review all recorded scores and make necessary corrections.</p>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-3 h-3 md:w-4 md:h-4 text-teal-600" />
              <span className="text-xs md:text-sm text-teal-600 font-medium">Review & Edit</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
