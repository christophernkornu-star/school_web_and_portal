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
  User,
  AlertCircle
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
  const notificationRef = useRef<HTMLDivElement>(null)
  
  const [termAlert, setTermAlert] = useState<{ progress: number, active: boolean, threshold: number, id?: string }>({ progress: 0, active: false, threshold: 90 })
  const [dismissedAtt, setDismissedAtt] = useState(false)
  const [dismissedRem, setDismissedRem] = useState(false)

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
        
        setTermAlert({ progress, active: progress >= threshold, threshold, id: termRes.id })

        if (typeof window !== 'undefined') {
          setDismissedAtt(sessionStorage.getItem(`dismiss_att_${termRes.id}`) === 'true')
          setDismissedRem(sessionStorage.getItem(`dismiss_rem_${termRes.id}`) === 'true')
        }

        if (progress >= threshold && 'Notification' in window && Notification.permission === 'granted') {
          const sessionKey = `teacher_term_alert_${termRes.id}`
          if (!sessionStorage.getItem(sessionKey)) {
            new Notification('Action Required: End of Term', {
              body: `The term is ${progress}% complete. Please remember to enter total attendances and student remarks.`,
              icon: '/favicon.ico'
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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [notificationRef])

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=teacher')
  }

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

  const totalNotifications = (termAlert.active && !dismissedAtt ? 1 : 0) + (termAlert.active && !dismissedRem ? 1 : 0)

  return (
    <header className="sticky top-0 z-[100] h-16 bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 border-b-4 border-yellow-700 shadow-md">
      <div className="h-full px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand/Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="lg:hidden p-2 hover:bg-white/20 rounded-lg text-blue-900"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden md:flex flex-col">
             <span className="text-xl font-black text-blue-900 tracking-tight leading-none drop-shadow-sm">
                Biriwa Methodist 'C' Basic School
             </span>
             <span className="text-sm font-bold text-red-700 tracking-wider">
               TEACHER PORTAL
             </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* Search Trigger (Mock) */}
          <button
             onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
             className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm text-blue-900/70 bg-white/30 border border-blue-900/10 rounded-md hover:bg-white/50 transition-colors w-48 xl:w-64"
          >
             <Search className="h-4 w-4" />
             <span className="font-medium truncate">Search... (Ctrl+K)</span>
          </button>
          <button
             onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
             className="lg:hidden p-2 text-blue-900 hover:bg-white/20 rounded-full"
          >
             <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef as any}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-blue-900 hover:bg-white/20 rounded-full transition-colors focus:outline-none"
            >
              <Bell className="h-6 w-6" />
              {totalNotifications > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white dark:ring-gray-900">
                  {totalNotifications}
                </span>
              )}
            </button>
            {/* Dropdown */}
             {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                   <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                   </div>
                   
                   {totalNotifications === 0 ? (
                     <div className="py-8 text-center text-gray-500">
                        <p className="text-sm">No new notifications</p>
                     </div>
                   ) : (
                     <div className="flex flex-col max-h-96 overflow-y-auto">
                        {termAlert.active && !dismissedAtt && (
                          <Link
                            href="/teacher/attendance"
                            onClick={handleAttClick}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-4 w-4" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">End of Term Action Required</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Term is <span className="font-semibold text-amber-700">{termAlert.progress}%</span> complete. Please ensure you enter students' total attendances.
                                </p>
                             </div>
                          </Link>
                        )}
                        
                        {termAlert.active && !dismissedRem && (
                          <Link
                            href="/teacher/reports"
                            onClick={handleRemClick}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                             <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-full text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-4 w-4" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">End of Term Action Required</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Term is <span className="font-semibold text-amber-700">{termAlert.progress}%</span> complete. Please enter remarks for your students.
                                </p>
                             </div>
                          </Link>
                        )}
                     </div>
                   )}
              </div>
            )}
          </div>

          <div className="h-6 w-[1px] bg-blue-900/10 mx-1 hidden sm:block"></div>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-0 sm:pl-1">
             <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-blue-900 leading-none truncate max-w-[100px]">
                   {teacher?.first_name}
                </p>
             </div>

             <button
                onClick={handleLogout}
                className="flex items-center justify-center p-1.5 sm:px-2 sm:py-1.5 text-red-700 bg-white/30 hover:bg-white/50 rounded-lg transition-colors font-semibold shadow-sm text-sm"
                title="Logout"
             >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline ml-1.5">Logout</span>
             </button>
          </div>
        </div>
      </div>
    </header>
  )
}


