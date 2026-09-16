'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTeacher } from '@/components/providers/TeacherContext'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Menu,
  Bell,
  Search,
  LogOut,
  AlertCircle,
  CalendarCheck,
  Award,
  ChevronRight,
  Settings
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
import { differenceInDays } from 'date-fns'

interface TeacherHeaderProps {
  setIsOpen: (open: boolean) => void
}

export function TeacherHeader({ setIsOpen }: TeacherHeaderProps) {
  const { teacher, user, dashboardData } = useTeacher()
  const router = useRouter()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  
  const [termAlert, setTermAlert] = useState<{ 
    progress: number
    active: boolean
    threshold: number
    id?: string
    attendanceDone?: boolean
    remarksDone?: boolean 
  }>({ progress: 0, active: false, threshold: 90 })
  const [dismissedAtt, setDismissedAtt] = useState(false)
  const [dismissedRem, setDismissedRem] = useState(false)

  // Initialize from sessionStorage to prevent badge flickering on navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cachedTerm = sessionStorage.getItem('teacher_notif_term_alert')
      if (cachedTerm) {
        try { 
          const parsed = JSON.parse(cachedTerm)
          setTermAlert(parsed) 
          if (parsed.id) {
            setDismissedAtt(sessionStorage.getItem(`dismiss_att_${parsed.id}`) === 'true')
            setDismissedRem(sessionStorage.getItem(`dismiss_rem_${parsed.id}`) === 'true')
          }
        } catch (e) {}
      }
    }
  }, [])

  const isClassTeacher = dashboardData?.assignments?.some(a => a.is_class_teacher) || false

  const fetchNotifications = useCallback(async () => {
    if (!isClassTeacher) return
    const supabase = getSupabaseBrowserClient()

    try {
      const { data: termRes } = await supabase
        .from('academic_terms')
        .select('id, start_date, end_date')
        .eq('is_current', true)
        .maybeSingle()

      if (termRes?.start_date && termRes?.end_date) {
        const { data: thresholdRes } = await supabase
          .from('system_settings')
          .select('setting_value')
          .eq('setting_key', 'progress_alert_threshold')
          .maybeSingle()

        const start = new Date(termRes.start_date)
        const end = new Date(termRes.end_date)
        const now = new Date()
        const totalDays = differenceInDays(end, start)
        const daysPassed = differenceInDays(now, start)
        const progress = totalDays > 0 ? Math.min(Math.max(Math.round((daysPassed / totalDays) * 100), 0), 100) : 0
        const threshold = thresholdRes?.setting_value ? Number(thresholdRes.setting_value) : 90

        const newTermAlert = { progress, active: progress >= threshold, threshold, id: termRes.id }
        setTermAlert(newTermAlert)
        sessionStorage.setItem('teacher_notif_term_alert', JSON.stringify(newTermAlert))

        if (typeof window !== 'undefined') {
          setDismissedAtt(sessionStorage.getItem(`dismiss_att_${termRes.id}`) === 'true')
          setDismissedRem(sessionStorage.getItem(`dismiss_rem_${termRes.id}`) === 'true')
        }

        if (progress >= threshold && 'Notification' in window && Notification.permission === 'granted') {
          const sessionKey = `teacher_term_alert_${termRes.id}`
          if (!sessionStorage.getItem(sessionKey)) {
            new Notification('Action Required: End of Term', {
              body: `The term is ${progress}% complete. Please remember to enter total attendances and student remarks.`,
              icon: '/school_crest.png'
            })
            sessionStorage.setItem(sessionKey, 'notified')
          }
        }
      }
    } catch (err) {
      console.error("Error fetching teacher notifications:", err)
    }
  }, [isClassTeacher])

  useEffect(() => {
    fetchNotifications()
    const intervalId = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(intervalId)
  }, [fetchNotifications])

  // Request Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleAttClick = () => {
    if (termAlert.id) {
      sessionStorage.setItem(`dismiss_att_${termAlert.id}`, 'true')
      setDismissedAtt(true)
    }
    setNotificationsOpen(false)
  }

  const handleRemClick = () => {
    if (termAlert.id) {
      sessionStorage.setItem(`dismiss_rem_${termAlert.id}`, 'true')
      setDismissedRem(true)
    }
    setNotificationsOpen(false)
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login?portal=teacher')
  }

  const teacherName = teacher?.first_name 
    ? `${teacher.first_name} ${teacher.last_name || ''}`.trim()
    : 'Faculty Teacher'

  const teacherInitials = teacher?.first_name && teacher?.last_name
    ? `${teacher.first_name[0]}${teacher.last_name[0]}`.toUpperCase()
    : teacher?.first_name
    ? teacher.first_name.slice(0, 2).toUpperCase()
    : 'TC'

  const totalNotifications = 
    (termAlert.active && !termAlert.attendanceDone && !dismissedAtt ? 1 : 0) + 
    (termAlert.active && !termAlert.remarksDone && !dismissedRem ? 1 : 0)

  return (
    <header className="sticky top-0 z-40 w-full select-none shadow-md flex-none">
      {/* Ghana Flag Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />

      {/* Main Bar */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-[#003B5C] border-b-2 border-amber-600/30">
        <div className="px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2.5 sm:gap-4">
            
            {/* Left: Mobile Drawer Trigger & Institution Branding */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="lg:hidden p-2 rounded-xl text-[#003B5C] hover:bg-[#003B5C]/10 active:scale-95 transition-all shrink-0"
                aria-label="Open sidebar navigation"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-base md:text-lg font-black text-[#003B5C] tracking-tight truncate leading-tight">
                    <span className="sm:hidden">Biriwa Methodist &apos;C&apos;</span>
                    <span className="hidden sm:inline">Biriwa Methodist &apos;C&apos; Basic School</span>
                  </h1>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-red-700 dark:text-red-500 truncate">
                    TEACHER PORTAL
                  </span>
                  <span className="hidden md:inline-block w-1 h-1 rounded-full bg-[#003B5C]/40" />
                  <span className="hidden md:inline-block text-[10px] sm:text-xs font-semibold text-[#003B5C]/80 italic truncate">
                    &ldquo;Discipline with Hardwork&rdquo;
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Actions (Command Palette Search, Notifications, Profile) */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              
              {/* Quick Search Shortcut (Desktop/Tablet) */}
              <button
                type="button"
                onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/25 hover:bg-white/35 border border-white/20 text-[#003B5C] text-xs font-semibold transition-colors shadow-2xs"
              >
                <Search className="w-3.5 h-3.5 opacity-75" />
                <span className="truncate">Search records...</span>
                <kbd className="hidden lg:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#003B5C]/10 rounded border border-[#003B5C]/20">
                  Ctrl+K
                </kbd>
              </button>

              {/* Notification Center */}
              <div className="relative" ref={notificationRef}>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  className="relative p-2 rounded-xl text-[#003B5C] hover:bg-[#003B5C]/10 active:scale-95 transition-all"
                  aria-label="View academic notifications"
                >
                  <Bell className="w-5 h-5 sm:w-5 sm:h-5" />
                  {totalNotifications > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black font-mono text-white shadow-sm ring-2 ring-amber-500">
                      {totalNotifications}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown (Mobile-Safe Inset) */}
                {notificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-slate-950/20 sm:hidden" 
                      onClick={() => setNotificationsOpen(false)} 
                    />
                    <div className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-auto sm:mt-2 sm:w-88 md:w-96 z-50 bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      
                      {/* Header */}
                      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                            Academic Alerts
                          </h3>
                        </div>
                        {totalNotifications > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300">
                            {totalNotifications} Pending
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            Up to date
                          </span>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="max-h-[60vh] sm:max-h-[360px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80 overscroll-contain">
                        {totalNotifications === 0 ? (
                          <div className="py-8 px-4 text-center space-y-2">
                            <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                              <Bell className="w-5 h-5 opacity-40" />
                            </div>
                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                              No urgent terminal alerts at this time
                            </p>
                          </div>
                        ) : (
                          <div className="py-1">
                            {termAlert.active && !termAlert.attendanceDone && !dismissedAtt && (
                              <Link
                                href="/teacher/attendance"
                                onClick={handleAttClick}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                              >
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                                  <CalendarCheck className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                      Total Term Attendance
                                    </p>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                  </div>
                                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Term is <strong className="text-amber-600 font-semibold">{termAlert.progress}%</strong> complete. Please confirm total attendances for your students.
                                  </p>
                                </div>
                              </Link>
                            )}

                            {termAlert.active && !termAlert.remarksDone && !dismissedRem && (
                              <Link
                                href="/teacher/reports"
                                onClick={handleRemClick}
                                className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                              >
                                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
                                  <Award className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                      Terminal Report Remarks
                                    </p>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                  </div>
                                  <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Term is <strong className="text-amber-600 font-semibold">{termAlert.progress}%</strong> complete. Enter conduct &amp; academic remarks for student reports.
                                  </p>
                                </div>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 text-center">
                        <Link
                          href="/teacher/assessments"
                          onClick={() => setNotificationsOpen(false)}
                          className="text-[11px] font-bold text-[#003B5C] dark:text-blue-400 hover:underline uppercase tracking-wider block py-1"
                        >
                          View Assessment Tasks
                        </Link>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="h-6 w-px bg-[#003B5C]/20 mx-0.5" />

              {/* Teacher Identity & Account Dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 p-1 sm:p-1.5 rounded-xl hover:bg-[#003B5C]/10 transition-colors active:scale-95"
                  aria-label="Teacher account menu"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#003B5C] text-white flex items-center justify-center font-bold text-xs shadow-sm ring-1 ring-white/30 shrink-0">
                    {teacherInitials}
                  </div>

                  <div className="hidden lg:block text-left min-w-0 max-w-[130px]">
                    <p className="text-xs font-black text-[#003B5C] truncate leading-tight">
                      {teacherName}
                    </p>
                    <p className="text-[10px] font-bold text-[#003B5C]/80 uppercase tracking-wider truncate">
                      {teacher?.teacher_id || 'Faculty'}
                    </p>
                  </div>
                </button>

                {/* Profile Modal / Menu */}
                {profileDropdownOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent sm:hidden" 
                      onClick={() => setProfileDropdownOpen(false)} 
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {teacherName}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Staff ID: {teacher?.teacher_id || 'Staff'}
                        </p>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/teacher/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          <span>Account &amp; Security</span>
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={handleSignOut}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

            </div>

          </div>
        </div>
      </div>
    </header>
  )
}