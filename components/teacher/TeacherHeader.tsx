'use client'

import { useState, useRef, useEffect } from 'react'
import { useTeacher } from '@/components/providers/TeacherContext'
import { signOut } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  Menu, 
  Bell, 
  Search, 
  LogOut, 
  User
} from 'lucide-react'

interface TeacherHeaderProps {
  setIsOpen: (open: boolean) => void
}

export function TeacherHeader({ setIsOpen }: TeacherHeaderProps) {
  const { teacher, user } = useTeacher()
  const router = useRouter()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationRef = useRef<HTMLDivElement>(null)

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

  return (
    <header className="sticky top-0 z-30 h-16 bg-gradient-to-r from-methodist-gold via-yellow-200 to-methodist-gold dark:from-yellow-900 dark:via-yellow-700 dark:to-yellow-900 shadow-sm">
      <div className="h-full px-4 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Brand/Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="lg:hidden p-2 hover:bg-white/20 dark:hover:bg-gray-800 rounded-lg text-methodist-blue dark:text-methodist-gold"
          >
            <Menu className="h-5 w-5" />
          </button>
          
          <div className="hidden md:flex flex-col">
             <span className="text-xl font-black text-blue-900 dark:text-blue-100 tracking-tight leading-none">
               Biriwa Methodist 'C'
             </span>
             <span className="text-sm font-bold text-red-700 dark:text-red-400 tracking-wide uppercase">
               Teacher Portal
             </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search Trigger (Mock) */}
          <button 
             onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
             className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400 bg-white/50 dark:bg-gray-800 border-none dark:border-gray-700 rounded-md hover:bg-white/80 dark:hover:bg-gray-700 transition-colors w-48 lg:w-64"
          >
             <Search className="h-4 w-4" />
             <span>Search... (Ctrl+K)</span>
          </button>
          <button 
             onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
             className="sm:hidden p-2 text-black dark:text-gray-400"
          >
             <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-black dark:text-gray-400 hover:bg-white/20 dark:hover:bg-gray-800 rounded-full transition-colors focus:outline-none"
            >
              <Bell className="h-5 w-5" />
            </button>
            {/* Dropdown */}
             {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-[85vw] sm:w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
                 <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                 </div>
                 <div className="py-8 text-center text-gray-500">
                    <p className="text-sm">No new notifications</p>
                 </div>
              </div>
            )}
          </div>

          <div className="h-8 w-[1px] bg-black/10 dark:bg-gray-700 mx-1"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-1">
             <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-black dark:text-gray-100 leading-none">
                  {teacher?.first_name} {teacher?.last_name || 'Teacher'}
                </p>
                <p className="text-xs text-black/70 dark:text-gray-500 mt-1 truncate max-w-[150px]">
                  {teacher?.teacher_id || 'Staff'}
                </p>
             </div>
             
             <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors"
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
