'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Settings as SettingsIcon, School, Bell, Lock, Globe, Calendar } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

export default function SettingsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState({
    schoolName: '',
    academicYear: '',
    currentTerm: '',
    systemStatus: 'Active'
  })

  useEffect(() => {
    async function loadOverview() {
      const user = await getCurrentUser()
      if (!user) {
        router.push('/login?portal=admin')
        return
      }

      // Load school settings
      const { data: schoolData } = await supabase
        .from('school_settings')
        .select('school_name')
        .single() as { data: any }

      // Load academic settings
      const { data: academicData } = await supabase
        .from('academic_settings')
        .select('current_academic_year, current_term')
        .single() as { data: any }

      setOverview({
        schoolName: schoolData?.school_name || 'Biriwa Methodist \'C\' Basic School',
        academicYear: academicData?.current_academic_year || '2024/2025',
        currentTerm: academicData?.current_term || 'First Term',
        systemStatus: 'Active'
      })

      setLoading(false)
    }
    loadOverview()
  }, [router])
  const settingsSections = [
    {
      title: 'School Information',
      description: 'Update school name, address, and contact details',
      icon: School,
      color: 'blue',
      href: '/admin/settings/school-info'
    },
    {
      title: 'Homepage Statistics',
      description: 'Edit statistics displayed on the public website',
      icon: SettingsIcon,
      color: 'purple',
      href: '/admin/settings/homepage-stats'
    },
    {
      title: 'System Notifications',
      description: 'Configure email and SMS notification settings',
      icon: Bell,
      color: 'yellow',
      href: '/admin/settings/notifications'
    },
    {
      title: 'Security & Access',
      description: 'Manage user roles, permissions, and security settings',
      icon: Lock,
      color: 'red',
      href: '/admin/settings/security'
    },
    {
      title: 'General Settings',
      description: 'Academic year, term settings, and system preferences',
      icon: Globe,
      color: 'green',
      href: '/admin/settings/general'
    },
    {
      title: 'Attendance Settings',
      description: 'Configure term days and attendance tracking',
      icon: Calendar,
      color: 'blue',
      href: '/admin/settings/attendance'
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-800">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">System Settings</h1>
              <p className="text-xs md:text-sm text-gray-600">Configure system preferences and settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid md:grid-cols-2 gap-6">
          {settingsSections.map((section, index) => (
            <Link key={index} href={section.href} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start space-x-4">
                <div className={`bg-${section.color}-100 p-4 rounded-lg`}>
                  <section.icon className={`w-8 h-8 text-${section.color}-600`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-base md:text-lg text-gray-800 mb-2">{section.title}</h3>
                  <p className="text-xs md:text-sm text-gray-600 mb-4">{section.description}</p>
                  <span className="text-xs md:text-sm text-methodist-blue hover:text-blue-700 font-medium">
                    Configure →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Current Settings Overview */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg md:text-xl font-bold text-gray-800 mb-4">Current Configuration</h2>
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-methodist-blue mx-auto"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">School Name</h3>
                <p className="text-gray-600 text-xs md:text-sm">{overview.schoolName}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Current Academic Year</h3>
                <p className="text-gray-600 text-xs md:text-sm">{overview.academicYear}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Current Term</h3>
                <p className="text-gray-600 text-xs md:text-sm">{overview.currentTerm}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">System Status</h3>
                <p className="text-green-600 font-medium text-xs md:text-sm">{overview.systemStatus}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
