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
      { href: '/teacher/upload-scores/class', label: 'Class Assessment', icon: ClipboardList },
      { href: '/teacher/manage-scores', label: 'Manage Scores', icon: FileText },
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
          "fixed inset-0 z-[105] bg-black/50 lg:hidden transition-opacity",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[110] h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-white/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-gray-800 transition-transform duration-300 ease-in-out lg:translate-x-0 overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Navigation Items */}
          <div className="flex-1 py-4 px-3 space-y-6">
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
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group",
                          isActive 
                            ? "bg-methodist-blue/10 text-methodist-blue dark:bg-methodist-blue/20 dark:text-blue-300 font-semibold" 
                            : "text-gray-700 dark:text-gray-300 hover:bg-methodist-blue hover:text-white dark:hover:bg-methodist-gold dark:hover:text-black"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4", isActive ? "text-methodist-blue dark:text-blue-300" : "text-gray-500 group-hover:text-white dark:group-hover:text-black")} />
                        {item.label}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          
          {/* Bottom Footer Area */}
        </div>
      </aside>
    </>
  )
}
