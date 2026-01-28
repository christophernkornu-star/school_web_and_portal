'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Search, 
  Command, 
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
  ArrowRight
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
  shortcut?: string
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Define commands
  const groups: CommandGroup[] = [
    {
      heading: 'Navigation',
      items: [
        { icon: Home, label: 'Home Page', action: () => router.push('/') },
        { icon: School, label: 'About School', action: () => router.push('/about') },
        { icon: LayoutDashboard, label: 'Portal Dashboard', action: () => router.push('/login') },
      ]
    },
    {
      heading: 'Teacher Portal',
      items: [
        { icon: GraduationCap, label: 'Enter Scores', action: () => router.push('/teacher/enter-scores') },
        { icon: BookOpen, label: 'Attendance', action: () => router.push('/teacher/attendance') },
        { icon: FileText, label: 'Assessments', action: () => router.push('/teacher/assessments') },
        { icon: User, label: 'Students', action: () => router.push('/teacher/students') },
      ]
    },
    {
      heading: 'System',
      items: [
        { 
          icon: (() => {
             // Quick theme check hack or just generic icon
             return Moon 
          })(), 
          label: 'Toggle Theme', 
          action: () => {
             const isDark = document.documentElement.classList.toggle('dark')
             localStorage.theme = isDark ? 'dark' : 'light'
          }
        },
        { 
            icon: LogOut, 
            label: 'Logout', 
            action: async () => {
                await signOut()
                router.push('/login')
            } 
        },
      ]
    }
  ]

  // Filter items
  const filteredGroups = groups.map(group => ({
    ...group,
    items: group.items.filter(item => 
      item.label.toLowerCase().includes(query.toLowerCase())
    )
  })).filter(group => group.items.length > 0)

  // Flatten for keyboard navigation
  const allItems = filteredGroups.flatMap(g => g.items)

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
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[20vh] px-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200 ring-1 ring-gray-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search commands..."
            className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 text-lg"
          />
          <div className="text-xs font-medium text-gray-400 border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
            ESC
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              <p>No results found.</p>
            </div>
          ) : (
            filteredGroups.map((group, groupIndex) => (
              <div key={group.heading} className="mb-2">
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.heading}
                </div>
                {group.items.map((item, itemIndex) => {
                  // Calculate absolute index for highlighting
                  const flatIndex = allItems.indexOf(item)
                  const isSelected = flatIndex === selectedIndex

                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.action()
                        setOpen(false)
                      }}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                      className={cn(
                        "w-full flex items-center px-4 py-3 text-sm transition-colors",
                        isSelected 
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-l-2 border-blue-500" 
                          : "text-gray-700 dark:text-gray-200 border-l-2 border-transparent"
                      )}
                    >
                      <item.icon className={cn("w-4 h-4 mr-3", isSelected ? "text-blue-500" : "text-gray-400")} />
                      <span className="flex-1 text-left font-medium">{item.label}</span>
                      {isSelected && <ArrowRight className="w-4 h-4 opacity-50" />}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </div>
        
        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400 flex justify-end gap-3">
             <span>Navigate <strong className="text-gray-500 font-medium">↑↓</strong></span>
             <span>Select <strong className="text-gray-500 font-medium">↵</strong></span>
        </div>
      </div>
    </div>
  )
}
