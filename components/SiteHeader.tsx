'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Menu, 
  X, 
  GraduationCap, 
  ArrowRight, 
  ChevronRight,
  Home,
  Info,
  Users,
  Calendar,
  FileText,
  Image as ImageIcon,
  MessageSquare
} from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/about', label: 'About', icon: Info },
  { href: '/leadership', label: 'Leadership', icon: Users },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/admission', label: 'Admission', icon: FileText },
  { href: '/gallery', label: 'Gallery', icon: ImageIcon },
  { href: '/complaints', label: 'Complaints', icon: MessageSquare },
]

export default function SiteHeader() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Prevent background scrolling when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  // Close menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 w-full shadow-md select-none">
      {/* Ghana Flag Accent Stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-red-600 via-amber-400 to-emerald-600" />

      {/* Main Gold Brand Banner */}
      <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-[#003B5C] border-b-2 border-amber-600/30">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            
            {/* School Crest & Institutional Identity */}
            <Link href="/" className="flex items-center gap-2.5 sm:gap-3.5 group min-w-0">
              <div className="relative shrink-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-13 md:h-13 bg-white rounded-full p-1 sm:p-1.5 shadow-md ring-2 ring-[#003B5C]/20 group-hover:ring-[#003B5C]/40 transition-all flex items-center justify-center">
                  <Image
                    src="/school_crest.png"
                    alt="Biriwa Methodist 'C' Crest"
                    width={52}
                    height={52}
                    className="w-full h-full object-contain"
                    priority
                  />
                </div>
              </div>

              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-[#003B5C] tracking-tight leading-tight truncate">
                  Biriwa Methodist &apos;C&apos;
                </h1>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <p className="text-[10px] sm:text-xs font-bold text-[#003B5C]/85 uppercase tracking-wider truncate">
                    Basic School
                  </p>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-[#003B5C]/40" />
                  <p className="hidden sm:inline-block text-[10px] sm:text-xs font-semibold text-[#003B5C]/80 italic truncate">
                    &ldquo;Discipline with Hardwork&rdquo;
                  </p>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Links (Large Screens) */}
            <nav className="hidden xl:flex items-center space-x-1 2xl:space-x-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-3 py-1.5 rounded-xl text-xs 2xl:text-sm font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#003B5C] text-white shadow-sm'
                        : 'text-[#003B5C] hover:bg-[#003B5C]/10 hover:text-[#002a42]'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-400 rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* Right Action Area */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Portal Access Button - Strictly Desktop (xl+) */}
              <Link
                href="/login"
                className="hidden xl:inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#003B5C] hover:bg-[#002a42] text-white font-bold text-xs 2xl:text-sm rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
              >
                <GraduationCap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="font-extrabold tracking-wide">Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-300" />
              </Link>

              {/* Mobile / Tablet Menu Trigger (Only element visible on mobile right side) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="xl:hidden p-2 rounded-xl text-[#003B5C] hover:bg-[#003B5C]/10 transition-colors active:scale-95"
                aria-label="Open navigation menu"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile/Tablet Slide-over Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] xl:hidden animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-xs w-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-right duration-250">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#003B5C] text-white flex items-center justify-center font-bold shadow-xs">
                  <Image
                    src="/school_crest.png"
                    alt="Crest"
                    width={24}
                    height={24}
                    className="object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xs font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                    Biriwa Methodist &apos;C&apos;
                  </h2>
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                    Navigation Menu
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Links List */}
            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overscroll-contain">
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Public Information
              </div>

              {navLinks.map((link) => {
                const isActive = pathname === link.href
                const Icon = link.icon

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-150 ${
                      isActive
                        ? 'bg-[#003B5C] text-white shadow-sm dark:bg-blue-600'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[#003B5C] dark:hover:text-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span>{link.label}</span>
                    </div>
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                    )}
                  </Link>
                )
              })}
            </div>

            {/* Bottom Drawer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="px-1 text-center">
                <span className="inline-block text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                  &ldquo;Discipline with Hardwork&rdquo;
                </span>
              </div>

              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#003B5C] hover:bg-[#002a42] text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition active:scale-95"
              >
                <GraduationCap className="w-4 h-4 text-amber-400" />
                <span>Sign in to Academic Portal</span>
              </Link>
            </div>

          </div>
        </div>
      )}
    </header>
  )
}