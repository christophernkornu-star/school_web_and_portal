'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'
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
  const [fixingUsernames, setFixingUsernames] = useState(false)
  const [fixingPasswords, setFixingPasswords] = useState(false)
  const [fixingDuplicates, setFixingDuplicates] = useState(false)

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

  async function handleFixUsernames() {
    if (!confirm('This will regenerate usernames for ALL students based on the new format (First 3 letters + Last 3 letters). Are you sure?')) {
      return
    }

    setFixingUsernames(true)

    try {
      const response = await fetch('/api/admin/fix-usernames')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to update usernames')

      toast.success(`Success! Updated ${data.updated_count} students. Total processed: ${data.total_students}.`)
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setFixingUsernames(false)
    }
  }

  async function handleFixPasswords() {
    if (!confirm('This will reset ALL student passwords to their Date of Birth in DD-MM-YYYY format. This action cannot be undone. Are you sure?')) {
      return
    }

    setFixingPasswords(true)
    
    try {
      const response = await fetch('/api/admin/fix-passwords')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to update passwords')

      toast.success(`Success! Updated ${data.updated_count} students. Total processed: ${data.total_students}.`)
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setFixingPasswords(false)
    }
  }

  async function handleFixDuplicates() {
    if (!confirm('This will search for and remove duplicate student records (same Name and DOB). It will keep the record with a Middle Name if available. Are you sure?')) {
      return
    }

    setFixingDuplicates(true)

    try {
      const response = await fetch('/api/admin/fix-duplicates')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to remove duplicates')

      toast.success(`Success! Removed ${data.duplicates_found} duplicate records.`)
    } catch (error: any) {
      toast.error(error.message || 'An error occurred')
    } finally {
      setFixingDuplicates(false)
    }
  }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="container mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
            <Skeleton className="h-24 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-4 w-4 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <BackButton href="/admin" />
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">System Settings</h1>
              <p className="text-xs md:text-sm text-gray-600">Configure system preferences and settings</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
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

        {/* Maintenance Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">System Maintenance</h2>
          <div className="border-t pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">Fix Student Usernames</h3>
                <p className="text-xs md:text-sm text-gray-600">Regenerate all student usernames to follow the format: First 3 letters + Last 3 letters (e.g., 'formah')</p>
              </div>
              <button
                onClick={handleFixUsernames}
                disabled={fixingUsernames}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 transition whitespace-nowrap"
              >
                {fixingUsernames ? 'Processing...' : 'Run Fix'}
              </button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">Reset Student Passwords</h3>
                <p className="text-xs md:text-sm text-gray-600">Reset all student passwords to their Date of Birth (DD-MM-YYYY)</p>
              </div>
              <button
                onClick={handleFixPasswords}
                disabled={fixingPasswords}
                className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition whitespace-nowrap"
              >
                {fixingPasswords ? 'Processing...' : 'Reset All'}
              </button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-800">Remove Duplicate Students</h3>
                <p className="text-xs md:text-sm text-gray-600">Find and remove duplicate student records (keeps the one with Middle Name)</p>
              </div>
              <button
                onClick={handleFixDuplicates}
                disabled={fixingDuplicates}
                className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition whitespace-nowrap"
              >
                {fixingDuplicates ? 'Processing...' : 'Remove Duplicates'}
              </button>
            </div>
          </div>
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
