'use client'

import Link from 'next/link'
import { ArrowLeft, Calendar, BookOpen } from 'lucide-react'

export default function EnrollmentsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-methodist-blue hover:text-blue-700">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Student Enrollments</h1>
              <p className="text-xs md:text-sm text-gray-600">Manage student class enrollments</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Calendar className="w-16 h-16 text-methodist-blue mx-auto mb-4" />
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">Enrollment Management</h2>
          <p className="text-gray-600 mb-6 text-xs md:text-sm">View and manage student enrollments by term and class</p>
          <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-methodist-blue rounded-lg">
            <BookOpen className="w-5 h-5 mr-2" />
            <span className="text-xs md:text-sm">Feature coming soon</span>
          </div>
        </div>
      </main>
    </div>
  )
}
