'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, getCurrentUser } from '@/lib/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase-browser'
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
  Image, 
  Newspaper, 
  TrendingUp, 
  DollarSign, 
  Bell, 
  FileCheck, 
  ClipboardList, 
  Library, 
  BookMarked,
  ScrollText,
  AlertCircle,
  X,
  LogOut,
  Palette,
  ShieldCheck,
  ChevronRight
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
    group: 'Academic Structure',
    items: [
      { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
      { href: '/admin/teaching-model', label: 'Teaching Model', icon: BookMarked },
      { href: '/admin/terms', label: 'Academic Terms', icon: Calendar },
      { href: '/admin/promotions', label: 'Promotions', icon: TrendingUp },
      { href: '/admin/resources', label: 'Resources', icon: Library },
    ]
  },
  {
    group: 'Assessment & Grading',
    items: [
      { href: '/admin/assignments', label: 'Assignments', icon: FileText },
      { href: '/admin/results', label: 'Terminal Results', icon: BarChart3 },
      { href: '/admin/reports', label: 'Report Broadsheets', icon: ScrollText },
    ]
  },
  {
    group: 'Communication',
    items: [
      { href: '/admin/announcements', label: 'Announcements', icon: Bell },
      { href: '/admin/news', label: 'News & Updates', icon: Newspaper },
      { href: '/admin/events', label: 'School Calendar', icon: Calendar },
      { href: '/admin/gallery', label: 'Media Gallery', icon: Image },
      { href: '/admin/complaints', label: 'Helpdesk & Complaints', icon: AlertCircle },
    ]
  },
  {
    group: 'System Administration',
    items: [
      { href: '/admin/finance', label: 'Financial Records', icon: DollarSign },
      { href: '/admin/settings', label: 'System Settings', icon: Settings },
      { href: '/admin/audit-logs', label: 'System Audit Logs', icon: ScrollText },
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
  const [adminName, setAdminName] = useState<string>('Administrator')
  const [adminInitials, setAdminInitials] = useState<string>('AD')

  useEffect(() => {
    async function loadAdminProfile() {
      try {
        const user = await getCurrentUser()
        if (!user) return

        const supabase = getSupabaseBrowserClient()
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle()

        const fullName = profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]
        if (fullName) {
          setAdminName(fullName)
          const parts = fullName.trim().split(/\s+/)
          if (parts.length >= 2) {
            setAdminInitials(`${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase())
          } else if (parts[0]) {
            setAdminInitials(parts[0].slice(0, 2).toUpperCase())
          }
        }
      } catch (err) {
        console.error('Failed to load admin profile:', err)
      }
    }
    loadAdminProfile()
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push('/login?portal=admin')
  }

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
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-[#003B5C] text-white flex items-center justify-center font-bold shadow-sm ring-1 ring-white/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-black text-slate-900 dark:text-white tracking-tight leading-snug whitespace-nowrap">
                Biriwa Methodist &apos;C&apos;
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                Admin Management Portal
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
              {/* Category Group Header with Indicator Dot & Hairline Divider */}
              <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-1 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  {group.group}
                </span>
                <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800/80" />
              </div>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive =
                    item.href === '/admin/dashboard'
                      ? pathname === '/admin/dashboard'
                      : pathname === item.href || pathname.startsWith(`${item.href}/`)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "relative flex items-center justify-between px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 group",
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

        {/* Anchored Bottom Identity & Logout Card */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="p-2 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#003B5C]/10 dark:bg-blue-500/20 text-[#003B5C] dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                {adminInitials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  {adminName}
                </p>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block truncate">
                  Administrator
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