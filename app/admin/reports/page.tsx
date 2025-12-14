'use client'

import Link from 'next/link'
import { ArrowLeft, BarChart3, FileDown, Printer, FileText } from 'lucide-react'

export default function ReportsPage() {
  // List of available report types
  const reportTypes = [
    { name: 'Student Report Cards', description: 'Generate report cards for students', icon: BarChart3, color: 'blue', href: '/admin/reports/student' },
    { name: 'Cumulative Records', description: 'View cumulative academic performance', icon: FileText, color: 'orange', href: '/admin/reports/cumulative' },
    { name: 'Attendance Reports', description: 'View and export attendance statistics', icon: FileDown, color: 'green', href: '/admin/reports/attendance' },
    { name: 'Financial Reports', description: 'Fee collection and expense reports', icon: Printer, color: 'yellow', href: '/admin/reports/financial' },
    { name: 'Academic Performance', description: 'Class and subject performance analysis', icon: BarChart3, color: 'purple', href: '/admin/reports/academic' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-methodist-gold hover:text-yellow-600">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">Generate Reports</h1>
              <p className="text-xs md:text-sm text-gray-600">Create and export various school reports</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {reportTypes.map((report, index) => (
            <Link key={index} href={report.href || '#'} className="block group">
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer h-full">
                <div className="flex items-start space-x-4">
                  <div className={`bg-${report.color}-100 p-4 rounded-lg`}>
                    <report.icon className={`w-8 h-8 text-${report.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2 group-hover:text-purple-600 transition-colors">{report.name}</h3>
                    <p className="text-xs md:text-sm text-gray-600 mb-4">{report.description}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
