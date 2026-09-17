'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Home, 
  School, 
  LayoutDashboard, 
  GraduationCap, 
  BookOpen, 
  FileText, 
  Settings, 
  LogOut,
  Moon,
  Sun,
  User,
  ArrowRight,
  X,
  ScrollText,
  Calendar,
  CheckCircle2,
  DollarSign,
  Palette
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { signOut } from '@/lib/auth'

type CommandGroup = {
  heading: string
  items: CommandItem[]
}

type CommandItem = {
  icon: any
  label: string
  description?: string
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Toggle Command Palette listener (Ctrl+K, Cmd+K, CustomEvent, Esc)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    const openPalette = () => setOpen(true)
    
    document.addEventListener('keydown', down)
    document.addEventListener('open-command-palette', openPalette)
    
    return () => {
      document.removeEventListener('keydown', down)
      document.removeEventListener('open-command-palette', openPalette)
    }
  }, [])

  // Auto-focus and lock background scroll
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 15)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setQuery('')
      setSelectedIndex(0)
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    localStorage.theme = isDark ? 'dark' : 'light'
  }

  // All grouped command items
  const groups: CommandGroup[] = useMemo(() => [
    {
      heading: 'General Navigation',
      items: [
        { 
          icon: Home, 
          label: 'Home Page', 
          description: 'Return to public school website',
          action: () => router.push('/') 
        },
        { 
          icon: School, 
          label: 'About School', 
          description: 'Institutional history & leadership',
          action: () => router.push('/about') 
        },
        { 
          icon: LayoutDashboard, 
          label: 'Portal Login', 
          description: 'Switch account or portal',
          action: () => router.push('/login') 
        },
      ]
    },
    {
      heading: 'Teacher Workspace',
      items: [
        { 
          icon: GraduationCap, 
          label: 'Manage Scores Hub', 
          description: 'Class & exam mark continuous entry',
          action: () => router.push('/teacher/manage-scores') 
        },
        { 
          icon: BookOpen, 
          label: 'Attendance Register', 
          description: 'Daily roll call & term totals',
          action: () => router.push('/teacher/attendance') 
        },
        { 
          icon: FileText, 
          label: 'Online Assessments', 
          description: 'Quizzes, assignments & scoring',
          action: () => router.push('/teacher/assessments') 
        },
        { 
          icon: User, 
          label: 'Class Register & Students', 
          description: 'Active cohort roster and bio',
          action: () => router.push('/teacher/students') 
        },
        { 
          icon: ScrollText, 
          label: 'Terminal Report Cards', 
          description: 'Review and bulk print reports',
          action: () => router.push('/teacher/reports') 
        },
      ]
    },
    {
      heading: 'Student Portal Shortcuts',
      items: [
        { 
          icon: ScrollText, 
          label: 'My Terminal Report', 
          description: 'Exams, broadsheets and remarks',
          action: () => router.push('/student/report-card') 
        },
        { 
          icon: Calendar, 
          label: 'My Attendance Roll', 
          description: 'Presence logs and rate percentage',
          action: () => router.push('/student/attendance') 
        },
        { 
          icon: DollarSign, 
          label: 'School Fees & Receipts', 
          description: 'Billing statement and ledger',
          action: () => router.push('/student/fees') 
        },
      ]
    },
    {
      heading: 'System & Preferences',
      items: [
        { 
          icon: Moon, 
          label: 'Toggle Dark / Light Theme', 
          description: 'Switch interface contrast theme',
          action: handleToggleTheme 
        },
        { 
          icon: LogOut, 
          label: 'Sign Out of Portal', 
          description: 'Terminate active session',
          action: handleSignOut 
        },
      ]
    }
  ], [router])

  // Filter items matching user query
  const filteredGroups = useMemo(() => {
    return groups.map(group => ({
      ...group,
      items: group.items.filter(item => 
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      )
    })).filter(group => group.items.length > 0)
  }, [groups, query])

  // Flattened items for arrow navigation
  const allItems = useMemo(() => filteredGroups.flatMap(g => g.items), [filteredGroups])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, allItems.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action()
        setOpen(false)
      }
    }
  }

  if (!open) return null

  return (
    <div 
      className="fixed inset-0 z-[120] bg-slate-950/60 backdrop-blur-sm flex items-start justify-center p-3 sm:p-4 pt-12 sm:pt-[12vh] md:pt-[16vh] animate-in fade-in duration-150"
      onClick={() => setOpen(false)}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 flex flex-col animate-in zoom-in-95 duration-150 ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-2">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search portal records..."
            className="flex-1 bg-transparent outline-none text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400"
          />

          {query && (
            <button 
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <button 
            type="button"
            onClick={() => setOpen(false)}
            className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-mono font-bold transition-colors shrink-0"
          >
            <span className="hidden sm:inline">ESC</span>
            <span className="sm:hidden">Close</span>
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] sm:max-h-[380px] overflow-y-auto overscroll-contain p-2 space-y-3">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Search className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-xs sm:text-sm font-semibold">No commands found matching &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-slate-400">Try searching for attendance, scores, reports, or settings</p>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div key={group.heading} className="space-y-1">
                <div className="px-2.5 pt-1.5 pb-1 flex items-center gap-1.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {group.heading}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const flatIndex = allItems.indexOf(item)
                    const isSelected = flatIndex === selectedIndex

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => {
                          item.action()
                          setOpen(false)
                        }}
                        onMouseEnter={() => setSelectedIndex(flatIndex)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.99] gap-2.5",
                          isSelected
                            ? "bg-[#003B5C] text-white shadow-xs dark:bg-blue-600 dark:text-white"
                            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            isSelected
                              ? "bg-white/15 text-amber-300"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          )}>
                            <item.icon className="w-4 h-4" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-bold truncate leading-tight">
                              {item.label}
                            </p>
                            {item.description && (
                              <p className={cn(
                                "text-[10px] sm:text-[11px] truncate mt-0.5",
                                isSelected ? "text-blue-100 dark:text-blue-100/80" : "text-slate-400 dark:text-slate-500"
                              )}>
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <ArrowRight className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-transform",
                          isSelected ? "opacity-100 translate-x-0.5" : "opacity-0"
                        )} />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-[11px] font-medium text-slate-400 flex items-center justify-between">
          <span className="hidden sm:inline">Press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono font-bold text-slate-600 dark:text-slate-300">Esc</kbd> to dismiss</span>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <span className="hidden sm:inline">Navigate <strong className="font-mono text-slate-600 dark:text-slate-300">↑↓</strong></span>
            <span>Execute <strong className="font-mono text-slate-600 dark:text-slate-300">↵ Enter</strong></span>
          </div>
        </div>

      </div>
    </div>
  )
}