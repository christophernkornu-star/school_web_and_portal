'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  FileText, 
  Settings, 
  BarChart3, 
  ClipboardList, 
  ScrollText,
  X,
  PenTool,
  Upload,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  Banknote
} from 'lucide-react'

const sidebarItems = [
  {
    group: 'Overview',
    items: [
      { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ]
  },
  {
    group: 'Class Management',
    items: [
      { href: '/teacher/attendance', label: 'Attendance', icon: UserCheck },
      { href: '/teacher/students', label: 'My Students', icon: Users },
      { href: '/teacher/promotions', label: 'Promotions', icon: TrendingUp },
      { href: '/teacher/fees/statement', label: 'Fees', icon: Banknote },
    ]
  },
  {
    group: 'Assessment & Grading',
    items: [
      { href: '/teacher/mock', label: 'Mock Exams', icon: FileSpreadsheet },
      { href: '/teacher/assessments', label: 'Online Assessments', icon: PenTool },
      { href: '/teacher/enter-scores', label: 'Enter Scores', icon: ClipboardList },
      { href: '/teacher/upload-scores', label: 'Upload Scores', icon: Upload },
      { href: '/teacher/scores', label: 'Score Sheets', icon: FileText },
    ]
  },
  {
    group: 'Reports & Performance',
    items: [
      { href: '/teacher/reports', label: 'Report Cards', icon: ScrollText },
      { href: '/teacher/performance', label: 'Analytics', icon: BarChart3 },
    ]
  },
  {
    group: 'Settings',
    items: [
      { href: '/teacher/settings', label: 'Profile & Settings', icon: Settings },
    ]
  },
]



interface TeacherSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function TeacherSidebar({ isOpen, setIsOpen }: TeacherSidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-blue-900 text-white">
            <div className="flex items-center gap-2 font-bold text-lg">
              <GraduationCap className="h-6 w-6 text-yellow-400" />
              <span>Teacher Portal</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1 hover:bg-white/10 rounded-md transition-colors"
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
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                          isActive 
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500")} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom Footer Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-800 text-xs text-center text-gray-500">
            Biriwa Methodist Support
          </div>
        </div>
      </aside>
    </>
  )
}
