'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { useTeacher } from '@/components/providers/TeacherContext'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  Settings, 
  BarChart3, 
  ScrollText,
  X,
  PenTool,
  UserCheck,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  Banknote, 
  Palette, 
  LogOut,
  ChevronRight
} from 'lucide-react'

const sidebarItems = [
  {
    group: 'Dashboard',
    items: [
      { href: '/teacher/dashboard', label: 'Overview', icon: LayoutDashboard },
    ]
  },
  {
    group: 'Class Management',
    items: [
      { href: '/teacher/attendance', label: 'Attendance Roll', icon: UserCheck },
      { href: '/teacher/students', label: 'Class Register', icon: Users },
      { href: '/teacher/sections', label: 'Sections & Groups', icon: Palette },
      { href: '/teacher/promotions', label: 'Promotion Decisions', icon: TrendingUp },
      { href: '/teacher/fees', label: 'Fee Collection Status', icon: Banknote },
    ]
  },
  {
    group: 'Continuous Assessment',
    items: [
      { href: '/teacher/manage-scores', label: 'Manage Scores Hub', icon: FileText },
      { href: '/teacher/assessments', label: 'Online Assessments', icon: PenTool },
      { href: '/teacher/mock', label: 'Mock Examinations', icon: FileSpreadsheet },
    ]
  },
  {
    group: 'Terminal Reports',
    items: [
      { href: '/teacher/reports', label: 'Terminal Report Cards', icon: ScrollText },
      { href: '/teacher/reports/historical', label: 'Historical Records', icon: FileText },
      { href: '/teacher/performance', label: 'Analytics & Trends', icon: BarChart3 },
    ]
  },
  {
    group: 'Preferences',
    items: [
      { href: '/teacher/settings', label: 'Profile & Security', icon: Settings },
    ]
  },
]

interface TeacherSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function TeacherSidebar({ isOpen, setIsOpen }: TeacherSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { teacher } = useTeacher()

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=teacher')
  }

  const teacherInitials = teacher?.first_name && teacher?.last_name
    ? `${teacher.first_name[0]}${teacher.last_name[0]}`.toUpperCase()
    : 'T'

  return (
    <>
      {/* Mobile/Tablet Backdrop Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-[105] bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar Drawer */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-[110] h-[100dvh] w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80 shadow-2xl lg:shadow-none transition-transform duration-300 ease-in-out lg:translate-x-0 flex flex-col justify-between select-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#003B5C] text-white flex items-center justify-center font-bold shadow-sm ring-1 ring-white/20 shrink-0">
              <GraduationCap className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap">
                Biriwa Methodist &apos;C&apos;
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Teacher Academic Portal
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors lg:hidden shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 py-3 px-2.5 space-y-5 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {sidebarItems.map((group) => (
            <div key={group.group} className="space-y-1">
              {/* Category Group Header */}
              <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {group.group}
              </div>

              {/* Menu Links */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/teacher/reports'
                      ? pathname === '/teacher/reports' || (pathname.startsWith('/teacher/reports/') && !pathname.startsWith('/teacher/reports/historical'))
                      : pathname === item.href || (item.href !== '/teacher/dashboard' && pathname.startsWith(`${item.href}/`))

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "relative flex items-center justify-between px-2.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 group",
                        isActive
                          ? "bg-[#003B5C] text-white shadow-sm dark:bg-blue-600 dark:text-white font-bold"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-colors",
                            isActive
                              ? "text-amber-400"
                              : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {/* Right Element: Indicator dot for active, subtle chevron for inactive */}
                      {isActive ? (
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Anchored Bottom Identity & Sign Out Card */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="p-2 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                {teacherInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {teacher?.first_name ? `${teacher.first_name} ${teacher.last_name || ''}` : 'Teacher Account'}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block truncate">
                  ID: {teacher?.teacher_id || 'Staff'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors shrink-0"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}