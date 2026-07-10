'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Building2, 
  BookOpen, 
  Calendar, 
  FileText, 
  Settings, 
  BarChart3, 
  MessageSquare, 
  Image, 
  Newspaper, 
  TrendingUp, 
  DollarSign, 
  Bell, 
  FileCheck, 
  ClipboardList, 
  Library, 
  Award,
  BookMarked,
  ScrollText,
  AlertCircle,
  X,
  LogOut,
  Palette,
  History
} from 'lucide-react'

const sidebarItems = [
  {
    group: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    group: 'Management',
        items: [
      { href: '/admin/students', label: 'Students', icon: Users },
      { href: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
      { href: '/admin/sections', label: 'Sections', icon: Palette },
      { href: '/admin/classes', label: 'Classes', icon: Building2 },
      { href: '/admin/enrollments', label: 'Enrollments', icon: ClipboardList },
      { href: '/admin/admissions', label: 'Admissions', icon: FileCheck },
    ]
  },
  {
    group: 'Academic',
    items: [
      { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { href: '/admin/teaching-model', label: 'Teaching Model', icon: BookMarked },
      { href: '/admin/terms', label: 'Academic Terms', icon: Calendar },
      { href: '/admin/promotions', label: 'Promotions', icon: TrendingUp },
      { href: '/admin/resources', label: 'Resources', icon: Library },
    ]
  },
  {
    group: 'Assessment',
    items: [
      { href: '/admin/assignments', label: 'Assignments', icon: FileText },
      { href: '/admin/results', label: 'Results', icon: BarChart3 },
      { href: '/admin/reports', label: 'Report Cards', icon: ScrollText },
    ]
  },
  {
    group: 'Communication',
    items: [
      { href: '/admin/announcements', label: 'Announcements', icon: Bell },
      { href: '/admin/news', label: 'News & Updates', icon: Newspaper },
      { href: '/admin/events', label: 'Events', icon: Calendar },
      { href: '/admin/gallery', label: 'Gallery', icon: Image },
      { href: '/admin/complaints', label: 'Complaints', icon: AlertCircle },
    ]
  },
  {
    group: 'Administration',
    items: [
      { href: '/admin/finance', label: 'Finance', icon: DollarSign },
      { href: '/admin/settings', label: 'Settings', icon: Settings },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ]
  },
]

interface AdminSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=admin')
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[105] bg-black/50 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[110] h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-gray-900 transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Navigation Items */}
          <div className="flex-1 py-6 px-3 space-y-6">
            {sidebarItems.map((group) => (
              <div key={group.group}>
                <h3 className="flex items-center gap-2 px-3 mb-2 text-xs font-bold text-white uppercase tracking-wider border-l-4 border-methodist-gold bg-methodist-blue py-1.5 rounded-r-md">
                   {group.group}
                </h3>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors group rounded-md",
                            isActive 
                              ? "bg-methodist-gold text-methodist-blue dark:bg-methodist-gold dark:text-methodist-blue font-bold rounded-lg" 
                              : "text-gray-700 dark:text-gray-300 hover:bg-methodist-blue hover:text-white dark:hover:bg-methodist-gold dark:hover:text-black"
                          )}
                        >
                          <item.icon className={cn("h-4 w-4", isActive ? "text-methodist-blue dark:text-methodist-blue font-bold" : "text-gray-500 group-hover:text-white dark:group-hover:text-black")} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Bottom Footer Area */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 transition-colors rounded-md group"
            >
              <LogOut className="h-4 w-4 text-red-500 group-hover:text-red-600 dark:text-red-400 dark:group-hover:text-red-300" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
