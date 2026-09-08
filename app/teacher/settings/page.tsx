'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Moon, Sun, Lock, Save, AlertCircle, 
  Check, User, GraduationCap, ShieldCheck, KeyRound, 
  Info, Sparkles, Loader2
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { getCurrentUser } from '@/lib/auth'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { toast } from 'react-hot-toast'

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
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

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
        
        if (isDark) {
          document.documentElement.classList.add('dark')
          localStorage.theme = 'dark'
        } else {
          document.documentElement.classList.remove('dark')
          localStorage.theme = 'light'
        }
      } else {
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
    
    setDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.theme = 'dark'
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.theme = 'light'
    }

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
    setSavingProfile(true)

    try {
      if (!teacherId) throw new Error('Teacher profile record not found')
      const { error } = await supabase
        .from('teachers')
        .update({
          qualification: profileData.qualification.trim(),
          specialization: profileData.specialization.trim()
        })
        .eq('id', teacherId)

      if (error) throw error

      toast.success('Academic profile updated successfully')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }

    setSavingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      })

      if (error) throw error

      toast.success('Password updated successfully')
      setPasswordData({ newPassword: '', confirmPassword: '' })
    } catch (error: any) {
      console.error('Error updating password:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-20">
        <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-36 sm:w-48 rounded-lg" />
                <Skeleton className="h-3.5 w-56 sm:w-72 rounded-md" />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-2xl sm:rounded-3xl" />
          <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 pb-24 font-sans text-gray-900 dark:text-gray-100 transition-colors">
      {/* Sticky Header Banner */}
      <header className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0">
              <BackButton href="/teacher/dashboard" className="shrink-0 mt-0.5 sm:mt-0 shadow-sm" />
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-2 truncate">
                  <span>Account & Preferences</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium truncate">
                  Manage personal academic profile, theme, and security credentials
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-5 sm:space-y-7">
        
        {/* Appearance & Interface Card */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-4">
          <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
            <div className="p-2.5 rounded-2xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 shrink-0">
              {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Interface Appearance
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                Customize your visual display theme across devices
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-700/70 gap-4">
            <div className="space-y-0.5 min-w-0">
              <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                Dark Mode
              </p>
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Reduce glare during low-light hours and late score recordings
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={darkMode}
              onClick={toggleDarkMode}
              className={`relative inline-flex h-7 w-12 sm:h-8 sm:w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#003B5C] focus:ring-offset-2 ${
                darkMode ? 'bg-[#003B5C] dark:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 sm:h-7 sm:w-7 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-gray-700 ${
                  darkMode ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'
                }`}
              >
                {darkMode ? (
                  <Moon className="w-3.5 h-3.5 text-[#003B5C]" />
                ) : (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                )}
              </span>
            </button>
          </div>
        </section>

        {/* Profile & Academic Information Card */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
            <div className="p-2.5 rounded-2xl bg-[#003B5C]/10 dark:bg-[#003B5C]/25 text-[#003B5C] dark:text-blue-300 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Teacher Profile Details
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                Official name credentials and editable teaching qualifications
              </p>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4 sm:space-y-5">
            {/* Read-Only Notice */}
            <div className="bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 rounded-2xl p-3.5 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#003B5C] dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Legal identity names are locked. Contact your school administrator to modify your official registry name.
              </p>
            </div>

            {/* Name Fields (Read-Only) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  First Name
                </label>
                <input
                  type="text"
                  value={profileData.first_name}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/70 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={profileData.middle_name}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/70 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                  Surname / Last Name
                </label>
                <input
                  type="text"
                  value={profileData.last_name}
                  readOnly
                  disabled
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-100/70 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 cursor-not-allowed outline-none"
                />
              </div>
            </div>

            {/* Editable Academic Details */}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-750 space-y-3.5 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-[#003B5C] dark:text-blue-400" />
                <span>Academic Specialization</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Highest Educational Qualification
                  </label>
                  <input
                    type="text"
                    value={profileData.qualification}
                    onChange={(e) => setProfileData({ ...profileData, qualification: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                    placeholder="e.g. B.Ed. Mathematics / Dip. Basic Education"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                    Subject Area of Specialization
                  </label>
                  <input
                    type="text"
                    value={profileData.specialization}
                    onChange={(e) => setProfileData({ ...profileData, specialization: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                    placeholder="e.g. Mathematics & Science / Creative Arts"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {savingProfile ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Profile Information</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Security & Password Reset Card */}
        <section className="bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-4 sm:p-6 md:p-7 space-y-5">
          <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-700/80 pb-3 sm:pb-4">
            <div className="p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900 dark:text-white">
                Account Security & Credentials
              </h2>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                Update your portal login password
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] transition"
                  placeholder="Re-enter new password"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={savingPassword}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 sm:py-3 bg-gray-900 hover:bg-black dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {savingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Update Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

      </main>
    </div>
  )
}