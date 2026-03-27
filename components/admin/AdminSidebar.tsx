'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  X
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
    ]
  },
]

interface AdminSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
  const pathname = usePathname()

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
          "fixed top-0 left-0 z-[110] h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area removed as per request, just keeping close button for mobile if needed, or maybe just remove content */}
          <div className="h-16 flex items-center justify-end px-6 border-b border-gray-200 dark:border-gray-800 bg-blue-900 text-white lg:hidden">
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 py-4 px-3 space-y-6">
            {sidebarItems.map((group) => (
              <div key={group.group}>
                <h3 className="flex items-center gap-2 px-3 mb-2 text-xs font-bold text-blue-900 dark:text-blue-100 uppercase tracking-wider border-l-4 border-yellow-400 bg-blue-50 dark:bg-blue-900/20 py-1.5 rounded-r-md">
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
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                          isActive 
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-methodist-blue hover:text-white dark:hover:bg-methodist-gold dark:hover:text-black"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 group-hover:text-white dark:group-hover:text-black")} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {/* Bottom Footer Area (Optional) - Removed */}
        </div>
      </aside>
    </>
  )
}
