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
  const [fixingUsernames, setFixingUsernames] = useState(false)
  const [fixingPasswords, setFixingPasswords] = useState(false)
  const [fixingDuplicates, setFixingDuplicates] = useState(false)
  const [fixResult, setFixResult] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  const [passwordFixResult, setPasswordFixResult] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  const [duplicateFixResult, setDuplicateFixResult] = useState<{message: string, type: 'success' | 'error'} | null>(null)

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
    setFixResult(null)

    try {
      const response = await fetch('/api/admin/fix-usernames')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to update usernames')

      setFixResult({
        message: `Success! Updated ${data.updated_count} students. Total processed: ${data.total_students}.`,
        type: 'success'
      })
    } catch (error: any) {
      setFixResult({
        message: error.message || 'An error occurred',
        type: 'error'
      })
    } finally {
      setFixingUsernames(false)
    }
  }

  async function handleFixPasswords() {
    if (!confirm('This will reset ALL student passwords to their Date of Birth in DD-MM-YYYY format. This action cannot be undone. Are you sure?')) {
      return
    }

    setFixingPasswords(true)
    setPasswordFixResult(null)

    try {
      const response = await fetch('/api/admin/fix-passwords')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to update passwords')

      setPasswordFixResult({
        message: `Success! Updated ${data.updated_count} students. Total processed: ${data.total_students}.`,
        type: 'success'
      })
    } catch (error: any) {
      setPasswordFixResult({
        message: error.message || 'An error occurred',
        type: 'error'
      })
    } finally {
      setFixingPasswords(false)
    }
  }

  async function handleFixDuplicates() {
    if (!confirm('This will search for and remove duplicate student records (same Name and DOB). It will keep the record with a Middle Name if available. Are you sure?')) {
      return
    }

    setFixingDuplicates(true)
    setDuplicateFixResult(null)

    try {
      const response = await fetch('/api/admin/fix-duplicates')
      const data = await response.json()

      if (!response.ok) throw new Error(data.error || 'Failed to remove duplicates')

      setDuplicateFixResult({
        message: `Success! Removed ${data.duplicates_found} duplicate records.`,
        type: 'success'
      })
    } catch (error: any) {
      setDuplicateFixResult({
        message: error.message || 'An error occurred',
        type: 'error'
      })
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

        {/* Maintenance Section */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">System Maintenance</h2>
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Fix Student Usernames</h3>
                <p className="text-sm text-gray-600">Regenerate all student usernames to follow the format: First 3 letters + Last 3 letters (e.g., 'formah')</p>
              </div>
              <button
                onClick={handleFixUsernames}
                disabled={fixingUsernames}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 transition"
              >
                {fixingUsernames ? 'Processing...' : 'Run Fix'}
              </button>
            </div>
            {fixResult && (
              <div className={`mt-4 p-3 rounded ${fixResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {fixResult.message}
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Reset Student Passwords</h3>
                <p className="text-sm text-gray-600">Reset all student passwords to their Date of Birth (DD-MM-YYYY)</p>
              </div>
              <button
                onClick={handleFixPasswords}
                disabled={fixingPasswords}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition"
              >
                {fixingPasswords ? 'Processing...' : 'Reset All'}
              </button>
            </div>
            {passwordFixResult && (
              <div className={`mt-4 p-3 rounded ${passwordFixResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {passwordFixResult.message}
              </div>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-800">Remove Duplicate Students</h3>
                <p className="text-sm text-gray-600">Find and remove duplicate student records (keeps the one with Middle Name)</p>
              </div>
              <button
                onClick={handleFixDuplicates}
                disabled={fixingDuplicates}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 transition"
              >
                {fixingDuplicates ? 'Processing...' : 'Remove Duplicates'}
              </button>
            </div>
            {duplicateFixResult && (
              <div className={`mt-4 p-3 rounded ${duplicateFixResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {duplicateFixResult.message}
              </div>
            )}
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
