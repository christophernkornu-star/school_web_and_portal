'use client'

import Link from 'next/link'
import BackButton from '@/components/ui/back-button'
import { ArrowLeft, FileText, Download } from 'lucide-react'

export default function ResourcesPage() {
  const resources = [
    { name: 'Student Handbook 2024/2025', type: 'PDF', size: '2.4 MB', downloads: 145 },
    { name: 'Admission Requirements', type: 'PDF', size: '1.2 MB', downloads: 89 },
    { name: 'School Calendar', type: 'PDF', size: '890 KB', downloads: 203 },
    { name: 'Fee Structure', type: 'PDF', size: '654 KB', downloads: 167 },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin/dashboard" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">School Resources</h1>
              <p className="text-xs md:text-sm text-gray-600">Manage documents and resources</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="bg-white rounded-lg shadow p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Documents & Files</h2>
          <div className="space-y-4">
            {resources.map((resource, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="bg-methodist-gold bg-opacity-10 p-3 rounded-lg">
                    <FileText className="w-6 h-6 text-methodist-gold" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-sm md:text-base">{resource.name}</h3>
                    <p className="text-xs md:text-sm text-gray-500">{resource.type} • {resource.size} • {resource.downloads} downloads</p>
                  </div>
                </div>
                <button className="p-2 bg-methodist-gold text-white rounded-lg hover:bg-yellow-600">
                  <Download className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
