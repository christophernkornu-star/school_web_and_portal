'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  GraduationCap, 
  Save, 
  Eye, 
  EyeOff, 
  Lock, 
  ShieldCheck, 
  AlertCircle, 
  Edit3, 
  X, 
  CheckCircle2, 
  KeyRound,
  Shield
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import BackButton from '@/components/ui/back-button'
import { PortalFooter } from '@/components/PortalFooter'
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
  
  // Editable contact & guardian fields
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [guardianName, setGuardianName] = useState('')
  const [guardianPhone, setGuardianPhone] = useState('')
  const [guardianEmail, setGuardianEmail] = useState('')
  
  // Password change state
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?portal=student')
        return
      }

      // Fetch student profile with class and auth info
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

      // Check security setting for student self-edit permission
      const { data: settingsData } = await supabase
        .from('security_settings')
        .select('allow_student_profile_edit')
        .maybeSingle()
      
      if (settingsData) {
        setCanEditProfile(Boolean(settingsData.allow_student_profile_edit))
      }

      const student = studentResult.data as any
      const error = studentResult.error

      if (error) {
        console.error('Error fetching profile:', error)
        return
      }

      if (!student) {
        router.push('/login?portal=student')
        return
      }

      setProfile(student)
      
      // Pre-fill editable state
      setPhone(student.phone || '')
      setAddress(student.address || '')
      setGuardianName(student.guardian_name || '')
      setGuardianPhone(student.guardian_phone || '')
      setGuardianEmail(student.guardian_email || '')
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile details')
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
          phone: phone.trim() || null,
          address: address.trim() || null,
          guardian_name: guardianName.trim() || null,
          guardian_phone: guardianPhone.trim() || null,
          guardian_email: guardianEmail.trim() || null
        })
        .eq('id', profile.id)

      if (error) throw error

      await loadProfile()
      setEditMode(false)
      toast.success('Contact information updated successfully!')
    } catch (error: any) {
      console.error('Error updating profile:', error)
      toast.error(error.message || 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    setPasswordError('')
    setPasswordSuccess('')

    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill out both password fields.')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please re-enter.')
      return
    }

    try {
      setChangingPassword(true)

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setPasswordSuccess('Password updated successfully!')
      setNewPassword('')
      setConfirmPassword('')
      
      setTimeout(() => setPasswordSuccess(''), 4000)
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to update password')
    } finally {
      setChangingPassword(false)
    }
  }

  function formatDate(dateString: string): string {
    if (!dateString) return 'Not recorded'
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  function calculateAge(dateString: string): number | null {
    if (!dateString) return null
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
    return <ProfileSkeleton />
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5">
            <div className="flex items-center gap-3">
              <BackButton href="/student/dashboard" />
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Student Profile
              </h1>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-md mx-auto w-full px-4 py-16 flex items-center justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 text-center border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3 w-full">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 flex items-center justify-center mx-auto">
              <User className="w-7 h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Profile Not Found</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Unable to locate student credentials linked to your current session.
            </p>
          </div>
        </main>
        <PortalFooter />
      </div>
    )
  }

  const studentFullName = `${profile.first_name || ''} ${profile.middle_name ? profile.middle_name + ' ' : ''}${profile.last_name || ''}`.trim()
  const studentInitials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase() || 'ST'
  const age = calculateAge(profile.date_of_birth)

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 flex flex-col transition-colors selection:bg-[#003B5C] selection:text-white">
      
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3 sm:py-3.5">
          <div className="flex items-center justify-between gap-3">
            
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <BackButton href="/student/dashboard" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
                  <h1 className="text-base sm:text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                    Student Bio &amp; Profile
                  </h1>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate mt-0.5">
                  Institutional record, guardian contacts, and account security
                </p>
              </div>
            </div>

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-900/50 text-[#003B5C] dark:text-blue-300 text-xs font-bold shrink-0 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Verified Identity</span>
            </div>

          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-4 sm:space-y-6">
        
        {/* Student Identity Hero Card */}
        <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl bg-gradient-to-r from-[#003B5C] via-[#002a42] to-slate-900 text-white p-4 sm:p-6 md:p-8 border border-white/10">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 h-44 w-44 sm:h-56 sm:w-56 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-44 w-44 sm:h-56 sm:w-56 rounded-full bg-amber-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left">
            
            {/* Avatar Pill */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 text-amber-300 flex items-center justify-center font-black text-xl sm:text-2xl shadow-inner shrink-0">
              {studentInitials}
            </div>

            {/* Main Identity Information */}
            <div className="space-y-2 min-w-0 flex-1">
              <div>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight leading-snug">
                  {studentFullName}
                </h2>
                <p className="text-xs sm:text-sm text-blue-200/90 font-mono mt-0.5">
                  ID: {profile.student_id}
                </p>
              </div>

              {/* Badges Strip */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                  <GraduationCap className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span>{profile.classes?.name || 'Cohort'}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-white/10 backdrop-blur-md border border-white/15 text-slate-100 shadow-2xs">
                  <User className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>{profile.gender}</span>
                </span>

                {age !== null && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-bold bg-amber-400/20 border border-amber-400/30 text-amber-300 shadow-2xs">
                    <span>{age} Years Old</span>
                  </span>
                )}
              </div>
            </div>

          </div>
        </section>

        {/* Section 1: Official Academic & Bio Credentials */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Official Institutional Bio</span>
            </h3>
            <span className="text-[10px] sm:text-xs font-mono text-blue-200/80">
              Read Only
            </span>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
              
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Full Name
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {studentFullName}
                </p>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Date of Birth
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {formatDate(profile.date_of_birth)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Gender
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {profile.gender}
                </p>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Admission Date
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {formatDate(profile.admission_date)}
                </p>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Username
                </span>
                <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate">
                  {profile.profiles?.username || '---'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  Portal Login Email
                </span>
                <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate" title={profile.profiles?.email}>
                  {profile.profiles?.email || '---'}
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* Section 2: Contact & Guardian Details (Editable) */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-400 rounded-full shrink-0" />
              <span>Contact &amp; Guardian Records</span>
            </h3>

            {!editMode && canEditProfile && (
              <button
                type="button"
                onClick={() => setEditMode(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition active:scale-95"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-300" />
                <span>Edit Contacts</span>
              </button>
            )}
          </div>

          <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            
            {/* Student Contacts Sub-grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Learner Residence &amp; Mobile
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Student Phone Number
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+233 XX XXX XXXX"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {profile.phone || <span className="text-slate-400 font-normal italic">None registered</span>}
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Residential Address
                  </label>
                  {editMode ? (
                    <textarea
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address, Town, Landmark"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C] resize-none"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {profile.address || <span className="text-slate-400 font-normal italic">None registered</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Guardian Contacts Sub-grid */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Parent / Guardian Primary Emergency Information
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Guardian Name
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={guardianName}
                      onChange={(e) => setGuardianName(e.target.value)}
                      placeholder="e.g. Mr. Kwame Mensah"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile.guardian_name || <span className="text-slate-400 font-normal italic">None registered</span>}
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Guardian Phone
                  </label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={guardianPhone}
                      onChange={(e) => setGuardianPhone(e.target.value)}
                      placeholder="+233 XX XXX XXXX"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile.guardian_phone || <span className="text-slate-400 font-normal italic">None registered</span>}
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl sm:rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Guardian Email
                  </label>
                  {editMode ? (
                    <input
                      type="email"
                      value={guardianEmail}
                      onChange={(e) => setGuardianEmail(e.target.value)}
                      placeholder="parent@example.com"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                    />
                  ) : (
                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile.guardian_email || <span className="text-slate-400 font-normal italic">None registered</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Bar when Editing */}
            {editMode && (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false)
                    setPhone(profile.phone || '')
                    setAddress(profile.address || '')
                    setGuardianName(profile.guardian_name || '')
                    setGuardianPhone(profile.guardian_phone || '')
                    setGuardianEmail(profile.guardian_email || '')
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            )}

          </div>
        </section>

        {/* Section 3: Account Security & Password Update */}
        <section className="bg-white dark:bg-slate-800/90 rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#003B5C] border-b border-[#002a42] flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Security &amp; Password Management</span>
            </h3>
            <span className="text-[10px] sm:text-xs font-mono text-blue-200/80">
              Self-Service
            </span>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Ensure your learner portal password is kept confidential to protect your examination scores and results.
            </p>

            {/* Notifications */}
            {passwordSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4 max-w-2xl">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-3.5 pr-10 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[#003B5C]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>

          </div>
        </section>

      </main>

      <PortalFooter />
    </div>
  )
}

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-6 w-36 rounded-md" />
          </div>
          <Skeleton className="h-8 w-28 rounded-xl hidden sm:block" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 flex-1">
        <Skeleton className="h-44 sm:h-48 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-2xl sm:rounded-3xl" />
      </main>

      <PortalFooter />
    </div>
  )
}