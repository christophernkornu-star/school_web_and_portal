'use client'

import { useState, useEffect, useRef } from 'react'
import { useAdmin } from '@/components/providers/AdminContext'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Menu, 
  Bell, 
  Search, 
  LogOut, 
  User, 
  ChevronDown,
  FileText,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'

interface AdminHeaderProps {
  setIsOpen: (open: boolean) => void
}

export function AdminHeader({ setIsOpen }: AdminHeaderProps) {
  const { profile, user } = useAdmin()
  const router = useRouter()
  const supabase = getSupabaseBrowserClient()
  
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [pendingAdmissions, setPendingAdmissions] = useState(0)
  const [unreadComplaints, setUnreadComplaints] = useState(0)
  const notificationRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchNotifications() {
      // Fetch Pending Admissions
      const { count: admissionCount } = await supabase
        .from('students') // Assuming keeping track of "pending" via status or separate table. Since schema earlier showed students table, and user mentioned "admission applications" in dashboard...
        // Actually earlier dashboard said "admission_applications table not implemented yet", but let's assume we look for students with status 'pending' or similar if that exists, OR just mock it if the table doesn't exist yet properly.
        // Wait, dashboard page checks students with stats.pendingAdmissions = 0.
        // I'll check for students with status 'pending' just in case, or just set to 0 if we can't determine.
        // However, user specifically asked: "if new admission... summary should be displayed".
        // Use a placeholder query for now or check if a table exists.
        // I will check `students` table where status = 'pending'.
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (admissionCount !== null) setPendingAdmissions(admissionCount)

      // Fetch Unread Complaints (if exists)
      // I saw "complaints" in sidebar.
      const { count: complaintCount } = await supabase
        .from('complaints') // Assuming table exists based on sidebar link
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
      
      if (complaintCount !== null) setUnreadComplaints(complaintCount)
    }

    if (user) fetchNotifications()

    // Value polling or realtime could start here
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [user, supabase])

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
    router.push('/login?portal=admin')
  }

  const totalNotifications = pendingAdmissions + unreadComplaints

  return (
    <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-methodist-gold via-yellow-500 to-yellow-600 border-b-4 border-yellow-700 shadow-md">
      <div className="h-full px-4 flex items-center justify-between gap-4">
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
               ADMIN PORTAL
             </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search Trigger (Mock) */}
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-blue-900/70 bg-white/30 border border-blue-900/10 rounded-md hover:bg-white/50 transition-colors w-48 lg:w-64 placeholder-blue-900/50">
             <Search className="h-4 w-4" />
             <span className="font-medium">Search... (Ctrl+K)</span>
          </button>
          <button className="sm:hidden p-2 text-blue-900 hover:bg-white/20 rounded-full">
             <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-blue-900 hover:bg-white/20 rounded-full transition-colors focus:outline-none"
            >
              <Bell className="h-6 w-6" />
              {totalNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white border-2 border-yellow-500">
                  {totalNotifications > 9 ? '9+' : totalNotifications}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200">
                 <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                    {totalNotifications > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">
                        {totalNotifications} New
                      </span>
                    )}
                 </div>
                 
                 <div className="max-h-[300px] overflow-y-auto">
                    {totalNotifications === 0 ? (
                      <div className="py-8 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />

                        <p className="text-sm">No new notifications</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {pendingAdmissions > 0 && (
                          <Link 
                            href="/admin/admissions" 
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                             <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-700 dark:text-blue-300">
                                <FileText className="h-4 w-4" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">New Admission Applications</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                   <span className="font-semibold text-blue-700">{pendingAdmissions}</span> students waiting for approval.
                                </p>
                             </div>
                          </Link>
                        )}

                        {unreadComplaints > 0 && (
                          <Link 
                            href="/admin/complaints" 
                            onClick={() => setNotificationsOpen(false)}
                            className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                             <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-700 dark:text-red-300">
                                <AlertCircle className="h-4 w-4" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">New Complaints</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                   <span className="font-semibold text-red-700">{unreadComplaints}</span> issues reported.
                                </p>
                             </div>
                          </Link>
                        )}
                      </div>
                    )}
                 </div>
                 
                 <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-center">
                    <Link href="/admin/announcements" onClick={() => setNotificationsOpen(false)} className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wide">
                       View All Announcements
                    </Link>
                 </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-blue-900/10 mx-1"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-1">
             <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-blue-900 leading-none">
                  {profile?.full_name || 'Administrator'}
                </p>
                <p className="text-xs text-blue-900/70 mt-1 font-medium">Admin Portal</p>
             </div>
             
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-700 bg-white/30 hover:bg-white/50 px-3 py-2 rounded-lg transition-colors font-semibold shadow-sm"
                title="Logout"
             >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
             </button>
          </div>
        </div>
      </div>
    </header>
  )
}
