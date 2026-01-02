'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Moon, Sun, Lock, Save, AlertCircle, Check, User, GraduationCap } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser } from '@/lib/auth'

export default function TeacherSettingsPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [loading, setLoading] = useState(true)
  const [darkMode, setDarkMode] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [profileData, setProfileData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    qualification: '',
    specialization: ''
  })
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    const user = await getCurrentUser()
    if (!user) {
      router.push('/login?portal=teacher')
      return
    }
    setUserId(user.id)

    // Fetch teacher profile data
    try {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('id, first_name, middle_name, last_name, qualification, specialization')
        .eq('profile_id', user.id)
        .single()

      if (teacher) {
        setTeacherId(teacher.id)
        setProfileData({
          first_name: teacher.first_name || '',
          middle_name: teacher.middle_name || '',
          last_name: teacher.last_name || '',
          qualification: teacher.qualification || '',
          specialization: teacher.specialization || ''
        })
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error)
    }

    // Fetch profile theme preference
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()

      if (profile?.theme) {
        const isDark = profile.theme === 'dark'
        setDarkMode(isDark)
        
        // Sync with DOM and localStorage
        if (isDark) {
          document.documentElement.classList.add('dark')
          localStorage.theme = 'dark'
        } else {
          document.documentElement.classList.remove('dark')
          localStorage.theme = 'light'
        }
      } else {
        // Fallback to current system/local state if no DB preference
        if (document.documentElement.classList.contains('dark')) {
          setDarkMode(true)
        }
      }
    } catch (error) {
      console.error('Error fetching theme:', error)
    }

    setLoading(false)
  }

  const toggleDarkMode = async () => {
    const newMode = !darkMode
    const newTheme = newMode ? 'dark' : 'light'
    
    // Optimistic UI update
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }

    // Persist to database
    if (userId) {
      try {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', userId)
      } catch (error) {
        console.error('Error saving theme preference:', error)
      }
    }
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    setSaving(true)

    try {
      if (!teacherId) throw new Error('Teacher profile not found')
      const { error } = await supabase
        .from('teachers')
        .update({
          qualification: profileData.qualification,
          specialization: profileData.specialization
        })
        .eq('id', teacherId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully' })
    } catch (error: any) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage({ type: '', text: '' })
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      setMessage({ type: 'success', text: 'Password updated successfully' })
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Error updating password:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update password' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link href="/teacher/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6 text-gray-600 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">Manage your preferences and security</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          
          {/* Appearance Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              {darkMode ? <Moon className="w-5 h-5 mr-2" /> : <Sun className="w-5 h-5 mr-2" />}
              Appearance
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Night Mode</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Use a dark theme for low light environments</p>
              </div>
              
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  darkMode ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`${
                    darkMode ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
            </div>
          </div>

          {/* Profile Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.first_name}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    placeholder="First Name"
                    title="Contact admin to change name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    value={profileData.middle_name}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    placeholder="Middle Name"
                    title="Contact admin to change middle name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.last_name}
                    readOnly
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    placeholder="Last Name"
                    title="Contact admin to change name"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3 flex items-center mt-6">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Academic Data
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Qualification
                    </label>
                    <input
                      type="text"
                      value={profileData.qualification}
                      onChange={(e) => setProfileData({ ...profileData, qualification: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g. B.Ed. Mathematics"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Specialization
                    </label>
                    <input
                      type="text"
                      value={profileData.specialization}
                      onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder="e.g. Mathematics & Science"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Security Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors duration-200">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Security
            </h2>

            {message.text && (
              <div className={`mb-4 p-4 rounded-lg flex items-center space-x-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter new password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Updating...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  )
}
