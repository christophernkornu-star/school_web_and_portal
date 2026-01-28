'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, GraduationCap, Save, Eye, EyeOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/BackButton'
import { toast } from 'react-hot-toast'

interface StudentProfile {
  id: string
  student_id: string
  first_name: string
  middle_name: string | null
  last_name: string
  date_of_birth: string
  gender: string
  admission_date: string
  phone: string | null
  address: string | null
  guardian_name: string | null
  guardian_phone: string | null
  guardian_email: string | null
  classes: {
    name: string
    level: string | null
    category: string | null
  }
  profiles: {
    email: string
    username: string
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [canEditProfile, setCanEditProfile] = useState(false)
  
  // Editable fields
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  
  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      setLoading(true)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Get student profile with all details
      const studentResult = await supabase
        .from('students')
        .select(`
          *,
          classes (
            name,
            level,
            category
          ),
          profiles (
            email,
            username
          )
        `)
        .eq('profile_id', user.id)
        .maybeSingle()

      // Check system settings for profile editing permission
      const { data: settingsData } = await supabase
        .from('security_settings')
        .select('allow_student_profile_edit')
        .maybeSingle()
      
      if (settingsData) {
        setCanEditProfile(settingsData.allow_student_profile_edit)
      }

      const student = studentResult.data as any
      const error = studentResult.error

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      if (!student) {
        console.error('No student record found for this user')
        router.push('/login?portal=student')
        return
      }

      setProfile(student)
      
      // Set editable fields
      setPhone(student.phone || '')
      setAddress(student.address || '')
      setGuardianName(student.guardian_name || '')
      setGuardianPhone(student.guardian_phone || '')
      setGuardianEmail(student.guardian_email || '')
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    if (!profile) return

    try {
      setSaving(true)

      const { error } = await supabase
        .from('students')
        .update({
          phone,
          address,
          guardian_name: guardianName,
          guardian_phone: guardianPhone,
          guardian_email: guardianEmail
        })
        .eq('id', profile.id)

      if (error) {
        console.error('Error updating profile:', error)
        toast.error('Failed to update profile. Please try again.')
        return
      }

      // Reload profile
      await loadProfile()
      setEditMode(false)
      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error saving profile:', error)
      toast.error('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess('')

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    try {
      setChangingPassword(true)

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        setPasswordError(error.message)
        return
      }

      setPasswordSuccess('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000)
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password')
    } finally {
      setChangingPassword(false)
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  function calculateAge(dateString: string): number {
    const today = new Date()
    const birthDate = new Date(dateString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    
    return age
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
          <header className="bg-white dark:bg-gray-800 shadow">
            <div className="container mx-auto px-4 py-4">
               <div className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-40 rounded" />
               </div>
            </div>
          </header>
          <main className="flex-1 container mx-auto px-4 py-8">
             <div className="max-w-4xl mx-auto space-y-8">
                 <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <div className="flex flex-col md:flex-row gap-6 items-center md:items-start mb-6">
                         <Skeleton className="h-24 w-24 rounded-full" />
                         <div className="space-y-4 flex-1 w-full">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                         </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                 </div>
             </div>
          </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Profile Not Found</h3>
            <p className="text-gray-600">Unable to load your profile information.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/student/dashboard')}
            className="flex items-center gap-2 text-methodist-blue hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-xl md:text-3xl font-bold text-methodist-blue">My Profile</h1>
          <p className="text-gray-600 mt-2">View and manage your personal information</p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow mb-8">
          {/* Header Section */}
          <div className="bg-gradient-to-r from-methodist-blue to-blue-600 text-white p-6 md:p-8 rounded-t-lg">
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 md:w-12 md:h-12" />
              </div>
              <div>
                <h2 className="text-lg md:text-2xl font-bold">
                  {profile.last_name} {profile.first_name} {profile.middle_name || ''}
                </h2>
                <p className="text-blue-100 mt-1">Student ID: {profile.student_id}</p>
                <p className="text-blue-100">
                  {profile.classes.name}
                </p>
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="p-4 md:p-8 border-b border-gray-200">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Full Name</p>
                  <p className="font-medium text-sm md:text-base text-gray-900">
                    {profile.last_name} {profile.first_name} {profile.middle_name || ''}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Date of Birth</p>
                  <p className="font-medium text-gray-900">
                    {formatDate(profile.date_of_birth)} ({calculateAge(profile.date_of_birth)} years)
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Gender</p>
                  <p className="font-medium text-gray-900">{profile.gender}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Admission Date</p>
                  <p className="font-medium text-gray-900">{formatDate(profile.admission_date)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium text-gray-900 break-all">{profile.profiles.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-600">Username</p>
                  <p className="font-medium text-gray-900">{profile.profiles.username}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="p-4 md:p-8 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Contact Information</h3>
              {!editMode && canEditProfile && (
                <button
                  onClick={() => setEditMode(true)
                  }
                  className="text-sm text-methodist-blue hover:text-blue-700 font-medium"
                >
                  Edit Details
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs md:text-sm text-gray-600">Phone Number</p>
                  {editMode ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base text-gray-900">{profile.phone || 'Not provided'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs md:text-sm text-gray-600">Address</p>
                  {editMode ? (
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Enter address"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base text-gray-900">{profile.address || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div className="p-4 md:p-8 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">Guardian Information</h3>
              {!editMode && canEditProfile && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-sm text-methodist-blue hover:text-blue-700 font-medium"
                >
                  Edit Details
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs md:text-sm text-gray-600">Guardian Name</p>
                  {editMode ? (
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Enter guardian name"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base text-gray-900">{profile.guardian_name || 'Not provided'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs md:text-sm text-gray-600">Guardian Phone</p>
                  {editMode ? (
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Enter guardian phone"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base text-gray-900">{profile.guardian_phone || 'Not provided'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs md:text-sm text-gray-600">Guardian Email</p>
                  {editMode ? (
                    <input
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Enter guardian email"
                    />
                  ) : (
                    <p className="font-medium text-sm md:text-base text-gray-900">{profile.guardian_email || 'Not provided'}</p>
                  )}
                </div>
              </div>
            </div>

            {editMode && (
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setEditMode(false)
                    // Reset fields
                    setPhone(profile.phone || '')
                    setAddress(profile.address || '')
                    setGuardianName(profile.guardian_name || '')
                    setGuardianPhone(profile.guardian_phone || '')
                    setGuardianEmail(profile.guardian_email || '')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-4 py-2 bg-methodist-blue text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="p-4 md:p-8 bg-gray-50 rounded-b-lg">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Account Settings</h3>
            
            <div className="bg-white p-4 md:p-6 rounded-lg border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-4">Change Password</h4>
              
              {passwordSuccess && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-md text-sm">
                  {passwordSuccess}
                </div>
              )}
              
              {passwordError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
                  {passwordError}
                </div>
              )}

              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-methodist-blue text-sm"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={changingPassword || !newPassword || !confirmPassword}
                  className="w-full md:w-auto px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {changingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
