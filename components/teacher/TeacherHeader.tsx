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
               TEACHER PORTAL
             </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* Search Trigger (Mock) */}
          <button 
             onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
             className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-sm text-blue-900/70 bg-white/30 border border-blue-900/10 rounded-md hover:bg-white/50 transition-colors w-48 lg:w-64 placeholder-blue-900/50"
          >
             <Search className="h-4 w-4" />
             <span className="font-medium">Search... (Ctrl+K)</span>
          </button>
          <button 
             onClick={() => document.dispatchEvent(new CustomEvent('open-command-palette'))}
             className="sm:hidden p-2 text-blue-900 hover:bg-white/20 rounded-full"
          >
             <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 text-blue-900 hover:bg-white/20 rounded-full transition-colors focus:outline-none"
            >
              <Bell className="h-6 w-6" />
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

          <div className="h-8 w-[1px] bg-blue-900/10 mx-1"></div>

          {/* User Profile */}
          <div className="flex items-center gap-3 pl-1">
             <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-blue-900 leading-none">
                  {teacher?.first_name} {teacher?.last_name || 'Teacher'}
                </p>
                <p className="text-xs text-blue-900/70 mt-1 font-medium truncate max-w-[150px]">
                  {teacher?.teacher_id || 'Staff'}
                </p>
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
